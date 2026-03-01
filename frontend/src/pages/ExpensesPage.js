// pages/ExpensesPage.js - Full expense management
import React, { useState, useEffect, useCallback } from 'react';
import { expenseAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORIES = ['grocery', 'electricity', 'gas', 'internet', 'water', 'rent', 'other'];
const CAT_COLORS = { grocery: '#2ECC9A', electricity: '#FFB547', gas: '#FF5C6A', internet: '#5B8DEF', water: '#34D399', rent: '#E879F9', other: '#9CA3AF' };

const ExpensesPage = () => {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', amount: '', dividedAmong: [], date: '', category: 'other'
  });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await expenseAPI.getExpenses({ page, limit: 10, search, category });
      setExpenses(res.data.expenses);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }, [search, category]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    groupAPI.getGroup().then(res => setMembers(res.data.group.members)).catch(() => {});
  }, []);

  const openAdd = () => {
    setEditingExpense(null);
    setForm({ title: '', description: '', amount: '', dividedAmong: members.map(m => m._id), date: format(new Date(), 'yyyy-MM-dd'), category: 'other' });
    setShowModal(true);
  };

  const openEdit = (expense) => {
    setEditingExpense(expense);
    setForm({
      title: expense.title, description: expense.description || '',
      amount: expense.amount, dividedAmong: expense.dividedAmong.map(m => m._id || m),
      date: format(new Date(expense.date), 'yyyy-MM-dd'), category: expense.category,
    });
    setShowModal(true);
  };

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      dividedAmong: f.dividedAmong.includes(id)
        ? f.dividedAmong.filter(x => x !== id)
        : [...f.dividedAmong, id],
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.amount || form.dividedAmong.length === 0) {
      return toast.error('Title, amount and at least one member are required');
    }
    setSaving(true);
    try {
      if (editingExpense) {
        await expenseAPI.updateExpense(editingExpense._id, form);
        toast.success('Expense updated');
      } else {
        await expenseAPI.addExpense(form);
        toast.success('Expense added & balances updated!');
      }
      setShowModal(false);
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await expenseAPI.deleteExpense(deleteId);
      toast.success('Expense deleted');
      setDeleteId(null);
      load(pagination.page);
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const splitPrev = form.dividedAmong.length > 0 ? (parseFloat(form.amount) / form.dividedAmong.length).toFixed(2) : '0';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>Expenses</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>Manage and track shared expenses</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} style={{
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            border: 'none', borderRadius: 10, padding: '10px 20px',
            color: '#000', fontWeight: 800, cursor: 'pointer', fontSize: 14,
          }}>+ Add Expense</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="🔍 Search expenses..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', color: 'var(--text)', fontSize: 13 }}
        />
        <select value={category} onChange={e => setCategory(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', color: 'var(--text)', fontSize: 13, width: 'auto' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{pagination.total} total</div>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : expenses.length === 0 ? (
        <EmptyState icon="🧾" title="No expenses yet" message="Add your first expense to start tracking shared costs." />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
                  {['Expense', 'Amount', 'Per Person', 'Split', 'Date', ...(isAdmin ? ['Actions'] : [])].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e._id} style={{ borderBottom: '1px solid rgba(30,34,41,0.6)', transition: 'background .15s' }}
                    onMouseEnter={el => el.currentTarget.style.background = 'var(--surface-alt)'}
                    onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: CAT_COLORS[e.category] || '#9CA3AF',
                        }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{e.title}</div>
                          <div style={{ fontSize: 11, color: e.descriptionCleared ? 'var(--yellow)' : 'var(--text-muted)', marginTop: 2 }}>
                            {e.descriptionCleared ? '⚠️ Cleared (21 days)' : e.description || e.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--red)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      Rs. {e.amount?.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--yellow)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                      Rs. {e.splitAmount?.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex' }}>
                        {e.dividedAmong?.slice(0, 4).map((m, j) => (
                          <div key={j} title={m.name} style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: ['#2ECC9A22','#5B8DEF22','#FFB54722','#E879F922'][j % 4],
                            border: '2px solid var(--surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 800, color: ['#2ECC9A','#5B8DEF','#FFB547','#E879F9'][j % 4],
                            marginLeft: j > 0 ? -7 : 0, zIndex: 4 - j,
                          }}>{m.name?.[0]}</div>
                        ))}
                        {e.dividedAmong?.length > 4 && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--text-muted)', marginLeft: -7 }}>
                            +{e.dividedAmong.length - 4}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {format(new Date(e.date), 'MMM d, yyyy')}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(e)} style={{ background: 'var(--blue-soft)', border: '1px solid rgba(91,141,239,0.3)', borderRadius: 6, padding: '4px 10px', color: 'var(--blue)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setDeleteId(e._id)} style={{ background: 'var(--red-soft)', border: '1px solid rgba(255,92,106,0.3)', borderRadius: 6, padding: '4px 10px', color: 'var(--red)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Del</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <Pagination current={pagination.page} total={pagination.pages} onChange={p => load(p)} />
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingExpense ? 'Edit Expense' : 'Add New Expense'}>
        <FormField label="Title" required>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Electricity Bill" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Amount (Rs.)" required>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 2400" min="1" />
          </FormField>
          <FormField label="Category">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Description">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes..." rows={2} style={{ resize: 'vertical' }} />
        </FormField>
        <FormField label="Date">
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </FormField>
        <FormField label="Split Between" required>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, background: 'transparent', border: 'none', padding: 0 }}>
            {members.map(m => {
              const sel = form.dividedAmong.includes(m._id);
              return (
                <label key={m._id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  background: sel ? 'var(--accent-soft)' : 'var(--surface)',
                  border: `1px solid ${sel ? 'var(--accent-glow)' : 'var(--border)'}`,
                  transition: 'all .15s',
                }}>
                  <input type="checkbox" checked={sel} onChange={() => toggleMember(m._id)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13, color: sel ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>{m.name.split(' ')[0]}</span>
                </label>
              );
            })}
          </div>
          {form.amount && form.dividedAmong.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)', fontSize: 12, color: 'var(--accent)' }}>
              💡 Each person pays: <strong>Rs. {splitPrev}</strong> ({form.dividedAmong.length} people)
            </div>
          )}
        </FormField>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', color: '#000', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Expense" confirmText="Delete" loading={deleting}
        message="Are you sure you want to delete this expense? Member balances will be reversed automatically."
      />
    </div>
  );
};

export default ExpensesPage;
