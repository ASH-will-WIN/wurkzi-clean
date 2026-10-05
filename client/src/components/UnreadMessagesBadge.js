import React, { useState, useEffect } from 'react';
import { getUnreadCount } from '../api/messageApi';
import { connectMessageRealtime, disconnectMessageRealtime } from '../api/messageRealtime';
import { useAuth } from '../context/AuthContext';

const UnreadMessagesBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { token } = useAuth();

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await getUnreadCount();
        setUnreadCount(data.count || 0);
      } catch (error) {
        console.error('Failed to fetch unread messages:', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const socket = connectMessageRealtime(token);
    socket?.on('message:new', fetchUnreadCount);
    socket?.on('conversation:read', fetchUnreadCount);
    socket?.on('conversation:blocked', fetchUnreadCount);
    return () => {
      socket?.off('message:new', fetchUnreadCount);
      socket?.off('conversation:read', fetchUnreadCount);
      socket?.off('conversation:blocked', fetchUnreadCount);
      disconnectMessageRealtime();
    };
  }, [token]);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
};

export default UnreadMessagesBadge;
