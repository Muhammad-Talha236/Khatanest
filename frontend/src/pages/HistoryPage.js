// pages/HistoryPage.js - Full transaction history with pagination
import React, { useState, useEffect, useCallback } from 'react';
import { balanceAPI } from '../services/api';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await balanceAPI.getHistory({ page, limit: 15 });
      let h = res.data.history;
      if (filter === 'expense') h = h.filter(t => t.type === 'expense');
      if (filter === 'payment') h = h.filter(t => t.type === 'payment');
      setHistory(h);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'expense', label: 'Expenses' },
    { key: 'payment', label: 'Payments' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>Transaction History</h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
          Complete record · Descriptions auto-clear after 21 days · {pagination.total} total transactions
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: filter === f.key ? 'var(--accent-soft)' : 'var(--surface)',
            color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
            border: `1px solid ${filter === f.key ? 'var(--accent-glow)' : 'var(--border)'}`,
            transition: 'all .15s',
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : history.length === 0 ? (
        <EmptyState icon="📜" title="No transactions found" message="Transactions will appear here once you start adding expenses and payments." />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((t, i) => (
              <div key={t._id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderLeft: `3px solid ${t.type === 'payment' ? 'var(--accent)' : 'var(--red)'}`,
                transition: 'transform .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{t.type === 'payment' ? '💵' : '🧾'}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 3 }}>{t.title}</div>
                    <div style={{
                      fontSize: 12, marginBottom: 2,
                      color: t.description?.includes('cleared') ? 'var(--yellow)' : 'var(--text-muted)',
                    }}>
                      {t.description && <span style={{ marginRight: 8 }}>{t.description}</span>}
                      {t.dividedAmong && <span>Split {t.dividedAmong.length} ways</span>}
                      {t.member && <span>From {t.member.name}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {t.category && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-alt)', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                          {t.category}
                        </span>
                      )}
                      {t.paymentMethod && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', textTransform: 'capitalize' }}>
                          {t.paymentMethod.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: t.type === 'payment' ? 'var(--accent)' : 'var(--red)' }}>
                    {t.type === 'payment' ? '+' : '-'}Rs. {t.amount?.toLocaleString()}
                  </div>
                  {t.splitAmount && t.type === 'expense' && (
                    <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 2 }}>Rs. {t.splitAmount}/person</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {format(new Date(t.date), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination current={pagination.page} total={pagination.pages} onChange={load} />
        </>
      )}
    </div>
  );
};

export default HistoryPage;
