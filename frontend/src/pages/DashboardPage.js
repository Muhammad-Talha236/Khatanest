// pages/DashboardPage.js
// PRIVACY RULES:
//   - Admin sees: group stats, all member balances, receivable, personal share tracker
//   - Member sees: ONLY their own balance, their own expenses/payments, weekly chart
//   - Members CANNOT see: other members' balances, admin's receivable, group totals
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { expenseAPI, balanceAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import { format } from 'date-fns';

const StatCard = ({ icon, label, value, color = '#2ECC9A' }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--surface) 60%, ${color}08)`,
      border: '1px solid var(--border)', borderRadius: 16,
      padding: isMobile ? 14 : 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        background: `radial-gradient(circle at top right, ${color}15, transparent 70%)`,
      }} />
      <div style={{ fontSize: isMobile ? 20 : 22, marginBottom: 6 }}>{icon}</div>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 900,
        fontSize: isMobile ? 18 : 24, color, letterSpacing: -1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{value}</div>
      <div style={{
        fontSize: isMobile ? 10 : 12, color: 'var(--text-muted)',
        marginTop: 4, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: 0.6,
      }}>{label}</div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-alt)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '8px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--accent)' }}>Rs. {payload[0].value?.toLocaleString()}</div>
    </div>
  );
};

// ─── MEMBER DASHBOARD ──────────────────────────────────────────────────────────
// Only shows: own balance, own recent transactions, weekly chart (group-level)
const MemberDashboard = ({ user, stats, history, isMobile, isSmallMobile, navigate }) => {
  const myBalance = user?.balance ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>

      {/* Member's personal balance card */}
      <div style={{
        background: myBalance < 0
          ? 'linear-gradient(135deg, #1a0a0c, #120608)'
          : 'linear-gradient(135deg, #0a1a12, #061210)',
        border: `1px solid ${myBalance < 0 ? 'rgba(255,92,106,0.3)' : 'rgba(46,204,154,0.3)'}`,
        borderRadius: 16, padding: isMobile ? '20px' : '24px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20, width: 100, height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${myBalance < 0 ? 'rgba(255,92,106,0.12)' : 'rgba(46,204,154,0.12)'}, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
          color: myBalance < 0 ? 'rgba(255,92,106,0.7)' : 'rgba(46,204,154,0.7)',
          marginBottom: 8,
        }}>
          {myBalance < 0 ? '⚠️ Your Outstanding Balance' : myBalance === 0 ? '✅ Your Balance' : '💰 Your Balance'}
        </div>
        <div style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900,
          fontSize: isMobile ? 32 : 42,
          color: myBalance < 0 ? '#FF5C6A' : '#2ECC9A',
          letterSpacing: -2, lineHeight: 1,
        }}>
          {myBalance >= 0 ? '+' : ''}Rs. {myBalance.toLocaleString()}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
          {myBalance < 0
            ? `You owe Rs. ${Math.abs(myBalance).toLocaleString()} to admin`
            : myBalance === 0
              ? 'You are fully settled — great job!'
              : 'You have a positive balance'}
        </div>
      </div>

      {/* Weekly chart — shows group expense trend, not individual amounts */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: isMobile ? 16 : 20,
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16 }}>
            Group Weekly Expenses
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 7 days</div>
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 130 : 160}>
          <BarChart data={stats?.weeklyChart || []} barSize={isMobile ? 18 : 28}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(46,204,154,0.05)' }} />
            <Bar dataKey="amount" fill="url(#barGrad2)" radius={[5, 5, 2, 2]} />
            <defs>
              <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ECC9A" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#1A7A5C" stopOpacity={0.5} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* My recent transactions */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: isMobile ? 16 : 20,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16 }}>
            My Transactions
          </div>
          <button onClick={() => navigate('/history')} style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>View all →</button>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>
            No transactions yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((t, i) => {
              const isPayment = t.type === 'payment';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 12,
                  background: isPayment ? 'var(--accent-soft)' : 'var(--red-soft)',
                  border: `1px solid ${isPayment ? 'var(--accent-glow)' : 'rgba(255,92,106,0.25)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 18 }}>{isPayment ? '💵' : '🧾'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 13, color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {format(new Date(t.date), 'MMM d, yyyy')}
                        {t.splitAmount && ` · Rs. ${t.splitAmount}/person`}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: 14,
                    color: isPayment ? 'var(--accent)' : 'var(--red)',
                    whiteSpace: 'nowrap', marginLeft: 10,
                  }}>
                    {isPayment ? '+' : '-'}Rs. {t.amount?.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
const AdminDashboard = ({ user, stats, history, isMobile, isSmallMobile, navigate }) => {
  const adminNetBalance = user?.balance ?? 0;
  const totalReceivable = stats?.totalReceivable || 0;
  const adminShareStats = stats?.adminShareStats || null;

  const weekDays = isMobile
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const chartData = weekDays.map((day, idx) => {
    const found = stats?.weeklyData?.find(d => d._id === idx + 1);
    return { day, amount: found?.total || 0 };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>

      {/* Stat Cards — 4 columns admin only */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? 8 : 16,
      }}>
        <StatCard icon="💰" label="Members Owe Me"
          value={`${adminNetBalance >= 0 ? '+' : ''}Rs. ${Math.abs(adminNetBalance).toLocaleString()}`}
          color={adminNetBalance >= 0 ? '#2ECC9A' : '#FF5C6A'} />
        <StatCard icon="📊" label="Monthly Expenses"
          value={`Rs. ${(stats?.monthlyTotal || 0).toLocaleString()}`}
          color="#5B8DEF" />
        <StatCard icon="📥" label="Receivable"
          value={`Rs. ${totalReceivable.toLocaleString()}`}
          color="#FFB547" />
        <StatCard icon="👥" label="Members"
          value={stats?.totalMembers || 0}
          color="#E879F9" />
      </div>

      {/* Admin's Personal Share Tracker — only when he has a share */}
      {adminShareStats && adminShareStats.totalOwed > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0f1520, #0a1020)',
          border: `1px solid ${adminShareStats.remaining > 0 ? 'rgba(255,92,106,0.3)' : 'rgba(91,141,239,0.3)'}`,
          borderRadius: 16, padding: isMobile ? '16px 20px' : '20px 24px',
        }}>
          <div style={{
            fontSize: 11, color: 'rgba(91,141,239,0.7)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
          }}>
            👤 My Personal Share Tracker
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>TOTAL OWED</div>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 900,
                fontSize: isMobile ? 22 : 26, color: '#FF5C6A', letterSpacing: -1, lineHeight: 1,
              }}>Rs. {adminShareStats.totalOwed.toLocaleString()}</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20, paddingBottom: 2 }}>→</div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>PAID</div>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 900,
                fontSize: isMobile ? 22 : 26, color: '#2ECC9A', letterSpacing: -1, lineHeight: 1,
              }}>Rs. {adminShareStats.totalPaid.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>REMAINING</div>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 900,
                fontSize: isMobile ? 22 : 26,
                color: adminShareStats.remaining > 0 ? '#FFB547' : '#2ECC9A',
                letterSpacing: -1, lineHeight: 1,
              }}>Rs. {adminShareStats.remaining.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: adminShareStats.remaining > 0 ? '#FF5C6A' : '#2ECC9A' }}>
              {adminShareStats.remaining > 0 ? '⚠️ You still have unpaid share' : '✅ Your share is fully paid!'}
            </div>
            {adminShareStats.remaining > 0 && (
              <button onClick={() => navigate('/payments')} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: 'rgba(91,141,239,0.2)', color: '#5B8DEF',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Pay My Share →</button>
            )}
          </div>
        </div>
      )}

      {/* Weekly Chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: isMobile ? 16 : 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16 }}>Weekly Expenses</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 7 days breakdown</div>
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 140 : 180}>
          <BarChart data={chartData} barSize={isMobile ? 20 : 32}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} tickFormatter={v => isMobile ? `${v / 1000}k` : `${v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(46,204,154,0.05)' }} />
            <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 2, 2]} />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ECC9A" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#1A7A5C" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Member Balances — admin only */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: isMobile ? 16 : 20 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16, marginBottom: 14 }}>
          Member Balances
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
          {(stats?.memberBalances || []).map((m, i) => {
            const colors = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];
            const color  = colors[i % colors.length];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface-alt)', border: '1px solid var(--border)',
                borderRadius: 12, padding: isMobile ? '10px 12px' : '8px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={m.name} size={isMobile ? 32 : 30} color={color} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: m.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{m.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div style={{
                    fontWeight: 700, fontSize: isMobile ? 14 : 13,
                    color: m.balance >= 0 ? 'var(--accent)' : 'var(--red)',
                    background: m.balance >= 0 ? 'var(--accent-soft)' : 'var(--red-soft)',
                    padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap',
                  }}>
                    {m.balance >= 0 ? '+' : ''}Rs. {m.balance?.toLocaleString()}
                  </div>
                  {m.role === 'admin' && (m.adminShareOwed || 0) > 0 && (
                    <div style={{ fontSize: 10, color: '#5B8DEF', whiteSpace: 'nowrap' }}>
                      Share: {(m.adminSharePaid || 0).toLocaleString()} / {(m.adminShareOwed || 0).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => navigate('/balances')} style={{
          marginTop: 16, width: '100%', padding: isMobile ? '12px' : '10px', borderRadius: 10,
          background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)',
          color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13,
        }}>View Full Balances →</button>
      </div>

      {/* Category Breakdown — admin only */}
      {stats?.categoryData?.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: isMobile ? 16 : 20 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16, marginBottom: 14 }}>
            By Category
          </div>
          {stats.categoryData.slice(0, 5).map((c, i) => {
            const total  = stats.categoryData.reduce((s, x) => s + x.total, 0);
            const pct    = total ? Math.round((c.total / total) * 100) : 0;
            const colors = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C'];
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize', fontWeight: 500 }}>{c._id}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                    Rs. {c.total?.toLocaleString()}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--border)' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: colors[i % colors.length], transition: 'width 1s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Transactions — admin sees all */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: isMobile ? 16 : 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16 }}>Recent Transactions</div>
          <button onClick={() => navigate('/history')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>View all →</button>
        </div>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 14 }}>No transactions yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((t, i) => {
              const isAdminSelf = t.isAdminSelfPayment === true;
              const isPayment   = t.type === 'payment';
              const bgColor     = isAdminSelf ? 'rgba(91,141,239,0.08)' : isPayment ? 'var(--accent-soft)' : 'var(--red-soft)';
              const borderColor = isAdminSelf ? 'rgba(91,141,239,0.25)' : isPayment ? 'var(--accent-glow)' : 'rgba(255,92,106,0.25)';
              const amountColor = isAdminSelf ? '#5B8DEF' : isPayment ? 'var(--accent)' : 'var(--red)';
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: isSmallMobile ? 'column' : 'row',
                  alignItems: isSmallMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '12px' : '10px 14px', borderRadius: 12,
                  background: bgColor, border: `1px solid ${borderColor}`,
                  gap: isSmallMobile ? 8 : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <span style={{ fontSize: isMobile ? 18 : 20 }}>{isAdminSelf ? '👤' : isPayment ? '💵' : '🧾'}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.dividedAmong && <span>Split {t.dividedAmong.length} ways</span>}
                        {t.member?.name && <span>• {t.member.name}</span>}
                        <span>• {format(new Date(t.date), 'MMM d')}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: amountColor, textAlign: 'right', paddingLeft: isSmallMobile ? 28 : 0 }}>
                    {isPayment ? '+' : '-'}Rs. {t.amount?.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stats, setStats]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, histRes] = await Promise.all([
          expenseAPI.getStats(),
          balanceAPI.getHistory({ page: 1, limit: 5 }),
        ]);

        const rawStats = statsRes.data.stats;

        // Build week chart data for member view
        const weekDaysFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyChart  = weekDaysFull.map((day, idx) => {
          const found = rawStats?.weeklyData?.find(d => d._id === idx + 1);
          return { day, amount: found?.total || 0 };
        });

        setStats({ ...rawStats, weeklyChart });
        setHistory(histRes.data.history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner message="Loading dashboard..." />;

  const isMobile      = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;
  const isAdmin       = user?.role === 'admin';

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900,
          fontSize: isMobile ? (isSmallMobile ? 18 : 20) : 24,
          color: 'var(--text)', margin: 0, letterSpacing: -0.5, lineHeight: 1.3,
        }}>
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},
          <span style={{ display: isSmallMobile ? 'block' : 'inline' }}> {user?.name?.split(' ')[0]} 👋</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: isMobile ? 11 : 13 }}>
          {format(new Date(), isMobile ? 'EEE, MMM d' : 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {isAdmin ? (
        <AdminDashboard
          user={user} stats={stats} history={history}
          isMobile={isMobile} isSmallMobile={isSmallMobile} navigate={navigate}
        />
      ) : (
        <MemberDashboard
          user={user} stats={stats} history={history}
          isMobile={isMobile} isSmallMobile={isSmallMobile} navigate={navigate}
        />
      )}
    </div>
  );
};

export default DashboardPage;