const { createClient } = require("@supabase/supabase-js");
const { randomBytes } = require("crypto");
const { prisma } = require("../db");

const MESSAGE_IMAGE_BUCKET = "message-images";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MESSAGE_LIMIT = 2000;
const PAGE_SIZE = 40;

function messageStorage() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    const error = new Error("Message image uploads are not configured");
    error.status = 503;
    throw error;
  }
  return createClient(process.env.SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage.from(MESSAGE_IMAGE_BUCKET);
}

function canonicalParticipants(firstId, secondId) {
  if (!firstId || !secondId || firstId === secondId) {
    const error = new Error("Choose another Wurkzi member");
    error.status = 400;
    throw error;
  }
  return [firstId, secondId].sort();
}

function conversationKey(participantOneId, participantTwoId, jobId) {
  return jobId
    ? `job:${jobId}:${participantOneId}:${participantTwoId}`
    : `direct:${participantOneId}:${participantTwoId}`;
}

function decodeImage(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { contentType: match[1], bytes: Buffer.from(match[2], "base64") };
}

async function signedUrl(bucket, path) {
  if (!path) return null;
  const { data, error } = await bucket.createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

async function getBlockedIds(userId) {
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId));
}

async function assertNotBlocked(userId, otherUserId) {
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
  });
  if (block) {
    const error = new Error("Messaging is unavailable for this member");
    error.status = 403;
    throw error;
  }
}

async function assertJobAuthorization(jobId, participantOneId, participantTwoId) {
  if (!jobId) return null;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { applications: { select: { workerId: true, status: true } } },
  });
  if (!job) {
    const error = new Error("Job not found");
    error.status = 404;
    throw error;
  }

  const isAuthorized = (userId) => {
    if (job.hirerId === userId) return true;
    const application = job.applications.find((item) => item.workerId === userId);
    return Boolean(application && application.status !== "WITHDRAWN");
  };

  if (job.status === "PENDING") {
    if (job.hirerId !== participantOneId && job.hirerId !== participantTwoId) {
      const error = new Error("You can only message the hirer about this job");
      error.status = 403;
      throw error;
    }
  } else if (!isAuthorized(participantOneId) || !isAuthorized(participantTwoId)) {
    const error = new Error("Not authorized to message about this job");
    error.status = 403;
    throw error;
  }
  return job;
}

function getOtherParticipant(conversation, userId) {
  return conversation.participantOneId === userId
    ? conversation.participantTwoId
    : conversation.participantOneId;
}

async function getConversationForMember(conversationId, userId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { job: { select: { id: true, title: true, status: true } } },
  });
  if (!conversation || (conversation.participantOneId !== userId && conversation.participantTwoId !== userId)) {
    const error = new Error("Conversation not found");
    error.status = 404;
    throw error;
  }
  const otherUserId = getOtherParticipant(conversation, userId);
  await assertNotBlocked(userId, otherUserId);
  return { conversation, otherUserId };
}

async function participantSummaries(userIds) {
  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: [...new Set(userIds)] } },
    select: { userId: true, displayName: true, city: true, avatarPath: true },
  });
  const byUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const storage = profiles.some((profile) => profile.avatarPath) && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    }).storage.from("avatars")
    : null;

  return new Map(await Promise.all(userIds.map(async (userId) => {
    const profile = byUserId.get(userId);
    let avatarUrl = null;
    if (profile?.avatarPath && storage) {
      try {
        avatarUrl = await signedUrl(storage, profile.avatarPath);
      } catch (error) {
        console.warn("Could not sign conversation avatar:", error.message);
      }
    }
    return [userId, {
      userId,
      displayName: profile?.displayName || "Wurkzi member",
      city: profile?.city || null,
      avatarUrl,
    }];
  })));
}

async function serializeMessage(message) {
  let imageUrl = null;
  if (message.imagePath) imageUrl = await signedUrl(messageStorage(), message.imagePath);
  return { ...message, imageUrl, imagePath: undefined };
}

async function createConversation(req, res) {
  try {
    const participantId = req.body.participantId || req.body.otherUserId;
    const jobId = req.body.jobId || null;
    const [participantOneId, participantTwoId] = canonicalParticipants(req.user.id, participantId);
    const participant = await prisma.userProfile.findUnique({ where: { userId: participantId }, select: { userId: true } });
    if (!participant) {
      const error = new Error("Wurkzi member not found");
      error.status = 404;
      throw error;
    }
    await assertNotBlocked(req.user.id, participantId);
    await assertJobAuthorization(jobId, participantOneId, participantTwoId);

    const key = conversationKey(participantOneId, participantTwoId, jobId);
    const conversation = await prisma.conversation.upsert({
      where: { conversationKey: key },
      create: { conversationKey: key, participantOneId, participantTwoId, jobId },
      update: {},
      include: { job: { select: { id: true, title: true, status: true } } },
    });
    res.status(201).json({ conversation });
  } catch (error) {
    console.error("Create conversation error:", error.message);
    res.status(error.status || 500).json({ error: "conversation_create_failed", message: error.message });
  }
}

