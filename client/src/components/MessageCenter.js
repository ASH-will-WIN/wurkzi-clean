import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import {
  blockUser,
  createConversation,
  getConversationMessages,
  getConversations,
  markConversationAsRead,
  sendMessage,
} from "../api/messageApi";
import { connectMessageRealtime, disconnectMessageRealtime } from "../api/messageRealtime";
import { useAuth } from "../context/AuthContext";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const initials = (name) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "W";
const formatTime = (value) => value ? new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "";
const formatListTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? formatTime(value)
    : new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(date);
};
const formatDay = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat([], { month: "long", day: "numeric", year: "numeric" }).format(date);
};
const sameDay = (first, second) => new Date(first).toDateString() === new Date(second).toDateString();

function Avatar({ participant, size = "h-10 w-10" }) {
  if (participant?.avatarUrl) return <img className={`${size} shrink-0 rounded-full object-cover`} src={participant.avatarUrl} alt="" />;
  return <span aria-hidden="true" className={`${size} shrink-0 rounded-full bg-wurkzi-700 text-sm font-semibold text-white inline-flex items-center justify-center`}>{initials(participant?.displayName || "Wurkzi member")}</span>;
}

function ConversationRow({ conversation, active, onSelect }) {
  const preview = conversation.latestMessage
    ? (conversation.latestMessage.content || (conversation.latestMessage.hasImage ? "Photo" : ""))
    : "No messages yet";
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={`w-full border-b border-slate-800 px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-wurkzi-400 ${active ? "bg-slate-800" : "hover:bg-slate-900"}`}
      aria-current={active ? "page" : undefined}
    >
      <div className="flex gap-3">
        <Avatar participant={conversation.participant} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold text-white">{conversation.participant.displayName}</span>
            <span className="shrink-0 text-xs text-slate-500">{formatListTime(conversation.lastMessageAt)}</span>
          </div>
          {conversation.job && <p className="mt-0.5 truncate text-xs text-wurkzi-300">{conversation.job.title}</p>}
          <div className="mt-1 flex items-center gap-2">
            <p className={`min-w-0 flex-1 truncate text-sm ${conversation.unreadCount ? "font-medium text-slate-200" : "text-slate-400"}`}>{preview}</p>
            {conversation.unreadCount > 0 && <span aria-label={`${conversation.unreadCount} unread messages`} className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-wurkzi-500 px-1.5 text-xs font-bold text-white">{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, own, showDay }) {
  return (
    <>
      {showDay && <div className="my-5 text-center"><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">{formatDay(message.createdAt)}</span></div>}
      <div className={`mb-3 flex ${own ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[82%] sm:max-w-[70%] ${own ? "items-end" : "items-start"}`}>
          <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${own ? "rounded-br-md bg-wurkzi-600 text-white" : "rounded-bl-md bg-slate-800 text-slate-100"}`}>
            {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
            {message.imageUrl && <img src={message.imageUrl} alt="Message attachment" className={`max-h-80 w-full rounded-lg object-cover ${message.content ? "mt-2" : ""}`} />}
          </div>
          <p className={`mt-1 flex items-center gap-1 text-xs text-slate-500 ${own ? "justify-end" : ""}`}>
            {formatTime(message.createdAt)}
            {own && <span>{message.isRead ? " · Read" : " · Sent"}</span>}
          </p>
        </div>
      </div>
    </>
  );
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Unable to prepare that photo."));
  reader.readAsDataURL(file);
});

const MessageCenter = ({ initialTargetUserId, initialTargetJobId }) => {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedConversationId = useRef(location.state?.conversationId || null);
  const activeRef = useRef(null);
  const messageListRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [composerError, setComposerError] = useState("");
  const [sending, setSending] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const refreshInbox = useCallback(async () => {
    const items = await getConversations();
    setConversations(items);
    return items;
  }, []);

  const openConversation = useCallback(async (conversation) => {
    if (!conversation) return;
    activeRef.current = conversation;
    setActiveConversation(conversation);
    setMobileConversationOpen(true);
    setMessageLoading(true);
    setShowNewMessages(false);
    stickToBottomRef.current = true;
    try {
      const data = await getConversationMessages(conversation.id);
      setMessages(data.messages || []);
      setNextCursor(data.nextCursor || null);
      await markConversationAsRead(conversation.id);
      setConversations((items) => items.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item));
    } catch (error) {
      setComposerError(error.response?.data?.message || "Could not load this conversation.");
    } finally {
      setMessageLoading(false);
    }
  }, []);

  useEffect(() => {
    let live = true;
    const boot = async () => {
      setInboxLoading(true);
      try {
        let items = await refreshInbox();
        let target = items.find((item) => item.id === requestedConversationId.current);
        if (!target && initialTargetUserId) {
          const conversation = await createConversation({ participantId: initialTargetUserId, jobId: initialTargetJobId || null });
          items = await refreshInbox();
          target = items.find((item) => item.id === conversation.id);
        }
        if (live && target) await openConversation(target);
      } catch (error) {
        if (live) setComposerError(error.response?.data?.message || "Could not load messages.");
      } finally {
        if (live) setInboxLoading(false);
      }
    };
    boot();
    return () => { live = false; };
  }, [initialTargetJobId, initialTargetUserId, openConversation, refreshInbox]);

  useEffect(() => {
    const socket = connectMessageRealtime(token);
    if (!socket) return undefined;
    const onNewMessage = ({ conversationId, message }) => {
      const active = activeRef.current;
      if (active?.id === conversationId) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        if (!stickToBottomRef.current) setShowNewMessages(true);
      }
      refreshInbox().catch(() => {});
    };
    const onRead = ({ conversationId, readerId }) => {
      if (readerId !== user?.id && activeRef.current?.id === conversationId) {
        setMessages((current) => current.map((message) => message.senderId === user?.id ? { ...message, isRead: true } : message));
      }
    };
    const onBlocked = ({ userId, blockedId }) => {
      refreshInbox().catch(() => {});
      const active = activeRef.current;
      if (active && (active.participant.userId === userId || active.participant.userId === blockedId)) {
        setActiveConversation(null);
        activeRef.current = null;
        setMessages([]);
        setMobileConversationOpen(false);
      }
    };
    socket.on("message:new", onNewMessage);
    socket.on("conversation:read", onRead);
    socket.on("conversation:blocked", onBlocked);
    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("conversation:read", onRead);
      socket.off("conversation:blocked", onBlocked);
      disconnectMessageRealtime();
    };
  }, [refreshInbox, token, user?.id]);

  useEffect(() => {
    if (stickToBottomRef.current && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      setShowNewMessages(false);
    }
  }, [messages]);

  const loadOlder = async () => {
    if (!activeConversation || !nextCursor || loadingOlder) return;
    const list = messageListRef.current;
    const previousHeight = list?.scrollHeight || 0;
    setLoadingOlder(true);
    stickToBottomRef.current = false;
    try {
      const data = await getConversationMessages(activeConversation.id, nextCursor);
      setMessages((current) => [...(data.messages || []), ...current]);
      setNextCursor(data.nextCursor || null);
      requestAnimationFrame(() => {
        if (list) list.scrollTop += list.scrollHeight - previousHeight;
      });
    } catch (error) {
      setComposerError("Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const prepareAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setComposerError("Use a JPEG, PNG, GIF, or WebP photo up to 5 MB.");
      return;
    }
    setComposerError("");
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.85, maxWidthOrHeight: 1600, useWebWorker: true, fileType: file.type });
      setAttachment({ name: file.name, dataUrl: await fileToDataUrl(compressed) });
    } catch (error) {
      setComposerError("Unable to prepare that photo.");
    }
  };

  const handleSend = async () => {
    if (!activeConversation || sending || (!draft.trim() && !attachment)) return;
    setSending(true);
    setComposerError("");
    stickToBottomRef.current = true;
    try {
      const message = await sendMessage(activeConversation.id, { content: draft.trim(), imageDataUrl: attachment?.dataUrl || null });
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setDraft("");
      setAttachment(null);
      await refreshInbox();
    } catch (error) {
      setComposerError(error.response?.data?.message || "Message failed to send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleBlock = async () => {
    if (!activeConversation || blocking) return;
    setBlocking(true);
    try {
      await blockUser(activeConversation.participant.userId);
      setConversations((items) => items.filter((item) => item.id !== activeConversation.id));
      setActiveConversation(null);
      activeRef.current = null;
      setMessages([]);
      setMobileConversationOpen(false);
      setShowBlockDialog(false);
    } catch (error) {
      setComposerError(error.response?.data?.message || "Could not block this member.");
    } finally {
      setBlocking(false);
    }
  };

  const filteredConversations = conversations.filter((conversation) => {
    const haystack = `${conversation.participant.displayName} ${conversation.participant.city || ""} ${conversation.job?.title || ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const showList = !mobileConversationOpen || !activeConversation;
  const showPane = Boolean(activeConversation);

  return (
    <section className="mx-auto flex h-[calc(100dvh-5rem)] max-w-6xl overflow-hidden border border-slate-800 bg-slate-950 md:my-6 md:h-[calc(100dvh-8rem)] md:rounded-xl">
      <aside className={`${showList ? "flex" : "hidden"} w-full min-w-0 flex-col border-r border-slate-800 bg-slate-950 md:flex md:w-[22rem]`} aria-label="Conversations">
        <div className="border-b border-slate-800 p-4">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <label className="sr-only" htmlFor="message-search">Search conversations</label>
          <input id="message-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-wurkzi-400 focus:ring-1 focus:ring-wurkzi-400" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {inboxLoading ? <p className="p-5 text-sm text-slate-400">Loading conversations…</p> : filteredConversations.length ? filteredConversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} active={activeConversation?.id === conversation.id} onSelect={openConversation} />) : <div className="p-6 text-center"><p className="font-medium text-white">{query ? "No matching conversations" : "No messages yet"}</p><p className="mt-2 text-sm leading-6 text-slate-400">Start a conversation from a job or another Wurkzi action.</p></div>}
        </div>
      </aside>

      <main className={`${showPane ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-slate-900 md:flex`} aria-live="polite">
        {activeConversation && <>
          <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-3 py-3 sm:px-5">
            <button type="button" onClick={() => setMobileConversationOpen(false)} className="rounded-md p-2 text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-wurkzi-400 md:hidden" aria-label="Back to conversations">←</button>
            <Avatar participant={activeConversation.participant} />
            <div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-white">{activeConversation.participant.displayName}</h2>{activeConversation.participant.city && <p className="truncate text-xs text-slate-400">{activeConversation.participant.city}</p>}</div>
            <button type="button" onClick={() => setShowBlockDialog(true)} className="rounded-md px-2 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wurkzi-400">Block</button>
          </header>
          {activeConversation.job && <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">About this job</p><p className="truncate font-medium text-slate-200">{activeConversation.job.title}</p></div><button type="button" onClick={() => navigate(`/jobs/${activeConversation.job.id}`)} className="shrink-0 text-wurkzi-300 hover:text-wurkzi-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-wurkzi-400">View job</button></div>}
          <div ref={messageListRef} onScroll={(event) => { const node = event.currentTarget; stickToBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; if (stickToBottomRef.current) setShowNewMessages(false); }} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {nextCursor && <div className="mb-4 text-center"><button type="button" disabled={loadingOlder} onClick={loadOlder} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-wurkzi-400">{loadingOlder ? "Loading…" : "Load earlier messages"}</button></div>}
            {messageLoading ? <p className="text-center text-sm text-slate-400">Loading messages…</p> : messages.length ? messages.map((message, index) => <MessageBubble key={message.id} message={message} own={message.senderId === user?.id} showDay={index === 0 || !sameDay(messages[index - 1].createdAt, message.createdAt)} />) : <div className="pt-16 text-center"><p className="font-medium text-white">Start the conversation</p><p className="mt-1 text-sm text-slate-400">Send a message to {activeConversation.participant.displayName}.</p></div>}
            {showNewMessages && <button type="button" onClick={() => { stickToBottomRef.current = true; messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" }); setShowNewMessages(false); }} className="sticky bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-wurkzi-600 px-3 py-2 text-sm font-medium text-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white">New messages</button>}
          </div>
          <div className="border-t border-slate-800 bg-slate-950 p-3 sm:p-4">
            {attachment && <div className="mb-2 flex items-center gap-2"><img src={attachment.dataUrl} alt="Attachment preview" className="h-14 w-14 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-sm text-slate-300">{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Remove photo">×</button></div>}
            {composerError && <p className="mb-2 text-sm text-red-300" role="alert">{composerError}</p>}
            <div className="flex items-end gap-2"><label className="cursor-pointer rounded-lg p-2 text-slate-300 hover:bg-slate-800 focus-within:ring-2 focus-within:ring-wurkzi-400"><span className="sr-only">Attach a photo</span><input type="file" accept={IMAGE_TYPES.join(",")} onChange={prepareAttachment} className="sr-only" />📎</label><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); } }} maxLength={2000} rows={1} placeholder="Write a message" disabled={sending} className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-wurkzi-400 focus:ring-1 focus:ring-wurkzi-400 disabled:opacity-50" aria-label="Message" /><button type="button" onClick={handleSend} disabled={sending || (!draft.trim() && !attachment)} className="rounded-lg bg-wurkzi-600 px-3 py-2 text-sm font-semibold text-white hover:bg-wurkzi-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-wurkzi-300">{sending ? "Sending…" : "Send"}</button></div>
          </div>
        </>}
      </main>

      {!activeConversation && !inboxLoading && <div className="hidden flex-1 items-center justify-center bg-slate-900 p-8 text-center md:flex"><div><p className="text-lg font-semibold text-white">Select a conversation</p><p className="mt-2 text-sm text-slate-400">Choose a conversation to see the details and job context.</p></div></div>}

      {showBlockDialog && activeConversation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="block-title" className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"><h3 id="block-title" className="text-lg font-semibold text-white">Block {activeConversation.participant.displayName}?</h3><p className="mt-2 text-sm leading-6 text-slate-300">They will no longer be able to message you, and this conversation will be removed from your inbox.</p><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowBlockDialog(false)} disabled={blocking} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button><button type="button" onClick={handleBlock} disabled={blocking} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{blocking ? "Blocking…" : "Block member"}</button></div></div></div>}
    </section>
  );
};

export default MessageCenter;
