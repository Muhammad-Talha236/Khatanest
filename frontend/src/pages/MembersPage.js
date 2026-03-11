// pages/MembersPage.js — Updated with co-admin promotion
import React, { useState, useEffect } from 'react';
import { groupAPI, authAPI } from '../services/api';
import Modal, { ConfirmModal } from '../components/Modal';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import toast from 'react-hot-toast';

const MembersPage = () => {
  const [group, setGroup]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [removeId, setRemoveId]     = useState(null);
  const [promotingId, setPromotingId] = useState(null);
  const [removing, setRemoving]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ name: '', email: '', password: '' });

  const [inviteLink, setInviteLink]     = useState('');
  const [inviteExpiry, setInviteExpiry] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied]             = useState(false);

  const loadGroup = async () => {
    setLoading(true);
    try { const res = await groupAPI.getGroup(); setGroup(res.data.group); }
    catch { toast.error('Failed to load group'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadGroup(); }, []);

  const handleGenerateInvite = async () => {
    setGeneratingLink(true);
    try {
      const res = await authAPI.generateInvite();
      setInviteLink(res.data.link);
      setInviteExpiry(res.data.expiresAt);
      setShowInviteModal(true);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate'); }
    finally { setGeneratingLink(false); }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true); toast.success('Link copied!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const el = document.createElement('textarea');
      el.value = inviteLink; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      setCopied(true); toast.success('Link copied!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Hey! Join our KhataNest hostel expense group.\n\nClick this link:\n${inviteLink}\n\n(Valid for 7 days)`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('All fields required');
    setSaving(true);
    try {
      await groupAPI.addMember(form);
      toast.success(`${form.name} added!`);
      setShowAdd(false); setForm({ name: '', email: '', password: '' }); loadGroup();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await groupAPI.removeMember(removeId);
      toast.success('Member removed'); setRemoveId(null); loadGroup();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot remove'); }
    finally { setRemoving(false); }
  };

  // ✅ NEW: Toggle co-admin
  const handleToggleRole = async (member) => {
    const newRole = member.role === 'co-admin' ? 'member' : 'co-admin';
    setPromotingId(member._id);
    try {
      await groupAPI.updateMemberRole(member._id, newRole);
      toast.success(`${member.name} is now ${newRole === 'co-admin' ? 'Co-Admin ⭐' : 'Member'}`);
      loadGroup();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPromotingId(null); }
  };

  const getRoleLabel = (role) => {
    if (role === 'admin')    return { label: '👑 ADMIN',    bg: 'var(--accent-soft)',  color: 'var(--accent)' };
    if (role === 'co-admin') return { label: '⭐ CO-ADMIN', bg: 'var(--yellow-soft)', color: 'var(--yellow)' };
    return { label: '👤 MEMBER', bg: 'var(--blue-soft)', color: 'var(--blue)' };
  };

  const getBalanceLabel = (m) => {
    if (m.role === 'admin') return m.balance > 0 ? 'Members owe you' : m.balance < 0 ? 'You overspent' : 'All settled';
    return m.balance < 0 ? 'Owes admin' : m.balance > 0 ? 'Admin owes member' : 'Settled';
  };

  const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];

  if (loading) return <Spinner message="Loading members..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>Members</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Group: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{group?.name}</span> · {group?.members?.length} members
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleGenerateInvite} disabled={generatingLink} style={{ background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#000', fontWeight: 800, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔗</span><span>{generatingLink ? 'Generating...' : 'Invite via Link'}</span>
          </button>
          <button onClick={() => setShowAdd(true)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ Add Manually</button>
        </div>
      </div>

      <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)', borderRadius: 12, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--accent)' }}>Co-Admin</strong> — you can promote members to co-admin so they can also add expenses. Use "⭐ Promote" button on member cards.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {group?.members?.map((m, i) => {
          const color        = m.avatarColor || COLORS[i % COLORS.length];
          const isPositive   = m.balance >= 0;
          const roleInfo     = getRoleLabel(m.role);
          return (
            <div key={m._id} style={{ background: `linear-gradient(135deg, var(--surface), ${color}0A)`, border: `1px solid ${color}22`, borderRadius: 16, padding: 20, transition: 'transform .2s, box-shadow .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${color}20`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <Avatar name={m.name} size={40} color={color} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                  </div>
                </div>
                <span style={{ flexShrink: 0, background: roleInfo.bg, color: roleInfo.color, padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>{roleInfo.label}</span>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 10, background: isPositive ? 'var(--accent-soft)' : 'var(--red-soft)', border: `1px solid ${isPositive ? 'var(--accent-glow)' : 'rgba(255,92,106,0.25)'}`, marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 3 }}>{getBalanceLabel(m)}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(15px, 4vw, 20px)', color: isPositive ? 'var(--accent)' : 'var(--red)' }}>
                  {m.balance >= 0 ? '+' : ''}Rs. {m.balance?.toLocaleString()}
                </span>
              </div>

              {m.role !== 'admin' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* ✅ NEW: Co-admin toggle */}
                  <button onClick={() => handleToggleRole(m)} disabled={promotingId === m._id} style={{
                    flex: 1, padding: '8px', borderRadius: 8,
                    background: m.role === 'co-admin' ? 'var(--yellow-soft)' : 'var(--blue-soft)',
                    border: `1px solid ${m.role === 'co-admin' ? 'rgba(255,181,71,0.3)' : 'rgba(91,141,239,0.3)'}`,
                    color: m.role === 'co-admin' ? 'var(--yellow)' : 'var(--blue)',
                    fontWeight: 700, cursor: 'pointer', fontSize: 11,
                    opacity: promotingId === m._id ? 0.6 : 1,
                  }}>
                    {promotingId === m._id ? '...' : m.role === 'co-admin' ? 'Demote' : '⭐ Promote'}
                  </button>
                  <button onClick={() => setRemoveId(m._id)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--red-soft)', border: '1px solid rgba(255,92,106,0.3)', color: 'var(--red)', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>Remove</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => { setShowInviteModal(false); setCopied(false); }} title="🔗 Invite Link Ready!" maxWidth={500}>
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          ✅ Share this link. Member will self-register and auto-join <strong style={{ color: 'var(--accent)' }}>{group?.name}</strong>.
          <span style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            ⏰ Valid for 7 days · {inviteExpiry && `Expires: ${new Date(inviteExpiry).toLocaleDateString()}`}
          </span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{inviteLink}</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button onClick={handleCopy} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${copied ? 'var(--accent-glow)' : 'var(--border)'}`, background: copied ? 'var(--accent-soft)' : 'var(--surface)', color: copied ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>{copied ? '✅' : '📋'}</span><span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button onClick={handleWhatsApp} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>💬</span><span>WhatsApp</span>
          </button>
        </div>
        <button onClick={() => { setShowInviteModal(false); handleGenerateInvite(); }} style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
          🔄 Generate New Link (invalidates previous)
        </button>
      </Modal>

      {/* Add Manual Member */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Member Manually">
        <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'var(--yellow-soft)', border: '1px solid rgba(255,181,71,0.3)', fontSize: 12, color: 'var(--yellow)', lineHeight: 1.5 }}>
          ⚠️ Prefer "Invite via Link" so member sets their own password.
        </div>
        <FormField label="Full Name" required><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ali Khan" /></FormField>
        <FormField label="Email" required><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ali@example.com" /></FormField>
        <FormField label="Temp Password" required><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 chars" /></FormField>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleAdd} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', color: '#000', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!removeId} onClose={() => setRemoveId(null)} onConfirm={handleRemove} title="Remove Member" confirmText="Remove" loading={removing} message="Remove this member? They must have zero balance to be removed." />
    </div>
  );
};

export default MembersPage;