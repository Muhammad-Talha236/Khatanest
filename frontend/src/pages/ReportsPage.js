// pages/ReportsPage.js — Updated with CSV export, budget status, archive link
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, balanceAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ReportsPage = () => {
  const { isAdmin }  = useAuth();
  const navigate     = useNavigate();
  const [stats, setStats]       = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [group, setGroup]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([expenseAPI.getStats(), balanceAPI.getBalances(), groupAPI.getGroup()])
      .then(([s, b, g]) => { setStats(s.data.stats); setBalanceData(b.data); setGroup(g.data.group); })
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      await groupAPI.monthlyReset();
      toast.success('Monthly reset complete! Archive saved.');
      setShowReset(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed'); }
    finally { setResetting(false); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await expenseAPI.exportCSV({});
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href = url;
      a.download = `expenses-${format(new Date(), 'yyyy-MM')}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const generatePDF = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  if (loading) return <Spinner message="Preparing reports..." />;

  const totalCatExpenses = stats?.categoryData?.reduce((s, c) => s + c.total, 0) || 0;

  const actionCards = [
    { icon: '📄', title: 'Export PDF', desc: 'Print full expense report', color: '#2ECC9A', action: generatePDF, label: 'Print / PDF' },
    { icon: '📊', title: 'Export CSV', desc: 'Download expenses as spreadsheet', color: '#5B8DEF', action: handleExportCSV, label: exporting ? 'Exporting...' : 'Export CSV' },
    ...(isAdmin ? [
      { icon: '📦', title: 'View Archives', desc: 'Browse past monthly snapshots', color: '#FFB547', action: () => navigate('/archives'), label: 'View Archives' },
      { icon: '🔄', title: 'Monthly Reset', desc: '⚠️ Archive & clear all balances', color: '#FF5C6A', action: () => setShowReset(true), label: 'Reset Month' },
    ] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>Reports & Analytics</h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>Export data, view archives, and manage monthly cycles</p>
      </div>

      {/* Action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {actionCards.map((c, i) => (
          <div key={i} style={{ background: `linear-gradient(135deg, var(--surface), ${c.color}0A)`, border: `1px solid ${c.color}22`, borderRadius: 16, padding: 22, cursor: 'pointer', transition: 'transform .2s, box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${c.color}20`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{c.desc}</div>
            <button onClick={c.action} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', background: `${c.color}18`, border: `1px solid ${c.color}44`, color: c.color, fontWeight: 700, fontSize: 12 }}>{c.label} →</button>
          </div>
        ))}
      </div>

      {/* Budget Status — NEW */}
      {isAdmin && stats?.budgetStatus?.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, marginBottom: 16 }}>Budget Status This Month</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.budgetStatus.map((b, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'capitalize', fontWeight: 600 }}>{b.category}</span>
                  <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rs. {b.spent?.toLocaleString()} / Rs. {b.limit?.toLocaleString()}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 700, background: b.overBudget ? 'var(--red-soft)' : b.pct >= b.alertAt ? 'var(--yellow-soft)' : 'var(--accent-soft)', color: b.overBudget ? 'var(--red)' : b.pct >= b.alertAt ? 'var(--yellow)' : 'var(--accent)' }}>{b.pct}%</span>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--border)' }}>
                  <div style={{ height: '100%', width: `${Math.min(b.pct, 100)}%`, borderRadius: 99, background: b.overBudget ? 'var(--red)' : b.pct >= b.alertAt ? 'var(--yellow)' : 'var(--accent)', transition: 'width 1s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month comparison — NEW */}
      {isAdmin && stats?.monthChange !== undefined && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>This Month</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)' }}>Rs. {stats.monthlyTotal?.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Last Month</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text-muted)' }}>Rs. {stats.prevMonthTotal?.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Change</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: stats.monthChange > 0 ? 'var(--red)' : stats.monthChange < 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
              {stats.monthChange > 0 ? '↑' : stats.monthChange < 0 ? '↓' : '='} {Math.abs(stats.monthChange)}%
            </div>
          </div>
        </div>
      )}

      {/* PDF Report Content */}
      <div id="pdf-report">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--text)', margin: 0, fontSize: 20 }}>{group?.name} — Expense Report</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Generated: {format(new Date(), 'MMMM d, yyyy')} · {format(new Date(), 'MMMM yyyy')}</div>
            </div>
            <div style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOTAL THIS MONTH</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--accent)', fontSize: 22 }}>Rs. {stats?.monthlyTotal?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Member table */}
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, marginBottom: 14 }}>Member Balance Summary</div>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)' }}>
                  {['Member', 'Role', 'Balance', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balanceData?.members?.map((m, i) => (
                  <tr key={m._id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>{m.name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: m.role === 'admin' ? 'var(--accent-soft)' : m.role === 'co-admin' ? 'var(--yellow-soft)' : 'var(--blue-soft)', color: m.role === 'admin' ? 'var(--accent)' : m.role === 'co-admin' ? 'var(--yellow)' : 'var(--blue)', fontWeight: 700, textTransform: 'uppercase' }}>{m.role}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 15, color: m.balance >= 0 ? 'var(--accent)' : 'var(--red)' }}>{m.balance >= 0 ? '+' : ''}Rs. {m.balance?.toLocaleString()}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, color: m.balance === 0 ? 'var(--accent)' : m.balance < 0 ? 'var(--red)' : 'var(--yellow)', fontWeight: 600 }}>
                        {m.balance === 0 ? '✅ Settled' : m.balance < 0 ? '⚠️ Owes' : '💰 Credited'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category breakdown */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, marginBottom: 20 }}>Expense Breakdown by Category</div>
          {!stats?.categoryData?.length ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No expense data this month</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.categoryData.map((c, i) => {
                const colors = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];
                const pct    = totalCatExpenses ? Math.round((c.total / totalCatExpenses) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'capitalize', fontWeight: 600 }}>{c._id}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Rs. {c.total?.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: 'var(--border)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: colors[i % colors.length], transition: 'width 1s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={showReset} onClose={() => setShowReset(false)} onConfirm={handleReset} title="Monthly Reset" confirmText="Reset & Archive" loading={resetting}
        message="⚠️ This will ARCHIVE the current month's data and reset ALL balances to zero. This action cannot be undone — but data is preserved in Archives." />
    </div>
  );
};

export default ReportsPage;