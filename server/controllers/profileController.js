const { createClient } = require("@supabase/supabase-js");
const { randomBytes } = require("crypto");
const { prisma } = require("../db");

const AVATAR_BUCKET = "avatars";
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const cleanText = (value) => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed || null;
};

async function generateReferralCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = `WRK-${randomBytes(4).toString("hex").toUpperCase()}`;
    if (!(await prisma.userProfile.findUnique({ where: { referralCode } }))) return referralCode;
  }
  throw new Error("Could not generate a referral code");
}

async function ensureProfile(user) {
  const existing = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  return prisma.userProfile.create({
    data: {
      userId: user.id,
      displayName: cleanText(user.user_metadata?.name),
      referralCode: await generateReferralCode(),
    },
  });
}

function storageClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    const error = new Error("Profile image uploads are not configured");
    error.status = 503;
    throw error;
  }
  return createClient(process.env.SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function serializeProfile(profile) {
  let avatarUrl = null;
  if (profile.avatarPath) {
    const { data, error } = await storageClient()
      .storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(profile.avatarPath, 60 * 60);
    if (error) throw error;
    avatarUrl = data.signedUrl;
  }

  return {
    id: profile.id,
    userId: profile.userId,
    displayName: profile.displayName,
    city: profile.city,
    bio: profile.bio,
    avatarUrl,
  };
}

async function getMyProfile(req, res) {
  try {
    res.json({ profile: await serializeProfile(await ensureProfile(req.user)) });
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(error.status || 500).json({ error: "profile_fetch_failed", message: error.message });
  }
}

async function updateMyProfile(req, res) {
  const requestedFields = [
    ["displayName", 80],
    ["city", 80],
    ["bio", 500],
  ];
  for (const [field, maxLength] of requestedFields) {
    const value = req.body[field];
    if (value !== undefined && (typeof value !== "string" || value.trim().length > maxLength)) {
      return res.status(400).json({ error: "invalid_profile_data", message: `${field} must be text up to ${maxLength} characters.` });
    }
  }

  const displayName = cleanText(req.body.displayName);
  const city = cleanText(req.body.city);
  const bio = cleanText(req.body.bio);

  try {
    const current = await ensureProfile(req.user);
    const profile = await prisma.userProfile.update({
      where: { id: current.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(city !== undefined && { city }),
        ...(bio !== undefined && { bio }),
      },
    });
    res.json({ profile: await serializeProfile(profile) });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(error.status || 500).json({ error: "profile_update_failed", message: error.message });
  }
}

function decodeAvatar(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { contentType: match[1], bytes: Buffer.from(match[2], "base64") };
}

async function uploadAvatar(req, res) {
  const avatar = decodeAvatar(req.body.dataUrl);
  if (!avatar || !AVATAR_TYPES.has(avatar.contentType) || avatar.bytes.length > MAX_AVATAR_BYTES) {
    return res.status(400).json({ error: "invalid_avatar", message: "Use a JPEG, PNG, GIF, or WebP image up to 5 MB." });
  }

  try {
    const current = await ensureProfile(req.user);
    const extension = avatar.contentType.split("/")[1] === "jpeg" ? "jpg" : avatar.contentType.split("/")[1];
    const avatarPath = `${req.user.id}/avatar.${extension}`;
    const storage = storageClient().storage.from(AVATAR_BUCKET);

    if (current.avatarPath && current.avatarPath !== avatarPath) {
      await storage.remove([current.avatarPath]);
    }

    const { error: uploadError } = await storage.upload(avatarPath, avatar.bytes, {
      contentType: avatar.contentType,
      upsert: true,
      cacheControl: "3600",
    });
    if (uploadError) throw uploadError;

    const profile = await prisma.userProfile.update({ where: { id: current.id }, data: { avatarPath } });
    res.json({ profile: await serializeProfile(profile) });
  } catch (error) {
    console.error("Avatar upload error:", error.message);
    res.status(error.status || 500).json({ error: "avatar_upload_failed", message: error.message });
  }
}

async function deleteAvatar(req, res) {
  try {
    const current = await ensureProfile(req.user);
    if (current.avatarPath) {
      const { error } = await storageClient().storage.from(AVATAR_BUCKET).remove([current.avatarPath]);
      if (error) throw error;
    }
    const profile = await prisma.userProfile.update({ where: { id: current.id }, data: { avatarPath: null } });
    res.json({ profile: await serializeProfile(profile) });
  } catch (error) {
    console.error("Avatar deletion error:", error.message);
    res.status(error.status || 500).json({ error: "avatar_delete_failed", message: error.message });
  }
}

module.exports = { getMyProfile, updateMyProfile, uploadAvatar, deleteAvatar };
