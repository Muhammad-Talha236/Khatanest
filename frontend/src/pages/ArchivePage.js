// pages/ArchivePage.js
import React, { useState, useEffect } from 'react';
import { groupAPI } from '../services/api';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { Avatar } from '../components/Layout';
import toast from 'react-hot-toast';

const ArchivePage = () => {
  const [archives, setArchives]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    groupAPI.getArchives()
      .then(res => setArchives(res.data.archives))
      .catch(() => toast.error('Failed to load archives'))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (archive) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await groupAPI.getArchive(archive._id);
      setSelected(res.data.archive);
    } catch { toast.error('Failed to load archive details'); }
    finally { setDetailLoading(false); }
  };

  const CAT_COLORS = { grocery: '#2ECC9A', electricity: '#FFB547', gas: '#FF5C6A', internet: '#5B8DEF', water: '#34D399', rent: '#E879F9', other: '#9CA3AF' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>Monthly Archives</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Historical snapshots saved during monthly resets</p>
      </div>

      {loading ? <Spinner /> : archives.length === 0 ? (
        <EmptyState icon="📦" title="No archives yet" message="Archives are automatically created when you do a monthly reset. Your data is preserved for future reference." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {archives.map((a) => (
            <div key={a._id} onClick={() => openDetail(a)} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 20, cursor: 'pointer',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>{a.monthName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Archived · {new Date(a.resetAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <span style={{ fontSize: 28 }}>📦</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Spent</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--red)', marginTop: 2 }}>Rs. {a.totalExpenses?.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Expenses</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--text)', marginTop: 2 }}>{a.expenseCount}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>View details →</div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selected || detailLoading} onClose={() => setSelected(null)} title={selected?.monthName || 'Loading...'} maxWidth={580}>
        {detailLoading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : selected && (
          <div>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Expenses', value: `Rs. ${selected.totalExpenses?.toLocaleString()}`, color: 'var(--red)' },
                { label: 'Total Paid Back', value: `Rs. ${selected.totalPayments?.toLocaleString()}`, color: 'var(--accent)' },
                { label: 'Transactions', value: selected.expenseCount + selected.paymentCount, color: 'var(--text)' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Member snapshots */}
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 10 }}>Member Balances at Reset</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {selected.memberSnapshots?.map((m, i) => {
                const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9'];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-alt)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={m.name} size={32} color={COLORS[i % COLORS.length]} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.role}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: m.balance >= 0 ? 'var(--accent)' : 'var(--red)', fontSize: 14 }}>
                      {m.balance >= 0 ? '+' : ''}Rs. {m.balance?.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category breakdown */}
            {selected.categoryBreakdown?.length > 0 && (
              <>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 10 }}>Category Breakdown</div>
                {selected.categoryBreakdown.map((c, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{c.category}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Rs. {c.total?.toLocaleString()} ({c.percent}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--border)' }}>
                      <div style={{ height: '100%', width: `${c.percent}%`, borderRadius: 99, background: CAT_COLORS[c.category] || '#9CA3AF' }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ArchivePage;