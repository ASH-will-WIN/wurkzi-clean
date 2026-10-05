import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createConversation } from "../api/messageApi";
import { useAuth } from "../context/AuthContext";

const StartConversation = ({
  jobId,
  otherUserId,
  otherUserRole,
  className = "",
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartConversation = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!otherUserId || otherUserId === user.id) return;

    setLoading(true);
    try {
      const conversation = await createConversation({ participantId: otherUserId, jobId });

      // Navigate to messages page with the conversation
      navigate("/messages", {
        state: {
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      // Still navigate to messages page even if API call fails
      navigate("/messages");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    return "Send Message";
  };

  const getIcon = () => (
    <svg
      className="w-4 h-4 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9 8a9.013 9.013 0 01-5.314-1.757l-3.42 1.026a.756.756 0 01-.932-.932l1.026-3.42A9.013 9.013 0 013 12c0-4.962 4.037-9 9-9s9 4.037 9 9z"
      />
    </svg>
  );

  if (!otherUserId || otherUserId === user?.id) {
    return null;
  }

  return (
    <button
      onClick={handleStartConversation}
      disabled={loading}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wurkzi-600 hover:bg-wurkzi-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wurkzi-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      ) : (
        getIcon()
      )}
      {loading ? "Connecting..." : getButtonText()}
    </button>
  );
};

export default StartConversation;
