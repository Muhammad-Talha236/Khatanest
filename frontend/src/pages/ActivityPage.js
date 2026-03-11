// pages/ActivityPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { activityAPI } from '../services/api';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Avatar } from '../components/Layout';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  expense_added    : { icon: '🧾', color: '#FF5C6A', label: 'Added expense' },
  expense_updated  : { icon: '✏️', color: '#FFB547', label: 'Updated expense' },
  expense_deleted  : { icon: '🗑️', color: '#9CA3AF', label: 'Deleted expense' },
  payment_recorded : { icon: '💵', color: '#2ECC9A', label: 'Recorded payment' },
  payment_reversed : { icon: '↩️', color: '#FFB547', label: 'Reversed payment' },
  member_joined    : { icon: '👋', color: '#5B8DEF', label: 'Joined group' },
  member_removed   : { icon: '👤', color: '#9CA3AF', label: 'Removed member' },
  member_promoted  : { icon: '⭐', color: '#FFB547', label: 'Role changed' },
  balance_reset    : { icon: '🔄', color: '#E879F9', label: 'Monthly reset' },
  group_updated    : { icon: '⚙️', color: '#5B8DEF', label: 'Updated group' },
  budget_alert     : { icon: '⚠️', color: '#FFB547', label: 'Budget alert' },
  recurring_created: { icon: '🔁', color: '#34D399', label: 'Recurring expense' },
  comment_added    : { icon: '💬', color: '#60A5FA', label: 'Added comment' },
};

const buildMessage = (activity) => {
  const { type, meta, actor } = activity;
  const name = actor?.name || 'Someone';
  switch (type) {
    case 'expense_added'    : return `${name} added "${meta?.title}" — Rs. ${meta?.amount?.toLocaleString()}`;
    case 'expense_updated'  : return `${name} updated "${meta?.title}"`;
    case 'expense_deleted'  : return `${name} deleted "${meta?.title}" — Rs. ${meta?.amount?.toLocaleString()}`;
    case 'payment_recorded' : return meta?.extra?.isAdminSelfPayment ? `${name} paid their own share — Rs. ${meta?.amount?.toLocaleString()}` : `${name} recorded Rs. ${meta?.amount?.toLocaleString()} from ${meta?.targetName}`;
    case 'payment_reversed' : return `${name} reversed a payment — Rs. ${meta?.amount?.toLocaleString()}`;
    case 'member_joined'    : return `${meta?.targetName || name} joined the group`;
    case 'member_removed'   : return `${name} removed ${meta?.targetName} from the group`;
    case 'member_promoted'  : return `${name} changed ${meta?.targetName}'s role to ${meta?.extra?.role}`;
    case 'balance_reset'    : return `${name} reset all balances for ${meta?.targetName}`;
    case 'group_updated'    : return `${name} updated the group name`;
    case 'budget_alert'     : return `⚠️ ${meta?.category} budget is ${meta?.extra?.pct}% used (Rs. ${meta?.amount?.toLocaleString()} / Rs. ${meta?.extra?.limit?.toLocaleString()})`;
    case 'recurring_created': return `Auto-created recurring: "${meta?.title}" — Rs. ${meta?.amount?.toLocaleString()}`;
    case 'comment_added'    : return `${name} commented on "${meta?.targetName}"`;
    default                 : return `${name} performed an action`;
  }
};

const ActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [unseen, setUnseen]         = useState(0);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await activityAPI.getActivity({ page, limit: 20 });
      setActivities(res.data.activities);
      setPagination(res.data.pagination);
      setUnseen(res.data.unseen);
    } catch {
      toast.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkSeen = async () => {
    try {
      await activityAPI.markSeen();
      setUnseen(0);
      toast.success('All marked as seen');
    } catch { toast.error('Failed'); }
  };

  // Group activities by date
  const grouped = activities.reduce((acc, a) => {
    const day = format(new Date(a.createdAt), 'MMMM d, yyyy');
    if (!acc[day]) acc[day] = [];
    acc[day].push(a);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>Activity Feed</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {pagination.total} events · {unseen > 0 && <span style={{ color: 'var(--accent)' }}>{unseen} new</span>}
          </p>
        </div>
        {unseen > 0 && (
          <button onClick={handleMarkSeen} style={{
            padding: '8px 18px', borderRadius: 10, border: '1px solid var(--accent-glow)',
            background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>
            ✓ Mark all seen
          </button>
        )}
      </div>

      {loading ? <Spinner /> : activities.length === 0 ? (
        <EmptyState icon="📡" title="No activity yet" message="Activity will appear here as your group uses KhataNest." />
      ) : (
        <>
          {Object.entries(grouped).map(([day, dayActivities]) => (
            <div key={day} style={{ marginBottom: 24 }}>
              {/* Day header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{day}</div>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayActivities.map((a) => {
                  const cfg    = TYPE_CONFIG[a.type] || { icon: '•', color: '#9CA3AF', label: '' };
                  const isSeen = a.seenBy?.includes?.(a._id); // simplified — backend tracks this

                  return (
                    <div key={a._id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '12px 16px', borderRadius: 12,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderLeft: `3px solid ${cfg.color}`,
                      transition: 'transform .15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      {/* Actor avatar */}
                      <Avatar name={a.actor?.name || '?'} size={36} color={a.actor?.avatarColor || cfg.color} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, lineHeight: 1.5 }}>
                          {buildMessage(a)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                            background: `${cfg.color}18`, color: cfg.color,
                          }}>{cfg.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                          </span>
                          {a.meta?.category && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                              · {a.meta.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <Pagination current={pagination.page} total={pagination.pages} onChange={load} />
        </>
      )}
    </div>
  );
};

export default ActivityPage;