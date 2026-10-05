import React from 'react';

const StatusBadge = ({ status, type = 'job', showIcon = true, size = 'sm' }) => {
  const getStatusConfig = () => {
    if (type === 'application') {
      const applicationConfig = {
        APPLIED: {
          styles: "status-applied",
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          emoji: "📝",
          label: "Applied",
          description: "Application submitted"
        },
        ACCEPTED: {
          styles: "status-accepted",
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          emoji: "✅",
          label: "Accepted",
          description: "Application accepted"
        },
        REJECTED: {
          styles: "status-rejected",
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          emoji: "❌",
          label: "Rejected",
          description: "Application rejected"
        },
        WITHDRAWN: {
          styles: "status-cancelled",
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
          ),
          emoji: "↩️",
          label: "Withdrawn",
          description: "Application withdrawn"
        },
      };
      return applicationConfig[status] || {
        styles: "status-cancelled",
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        emoji: "❓",
        label: "Unknown",
        description: "Unknown status"
      };
    }

    // Job status configuration
    const jobConfig = {
      PENDING: {
        styles: "status-pending",
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        emoji: "⏳",
        label: "Pending",
        description: "Waiting for applications"
      },
      COMMITTED: {
        styles: "status-committed",
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        emoji: "🤝",
        label: "Committed",
        description: "Worker assigned"
      },
      IN_PROGRESS: {
        styles: "status-in-progress",
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        emoji: "🔄",
        label: "In Progress",
        description: "Work in progress"
      },
      COMPLETED: {
        styles: "status-completed",
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        emoji: "🎉",
        label: "Completed",
        description: "Job finished"
      },
      CANCELLED: {
        styles: "status-cancelled",
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        emoji: "❌",
        label: "Cancelled",
        description: "Job cancelled"
      },
    };
    return jobConfig[status] || {
      styles: "status-cancelled",
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      emoji: "❓",
      label: "Unknown",
      description: "Unknown status"
    };
  };

  const config = getStatusConfig();
  const sizeClasses = {
    xs: "px-2 py-0.5 text-xs",
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <span
      className={`status-badge ${config.styles} ${sizeClasses[size]} transition-all duration-200 hover:scale-105`}
      title={config.description}
    >
      {showIcon && (
        <span className="mr-1.5 flex items-center">
          {config.icon}
        </span>
      )}
      <span className="font-medium">{config.label}</span>
    </span>
  );
};

export default StatusBadge;