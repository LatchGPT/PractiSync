'use client';
import { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  GraduationCap,
  LifeBuoy,
  Megaphone,
  Target,
  Settings,
  Check,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { Row, Action } from '@/packages/validation/contracts';

interface NotificationCenterProps {
  notifications?: Row[];
  onNavigate: (page: string) => void;
  onAct: (action: Action, values: Record<string, string | number>) => Promise<void>;
}

function timeAgo(dateStr?: string | number | null): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(String(dateStr));
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Just now';
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
  } catch {
    return 'Recently';
  }
}

function getNotificationVisual(type: string) {
  switch (type.toUpperCase()) {
    case 'DTR':
      return {
        icon: Clock,
        className: 'notif-icon-dtr',
        tag: 'Attendance',
      };
    case 'DOCUMENT':
      return {
        icon: FileText,
        className: 'notif-icon-document',
        tag: 'Clearance',
      };
    case 'CLASS':
      return {
        icon: GraduationCap,
        className: 'notif-icon-class',
        tag: 'Classroom',
      };
    case 'SUPPORT':
      return {
        icon: LifeBuoy,
        className: 'notif-icon-support',
        tag: 'Support SOS',
      };
    case 'ANNOUNCEMENT':
      return {
        icon: Megaphone,
        className: 'notif-icon-announcement',
        tag: 'Announcement',
      };
    case 'POLICY':
      return {
        icon: Target,
        className: 'notif-icon-policy',
        tag: 'Policy',
      };
    default:
      return {
        icon: Bell,
        className: 'notif-icon-default',
        tag: 'System',
      };
  }
}

export default function NotificationCenter({
  notifications = [],
  onNavigate,
  onAct,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.readAt).length;
  }, [notifications]);

  const displayedNotifications = useMemo(() => {
    if (tab === 'unread') {
      return notifications.filter((n) => !n.readAt);
    }
    return notifications;
  }, [notifications, tab]);

  async function handleNotificationClick(item: Row) {
    if (!item.readAt) {
      await onAct('markNotificationRead', { notificationId: item.id });
    }
    const link = String(item.linkPage || '').trim();
    if (link) {
      onNavigate(link);
    }
    setOpen(false);
  }

  async function handleMarkSingleRead(e: React.MouseEvent, item: Row) {
    e.stopPropagation();
    await onAct('markNotificationRead', { notificationId: item.id });
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    await onAct('markAllNotificationsRead', {});
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="topbar-icon topbar-bell-btn"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          title="Notifications"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="topbar-badge" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="notif-popover-content"
      >
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-left">
            <h3>Notifications</h3>
            {unreadCount > 0 ? (
              <span className="chip orange notif-chip">{unreadCount} unread</span>
            ) : (
              <span className="chip green notif-chip">All caught up</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-mark-all-btn"
              onClick={handleMarkAllRead}
              title="Mark all notifications as read"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="notif-tabs">
          <button
            type="button"
            className={`notif-tab ${tab === 'all' ? 'active' : ''}`}
            onClick={() => setTab('all')}
          >
            All
            <span className="notif-tab-count">{notifications.length}</span>
          </button>
          <button
            type="button"
            className={`notif-tab ${tab === 'unread' ? 'active' : ''}`}
            onClick={() => setTab('unread')}
          >
            Unread
            <span className="notif-tab-count">{unreadCount}</span>
          </button>
        </div>

        {/* Notification Items List */}
        <div className="notif-list-container">
          {displayedNotifications.length > 0 ? (
            displayedNotifications.map((n) => {
              const isUnread = !n.readAt;
              const visual = getNotificationVisual(String(n.type || ''));
              const Icon = visual.icon;

              return (
                <div
                  key={n.id}
                  className={`notif-item ${isUnread ? 'unread' : 'read'}`}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNotificationClick(n);
                    }
                  }}
                >
                  <div className="notif-item-left">
                    <span className={`notif-type-icon ${visual.className}`}>
                      <Icon size={16} />
                    </span>
                  </div>

                  <div className="notif-item-center">
                    <div className="notif-item-top">
                      <strong className="notif-title">{String(n.title || '')}</strong>
                      <span className="notif-time">{timeAgo(n.createdAt)}</span>
                    </div>

                    <p className="notif-message">{String(n.message || '')}</p>

                    <div className="notif-item-meta">
                      <span className="notif-tag">{visual.tag}</span>
                      {n.linkPage && (
                        <span className="notif-link-hint">
                          Go to {String(n.linkPage).toLowerCase()} →
                        </span>
                      )}
                    </div>
                  </div>

                  {isUnread && (
                    <div className="notif-item-right">
                      <span className="notif-unread-dot" title="Unread" />
                      <button
                        type="button"
                        className="notif-mark-single-btn"
                        onClick={(e) => handleMarkSingleRead(e, n)}
                        title="Mark as read"
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="notif-empty-state">
              <div className="notif-empty-icon">
                {tab === 'unread' ? <CheckCircle2 size={32} /> : <Bell size={32} />}
              </div>
              <h4>{tab === 'unread' ? 'All caught up!' : 'No notifications yet'}</h4>
              <p>
                {tab === 'unread'
                  ? "You have reviewed all updates. There are no unread alerts right now."
                  : 'Important practicum milestones and coordinator updates will appear here.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="notif-footer">
          <button
            type="button"
            className="notif-settings-btn"
            onClick={() => {
              onNavigate('settings');
              setOpen(false);
            }}
          >
            <Settings size={13} />
            <span>Notification preferences</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