async function getConversations(req, res) {
  try {
    const blockedIds = await getBlockedIds(req.user.id);
    const conversations = (await prisma.conversation.findMany({
      where: { OR: [{ participantOneId: req.user.id }, { participantTwoId: req.user.id }] },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: 100,
      include: {
        job: { select: { id: true, title: true, status: true } },
        messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
        _count: { select: { messages: { where: { senderId: { not: req.user.id }, isRead: false } } } },
      },
    })).filter((conversation) => !blockedIds.has(getOtherParticipant(conversation, req.user.id)));

    const people = await participantSummaries(conversations.map((conversation) => getOtherParticipant(conversation, req.user.id)));
    const serialized = await Promise.all(conversations.map(async (conversation) => {
      const latest = conversation.messages[0];
      return {
        id: conversation.id,
        participant: people.get(getOtherParticipant(conversation, req.user.id)),
        job: conversation.job,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation._count.messages,
        latestMessage: latest ? {
          content: latest.content,
          hasImage: Boolean(latest.imagePath),
          createdAt: latest.createdAt,
          senderId: latest.senderId,
        } : null,
      };
    }));
    res.json({ conversations: serialized });
  } catch (error) {
    console.error("Get conversations error:", error.message);
    res.status(error.status || 500).json({ error: "conversation_list_failed", message: error.message });
  }
}

async function getConversationMessages(req, res) {
  try {
    const { conversation } = await getConversationForMember(req.params.conversationId, req.user.id);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const rows = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const hasMore = rows.length > PAGE_SIZE;
    const page = rows.slice(0, PAGE_SIZE);
    const messages = await Promise.all(page.reverse().map(serializeMessage));
    res.json({ conversation, messages, nextCursor: hasMore ? page[page.length - 1]?.id : null });
  } catch (error) {
    console.error("Get conversation messages error:", error.message);
    res.status(error.status || 500).json({ error: "message_list_failed", message: error.message });
  }
}

async function sendMessage(req, res) {
  let uploadedPath = null;
  try {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (content.length > MESSAGE_LIMIT) {
      return res.status(400).json({ error: "message_too_long", message: `Messages can be up to ${MESSAGE_LIMIT} characters.` });
    }
    const image = req.body.imageDataUrl ? decodeImage(req.body.imageDataUrl) : null;
    if (req.body.imageDataUrl && (!image || !IMAGE_TYPES.has(image.contentType) || image.bytes.length > MAX_IMAGE_BYTES)) {
      return res.status(400).json({ error: "invalid_image", message: "Use a JPEG, PNG, GIF, or WebP image up to 5 MB." });
    }
    if (!content && !image) {
      return res.status(400).json({ error: "message_required", message: "Write a message or attach a photo." });
    }

    const { conversation, otherUserId } = await getConversationForMember(req.params.conversationId, req.user.id);
    await assertJobAuthorization(conversation.jobId, conversation.participantOneId, conversation.participantTwoId);

    if (image) {
      const extension = image.contentType.split("/")[1] === "jpeg" ? "jpg" : image.contentType.split("/")[1];
      uploadedPath = `${conversation.id}/${randomBytes(16).toString("hex")}.${extension}`;
      const { error: uploadError } = await messageStorage().upload(uploadedPath, image.bytes, {
        contentType: image.contentType,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { content, imagePath: uploadedPath, senderId: req.user.id, conversationId: conversation.id },
      });
      await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: created.createdAt } });
      return created;
    });
    const serialized = await serializeMessage(message);
    req.app.get("io")?.to(req.user.id).to(otherUserId).emit("message:new", { conversationId: conversation.id, message: serialized });
    res.status(201).json({ message: serialized });
  } catch (error) {
    if (uploadedPath) {
      try { await messageStorage().remove([uploadedPath]); } catch (cleanupError) { console.error("Message image cleanup error:", cleanupError.message); }
    }
    console.error("Send message error:", error.message);
    res.status(error.status || 500).json({ error: "message_send_failed", message: error.message });
  }
}

async function markConversationAsRead(req, res) {
  try {
    const { conversation } = await getConversationForMember(req.params.conversationId, req.user.id);
    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderId: { not: req.user.id }, isRead: false },
      data: { isRead: true },
    });
    const otherUserId = getOtherParticipant(conversation, req.user.id);
    req.app.get("io")?.to(otherUserId).emit("conversation:read", { conversationId: conversation.id, readerId: req.user.id });
    res.json({ ok: true });
  } catch (error) {
    console.error("Mark conversation read error:", error.message);
    res.status(error.status || 500).json({ error: "conversation_read_failed", message: error.message });
  }
}

async function getUnreadCount(req, res) {
  try {
    const blockedIds = await getBlockedIds(req.user.id);
    const conversations = (await prisma.conversation.findMany({
      where: { OR: [{ participantOneId: req.user.id }, { participantTwoId: req.user.id }] },
      select: { id: true, participantOneId: true, participantTwoId: true },
    })).filter((conversation) => !blockedIds.has(getOtherParticipant(conversation, req.user.id)));
    const count = await prisma.message.count({
      where: { conversationId: { in: conversations.map((conversation) => conversation.id) }, senderId: { not: req.user.id }, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    console.error("Unread count error:", error.message);
    res.status(500).json({ error: "unread_count_failed", message: error.message });
  }
}

module.exports = { createConversation, getConversations, getConversationMessages, sendMessage, markConversationAsRead, getUnreadCount };
