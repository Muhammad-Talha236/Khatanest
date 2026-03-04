// pages/PaymentsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { paymentAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Avatar } from '../components/Layout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];

const PaymentsPage = () => {
  const { isAdmin, updateUser, user } = useAuth();
  const [payments, setPayments]         = useState([]);
  const [allMembers, setAllMembers]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [pagination, setPagination]     = useState({ page: 1, pages: 1, total: 0 });
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [adminShareSummary, setAdminShareSummary] = useState(null);
  const [activeTab, setActiveTab]       = useState('all');   // 'all' | 'members' | 'myshare'
  const [showModal, setShowModal]       = useState(false);
  const [paymentMode, setPaymentMode]   = useState('member'); // 'member' | 'self'
  const [deleteId, setDeleteId]         = useState(null);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [form, setForm] = useState({
    memberId: '', amount: '', note: '', paymentMethod: 'cash', date: '',
  });

  const loadPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      // Map tab to API type filter
      const typeMap = { all: '', members: 'member', myshare: 'self' };
      const res = await paymentAPI.getPayments({ page, limit: 10, type: typeMap[activeTab] });
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
      setMonthlyTotal(res.data.monthlyTotal);
      if (res.data.adminShareSummary) {
        setAdminShareSummary(res.data.adminShareSummary);
      }
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  useEffect(() => {
    if (isAdmin) {
      groupAPI.getGroup()
        .then(res => setAllMembers(res.data.group.members))
        .catch(() => {});
    }
  }, [isAdmin]);

  const refreshAdminBalance = async () => {
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.getMe();
      updateUser(res.data.user);
    } catch (e) {
      console.error('Balance refresh failed', e);
    }
  };

  const openModal = (mode = 'member') => {
    setPaymentMode(mode);
    const today = format(new Date(), 'yyyy-MM-dd');
    if (mode === 'self') {
      setForm({ memberId: user?._id || '', amount: '', note: '', paymentMethod: 'cash', date: today });
    } else {
      setForm({ memberId: '', amount: '', note: '', paymentMethod: 'cash', date: today });
    }
    setShowModal(true);
  };

  const handleRecord = async () => {
    if (!form.memberId || !form.amount) {
      return toast.error('Please select a person and enter amount');
    }
    setSaving(true);
    try {
      await paymentAPI.recordPayment({ ...form, amount: parseFloat(form.amount) });
      toast.success(
        paymentMode === 'self'
          ? 'Your share payment recorded!'
          : 'Member payment recorded!'
      );
      setShowModal(false);
      setForm({ memberId: '', amount: '', note: '', paymentMethod: 'cash', date: '' });
      await loadPayments();
      await refreshAdminBalance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await paymentAPI.deletePayment(deleteId);
      toast.success('Payment reversed');
      setDeleteId(null);
      await loadPayments();
      await refreshAdminBalance();
    } catch {
      toast.error('Failed to reverse');
    } finally {
      setDeleting(false);
    }
  };

  const regularMembers = allMembers.filter(m => m.role !== 'admin');
  const selectedMember = allMembers.find(m => m._id === form.memberId);

  const TABS = [
    { key: 'all',      label: 'All Payments' },
    { key: 'members',  label: 'Member Payments' },
    { key: 'myshare',  label: 'My Share Payments' },
  ];

  // Admin share remaining
  const shareRemaining = adminShareSummary
    ? adminShareSummary.remaining
    : 0;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 26, color: 'var(--text)', margin: 0,
          }}>Payments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Track member payments and your own share contributions
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => openModal('member')} style={{
              background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
              border: 'none', borderRadius: 10, padding: '10px 18px',
              color: '#000', fontWeight: 800, cursor: 'pointer', fontSize: 13,
            }}>+ Record Member Payment</button>
            <button onClick={() => openModal('self')} style={{
              background: 'linear-gradient(135deg, #5B8DEF, #3B5FBF)',
              border: 'none', borderRadius: 10, padding: '10px 18px',
              color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13,
            }}>+ Pay My Share</button>
          </div>
        )}
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isAdmin ? 'repeat(4, 1fr)' : '1fr 1fr',
        gap: 16, marginBottom: 24,
      }}>
        {/* Received this month */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--accent-glow)',
          borderRadius: 16, padding: 20,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
            Received This Month
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: 'var(--accent)' }}>
            Rs. {monthlyTotal?.toLocaleString()}
          </div>
        </div>

        {/* Total payments */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255,92,106,0.3)',
          borderRadius: 16, padding: 20,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
            Total Payments
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: 'var(--text)' }}>
            {pagination.total || 0}
          </div>
        </div>

        {/* Admin's own share — only shown to admin */}
        {isAdmin && adminShareSummary && (
          <>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid rgba(91,141,239,0.35)',
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
                My Total Share Owed
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: '#5B8DEF' }}>
                Rs. {adminShareSummary.totalOwed?.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Paid: Rs. {adminShareSummary.totalPaid?.toLocaleString()}
              </div>
            </div>

            <div style={{
              background: shareRemaining > 0 ? 'var(--red-soft)' : 'var(--accent-soft)',
              border: `1px solid ${shareRemaining > 0 ? 'rgba(255,92,106,0.3)' : 'var(--accent-glow)'}`,
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
                My Remaining Share
              </div>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24,
                color: shareRemaining > 0 ? 'var(--red)' : 'var(--accent)',
              }}>
                Rs. {shareRemaining?.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: shareRemaining > 0 ? 'var(--red)' : 'var(--accent)', marginTop: 4 }}>
                {shareRemaining > 0 ? '⚠️ Still unpaid' : '✅ Fully paid'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Admin's Share Detail Banner ─────────────────────────────────────── */}
      {isAdmin && adminShareSummary && adminShareSummary.totalOwed > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0f1520, #0a1020)',
          border: '1px solid rgba(91,141,239,0.25)',
          borderRadius: 14, padding: '18px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(91,141,239,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              👤 Your Personal Share Tracker
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              You've been included in expenses totalling{' '}
              <span style={{ color: '#5B8DEF', fontWeight: 700 }}>
                Rs. {adminShareSummary.totalOwed?.toLocaleString()}
              </span>.
              You've paid{' '}
              <span style={{ color: '#2ECC9A', fontWeight: 700 }}>
                Rs. {adminShareSummary.totalPaid?.toLocaleString()}
              </span>.
              {shareRemaining > 0 && (
                <span style={{ color: '#FF5C6A', fontWeight: 700 }}>
                  {' '}Rs. {shareRemaining.toLocaleString()} still outstanding.
                </span>
              )}
              {shareRemaining === 0 && adminShareSummary.totalOwed > 0 && (
                <span style={{ color: '#2ECC9A', fontWeight: 700 }}> You're all caught up! ✅</span>
              )}
            </div>
          </div>
          {shareRemaining > 0 && (
            <button onClick={() => openModal('self')} style={{
              background: 'linear-gradient(135deg, #5B8DEF, #3B5FBF)',
              border: 'none', borderRadius: 10, padding: '10px 18px',
              color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13,
              whiteSpace: 'nowrap',
            }}>Pay My Share →</button>
          )}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
              background: activeTab === tab.key ? 'var(--accent-soft)' : 'var(--surface)',
              color     : activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              border    : `1px solid ${activeTab === tab.key ? 'var(--accent-glow)' : 'var(--border)'}`,
            }}>{tab.label}</button>
          ))}
        </div>
      )}

      {/* ── Payment List ───────────────────────────────────────────────────── */}
      {loading ? <Spinner /> : payments.length === 0 ? (
        <EmptyState
          icon="💵"
          title={activeTab === 'myshare' ? 'No share payments yet' : 'No payments recorded'}
          message={
            activeTab === 'myshare'
              ? "Use 'Pay My Share' to record your own contributions."
              : "Record a payment when a member pays back their dues."
          }
        />
      ) : (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px 0', fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>
            Payment History
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {payments.map((p, i) => {
              const isAdminSelf = p.isAdminSelfPayment === true;
              return (
                <div key={p._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Avatar
                      name={p.member?.name || '?'}
                      size={40}
                      color={isAdminSelf ? '#5B8DEF' : COLORS[i % COLORS.length]}
                    />
                    <div>
                      <div style={{
                        fontWeight: 700, color: 'var(--text)', fontSize: 14,
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      }}>
                        {p.member?.name}
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                          background: isAdminSelf ? 'rgba(91,141,239,0.15)' : 'var(--accent-soft)',
                          color     : isAdminSelf ? '#5B8DEF'               : 'var(--accent)',
                          border    : `1px solid ${isAdminSelf ? 'rgba(91,141,239,0.3)' : 'var(--accent-glow)'}`,
                        }}>
                          {isAdminSelf ? 'MY SHARE' : 'MEMBER PAID'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {format(new Date(p.date), 'MMM d, yyyy')}
                        {' · '}{p.paymentMethod.replace('_', ' ')}
                        {p.note && ` · ${p.note}`}
                        {p.receivedBy && !isAdminSelf && ` · Recorded by ${p.receivedBy.name}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      fontWeight: 800, fontSize: 16,
                      color: isAdminSelf ? '#5B8DEF' : 'var(--accent)',
                    }}>
                      +Rs. {p.amount?.toLocaleString()}
                    </div>
                    {isAdmin && (
                      <button onClick={() => setDeleteId(p._id)} style={{
                        background: 'var(--red-soft)', border: '1px solid rgba(255,92,106,0.3)',
                        borderRadius: 6, padding: '4px 10px', color: 'var(--red)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>Reverse</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <Pagination current={pagination.page} total={pagination.pages} onChange={loadPayments} />
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={paymentMode === 'self' ? 'Pay My Share' : 'Record Member Payment'}
      >
        {paymentMode === 'self' ? (
          /* ── Admin Self-Payment Form ── */
          <>
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(91,141,239,0.1)', border: '1px solid rgba(91,141,239,0.25)',
              fontSize: 13, color: '#8BAAEE', lineHeight: 1.6,
            }}>
              💡 Recording your own share contribution. This does not affect member balances —
              it only tracks your personal share payments separately.
              {adminShareSummary && shareRemaining > 0 && (
                <div style={{ marginTop: 6, fontWeight: 700, color: '#5B8DEF' }}>
                  Outstanding: Rs. {shareRemaining.toLocaleString()}
                </div>
              )}
            </div>

            <FormField label="Amount (Rs.)" required>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder={`e.g. ${shareRemaining || 500}`}
                min="1"
              />
            </FormField>
          </>
        ) : (
          /* ── Member Payment Form ── */
          <>
            <FormField label="Who paid?" required>
              <select
                value={form.memberId}
                onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
              >
                <option value="">Select member...</option>
                {regularMembers.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                    {m.balance < 0
                      ? ` — owes Rs. ${Math.abs(m.balance).toLocaleString()}`
                      : m.balance === 0
                        ? ' — settled'
                        : ` — overpaid Rs. ${m.balance.toLocaleString()}`}
                  </option>
                ))}
              </select>
            </FormField>

            {selectedMember && selectedMember.balance < 0 && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 4,
                background: 'var(--red-soft)', border: '1px solid rgba(255,92,106,0.2)',
                fontSize: 12, color: 'var(--red)', lineHeight: 1.5,
              }}>
                ⚠️ {selectedMember.name} owes Rs. {Math.abs(selectedMember.balance).toLocaleString()}
              </div>
            )}
            {selectedMember && selectedMember.balance === 0 && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 4,
                background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)',
                fontSize: 12, color: 'var(--accent)', lineHeight: 1.5,
              }}>
                ✅ {selectedMember.name} is already fully settled.
              </div>
            )}

            <FormField label="Amount (Rs.)" required>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 1000"
                min="1"
              />
            </FormField>
          </>
        )}

        {/* Shared fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Payment Method">
            <select
              value={form.paymentMethod}
              onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Date">
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Note (optional)">
          <input
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Rent share, grocery share"
          />
        </FormField>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={() => setShowModal(false)} style={{
            flex: 1, padding: '11px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleRecord} disabled={saving} style={{
            flex: 2, padding: '11px', borderRadius: 10, border: 'none',
            background: paymentMode === 'self'
              ? 'linear-gradient(135deg, #5B8DEF, #3B5FBF)'
              : 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            color: paymentMode === 'self' ? '#fff' : '#000',
            fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Recording...' : (paymentMode === 'self' ? 'Record My Share' : 'Record Payment')}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Reverse Payment"
        confirmText="Reverse"
        loading={deleting}
        message="This will reverse the payment and restore the original balance."
      />
    </div>
  );
};

export default PaymentsPage;