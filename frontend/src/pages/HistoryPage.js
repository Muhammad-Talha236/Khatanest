// pages/HistoryPage.js - Full transaction history with server-side filtering
import React, { useState, useEffect, useCallback } from 'react';
import { balanceAPI } from '../services/api';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'payment', label: 'Member Payments' },
  { key: 'self',    label: 'My Share Payments' },
];

const HistoryPage = () => {
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filter, setFilter]         = useState('all');

  // ✅ FIXED: Filter is passed to server — no more client-side filtering after pagination
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await balanceAPI.getHistory({ page, limit: 15, type: filter });
      setHistory(res.data.history);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900,
          fontSize: 26, color: 'var(--text)', margin: 0,
        }}>Transaction History</h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
          Complete record · Descriptions auto-clear after 21 days · {pagination.total} transactions
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all .15s',
            background: filter === f.key ? 'var(--accent-soft)' : 'var(--surface)',
            color     : filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
            border    : `1px solid ${filter === f.key ? 'var(--accent-glow)' : 'var(--border)'}`,
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : history.length === 0 ? (
        <EmptyState
          icon="📜"
          title="No transactions found"
          message="Transactions will appear here once you start adding expenses and payments."
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((t) => {
              const isAdminSelf  = t.isAdminSelfPayment === true;
              const isPayment    = t.type === 'payment';
              const accentColor  = isAdminSelf ? '#5B8DEF' : isPayment ? 'var(--accent)' : 'var(--red)';
              const borderColor  = isAdminSelf
                ? 'rgba(91,141,239,0.5)'
                : isPayment ? 'var(--accent)' : 'var(--red)';

              return (
                <div key={t._id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '14px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderLeft: `3px solid ${borderColor}`,
                  transition: 'transform .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>
                      {isAdminSelf ? '👤' : isPayment ? '💵' : '🧾'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 3 }}>
                        {t.title}
                      </div>
                      <div style={{
                        fontSize: 12, marginBottom: 2,
                        color: t.description?.includes('cleared') ? 'var(--yellow)' : 'var(--text-muted)',
                      }}>
                        {t.description && <span style={{ marginRight: 8 }}>{t.description}</span>}
                        {t.dividedAmong && <span>Split {t.dividedAmong.length} ways</span>}
                        {t.member && !t.dividedAmong && <span>From {t.member.name}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {t.category && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 99,
                            background: 'var(--surface-alt)', color: 'var(--text-dim)',
                            textTransform: 'capitalize',
                          }}>{t.category}</span>
                        )}
                        {t.paymentMethod && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 99,
                            background: isAdminSelf ? 'rgba(91,141,239,0.1)' : 'var(--accent-soft)',
                            color: isAdminSelf ? '#5B8DEF' : 'var(--accent)',
                            textTransform: 'capitalize',
                          }}>
                            {t.paymentMethod.replace('_', ' ')}
                          </span>
                        )}
                        {isAdminSelf && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 99,
                            background: 'rgba(91,141,239,0.1)', color: '#5B8DEF',
                          }}>My Share</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: accentColor }}>
                      {isPayment ? '+' : '-'}Rs. {t.amount?.toLocaleString()}
                    </div>
                    {t.splitAmount && t.type === 'expense' && (
                      <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 2 }}>
                        Rs. {t.splitAmount}/person
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {format(new Date(t.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            current={pagination.page}
            total={pagination.pages}
            onChange={load}
          />
        </>
      )}
    </div>
  );
};

export default HistoryPage;