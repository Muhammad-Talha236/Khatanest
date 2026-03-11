// pages/ProfilePage.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = [
  '#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9',
  '#FB923C', '#34D399', '#F87171', '#60A5FA',
  '#A78BFA', '#FBBF24',
];

const Avatar = ({ name, size = 80, color = '#2ECC9A' }) => {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}33, ${color}11)`,
      border: `3px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 900, color,
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: `0 0 40px ${color}33`,
      flexShrink: 0,
    }}>{initials}</div>
  );
};

// ─── Password Modal ───────────────────────────────────────────────
const PasswordModal = ({ onClose }) => {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState({ current: false, new: false, confirm: false });

  const handleSubmit = async () => {
    if (!form.currentPassword || !form.newPassword) return toast.error('All fields required');
    if (form.newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const EyeBtn = ({ field }) => (
    <button onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))} style={{
      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 4,
    }}>{showPw[field] ? '🙈' : '👁️'}</button>
  );

  const strength = form.newPassword.length === 0 ? 0
    : form.newPassword.length < 6 ? 1
    : form.newPassword.length < 10 ? 2 : 3;

  const strengthColors = ['transparent', '#FF5C6A', '#FFB547', '#2ECC9A'];
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong'];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)', zIndex: 999,
        animation: 'fadeIn .2s ease',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000, width: '90%', maxWidth: 440,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        animation: 'slideUp .25s cubic-bezier(.34,1.56,.64,1)',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '24px 28px 20px',
          background: 'linear-gradient(135deg, rgba(255,92,106,0.1), rgba(255,92,106,0.03))',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🔐</div>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: 16, color: 'var(--text)', margin: 0 }}>Change Password</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Choose a strong password for your account</p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface-alt)',
            color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Modal body */}
        <div style={{ padding: 28 }}>
          {/* Current password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw.current ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                style={{ paddingRight: 44 }}
              />
              <EyeBtn field="current" />
            </div>
          </div>

          {/* New password */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw.new ? 'text' : 'password'}
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
                style={{ paddingRight: 44 }}
              />
              <EyeBtn field="new" />
            </div>
          </div>

          {/* Strength bar */}
          {form.newPassword.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 99,
                    background: i <= strength ? strengthColors[strength] : 'var(--border)',
                    transition: 'background .3s',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: strengthColors[strength], fontWeight: 700 }}>{strengthLabels[strength]}</div>
            </div>
          )}

          {/* Confirm password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw.confirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
                style={{
                  paddingRight: 44,
                  borderColor: form.confirmPassword && form.newPassword !== form.confirmPassword ? 'var(--red)' : undefined,
                }}
              />
              <EyeBtn field="confirm" />
            </div>
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <div style={{ marginTop: 5, fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✕</span> Passwords do not match
              </div>
            )}
            {form.confirmPassword && form.newPassword === form.confirmPassword && form.newPassword.length >= 6 && (
              <div style={{ marginTop: 5, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✓</span> Passwords match
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--surface-alt)',
              color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 2, padding: '12px', borderRadius: 12, border: 'none',
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, #FF5C6A, #C03040)',
              color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, transition: 'all .2s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(255,92,106,0.35)',
            }}>
              {loading ? '⏳ Changing...' : '🔐 Change Password'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main ProfilePage ─────────────────────────────────────────────
const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingProfile, setSavingProfile]         = useState(false);
  const [savingPrefs, setSavingPrefs]             = useState(false);
  const [editingName, setEditingName]             = useState(false);

  const [name, setName]           = useState(user?.name || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#2ECC9A');
  const [prefs, setPrefs]         = useState({
    emailNotifications          : user?.preferences?.emailNotifications ?? true,
    showWeeklyChart             : user?.preferences?.dashboardWidgets?.showWeeklyChart ?? true,
    showCategoryBreakdown       : user?.preferences?.dashboardWidgets?.showCategoryBreakdown ?? true,
    showMemberBalances          : user?.preferences?.dashboardWidgets?.showMemberBalances ?? true,
    showShareTracker            : user?.preferences?.dashboardWidgets?.showShareTracker ?? true,
  });

  const handleSaveProfile = async () => {
    if (!name.trim()) return toast.error('Name is required');
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({ name, avatarColor });
      updateUser({ ...user, ...res.data.user });
      toast.success('Profile updated!');
      setEditingName(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSavingProfile(false); }
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const res = await authAPI.updatePreferences({
        emailNotifications: prefs.emailNotifications,
        dashboardWidgets: {
          showWeeklyChart      : prefs.showWeeklyChart,
          showCategoryBreakdown: prefs.showCategoryBreakdown,
          showMemberBalances   : prefs.showMemberBalances,
          showShareTracker     : prefs.showShareTracker,
        },
      });
      updateUser({ ...user, preferences: res.data.preferences });
      toast.success('Preferences saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSavingPrefs(false); }
  };

  const Toggle = ({ label, desc, value, onChange }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '13px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 48, height: 26, borderRadius: 99, border: 'none', flexShrink: 0,
        background: value ? 'var(--accent)' : 'var(--border)',
        cursor: 'pointer', position: 'relative', transition: 'background .25s',
        boxShadow: value ? '0 0 12px rgba(46,204,154,0.4)' : 'none',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 25 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left .25s cubic-bezier(.34,1.56,.64,1)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        }} />
      </button>
    </div>
  );

  const roleConfig = {
    admin    : { label: 'Admin',     icon: '👑', bg: 'rgba(46,204,154,0.12)',  color: '#2ECC9A' },
    'co-admin': { label: 'Co-Admin', icon: '⭐', bg: 'rgba(255,181,71,0.12)',  color: '#FFB547' },
    member   : { label: 'Member',    icon: '👤', bg: 'rgba(91,141,239,0.12)',  color: '#5B8DEF' },
  };
  const role = roleConfig[user?.role] || roleConfig.member;

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translate(-50%,-45%)} to{opacity:1;transform:translate(-50%,-50%)} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .color-swatch:hover { transform: scale(1.3) !important; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.15) !important; }
        .save-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
      `}</style>

      <div style={{ maxWidth: 780, animation: 'fadeIn .4s ease' }}>

        {/* ── Hero Banner ─────────────────────────────────────── */}
        <div style={{
          borderRadius: 24, overflow: 'hidden', marginBottom: 24,
          background: `linear-gradient(135deg, ${avatarColor}22, ${avatarColor}08, var(--surface))`,
          border: `1px solid ${avatarColor}33`,
          position: 'relative',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `${avatarColor}0A`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: `${avatarColor}08`, pointerEvents: 'none' }} />

          <div style={{ padding: '32px 32px 28px', position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', animation: 'float 4s ease-in-out infinite' }}>
              <Avatar name={name || user?.name} size={88} color={avatarColor} />
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--accent)', border: '3px solid var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
              }}>✓</div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <input value={name} onChange={e => setName(e.target.value)}
                    autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                    style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: 'var(--surface)', border: '2px solid var(--accent)', borderRadius: 10, padding: '8px 12px', color: 'var(--text)', width: 200 }} />
                  <button onClick={handleSaveProfile} disabled={savingProfile} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                    {savingProfile ? '...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditingName(false); setName(user?.name); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: 0 }}>{user?.name}</h2>
                  <button onClick={() => setEditingName(true)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✏️ Edit</button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
                <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 99, fontWeight: 800, background: role.bg, color: role.color, letterSpacing: 0.5 }}>
                  {role.icon} {role.label}
                </span>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
                {[
                  { label: 'Balance', value: `${user?.balance >= 0 ? '+' : ''}Rs. ${user?.balance?.toLocaleString() || 0}`, color: user?.balance >= 0 ? '#2ECC9A' : '#FF5C6A' },
                  { label: 'Account', value: 'Active', color: '#2ECC9A' },
                  { label: 'Role', value: role.label, color: role.color },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{
                    padding: '10px 16px', borderRadius: 12, transition: 'all .2s',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: s.color, fontFamily: "'DM Sans', sans-serif" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Two column layout ────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

          {/* LEFT: Avatar Color + Security */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Avatar Color Picker */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${avatarColor}22`, border: `1px solid ${avatarColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎨</div>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Avatar Color</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pick your signature color</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                {COLORS.map(c => (
                  <button key={c} className="color-swatch" onClick={() => setAvatarColor(c)} style={{
                    width: 36, height: 36, borderRadius: '50%', background: c,
                    border: avatarColor === c ? `3px solid var(--text)` : '3px solid transparent',
                    cursor: 'pointer', outline: avatarColor === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 3, transition: 'transform .15s',
                    transform: avatarColor === c ? 'scale(1.2)' : 'scale(1)',
                  }} />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: `${avatarColor}11`, border: `1px solid ${avatarColor}33`, marginBottom: 16 }}>
                <Avatar name={name || user?.name} size={40} color={avatarColor} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Preview</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>How others see you</div>
                </div>
              </div>

              <button className="save-btn" onClick={handleSaveProfile} disabled={savingProfile} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}CC)`,
                color: '#000', fontWeight: 800, cursor: savingProfile ? 'not-allowed' : 'pointer',
                fontSize: 14, transition: 'all .2s',
                boxShadow: `0 4px 20px ${avatarColor}44`,
                opacity: savingProfile ? 0.7 : 1,
              }}>
                {savingProfile ? '⏳ Saving...' : '✓ Save Changes'}
              </button>
            </div>

            {/* Security */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,92,106,0.12)', border: '1px solid rgba(255,92,106,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔒</div>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Security</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Manage your password</div>
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,92,106,0.06)', border: '1px solid rgba(255,92,106,0.15)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Password</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 2 }}>••••••••••••</div>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2ECC9A', boxShadow: '0 0 8px #2ECC9A' }} />
                </div>
              </div>

              <button onClick={() => setShowPasswordModal(true)} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #FF5C6A, #C03040)',
                color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14,
                boxShadow: '0 4px 20px rgba(255,92,106,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <span>🔐</span>
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Preferences */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(91,141,239,0.12)', border: '1px solid rgba(91,141,239,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚙️</div>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Preferences</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customize your experience</div>
              </div>
            </div>

            {/* Notifications section */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, padding: '8px 0 4px', borderBottom: '2px solid var(--border)' }}>Notifications</div>
            <Toggle
              label="Email Notifications"
              desc="Get notified when expenses or payments are added"
              value={prefs.emailNotifications}
              onChange={v => setPrefs(p => ({ ...p, emailNotifications: v }))}
            />

            {/* Dashboard widgets section */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '20px 0 4px', padding: '8px 0 4px', borderBottom: '2px solid var(--border)' }}>Dashboard Widgets</div>
            <Toggle label="Weekly Chart"         desc="Show spending chart on dashboard" value={prefs.showWeeklyChart}        onChange={v => setPrefs(p => ({ ...p, showWeeklyChart: v }))} />
            <Toggle label="Category Breakdown"   desc="Show pie chart by category"       value={prefs.showCategoryBreakdown}  onChange={v => setPrefs(p => ({ ...p, showCategoryBreakdown: v }))} />
            <Toggle label="Member Balances"      desc="Show member balance cards"        value={prefs.showMemberBalances}     onChange={v => setPrefs(p => ({ ...p, showMemberBalances: v }))} />
            <Toggle label="Admin Share Tracker"  desc="Show your personal share widget"  value={prefs.showShareTracker}       onChange={v => setPrefs(p => ({ ...p, showShareTracker: v }))} />

            <button className="save-btn" onClick={handleSavePrefs} disabled={savingPrefs} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #5B8DEF, #3B5FBF)',
              color: '#fff', fontWeight: 800, cursor: savingPrefs ? 'not-allowed' : 'pointer',
              fontSize: 14, marginTop: 24, transition: 'all .2s',
              boxShadow: '0 4px 20px rgba(91,141,239,0.35)',
              opacity: savingPrefs ? 0.7 : 1,
            }}>
              {savingPrefs ? '⏳ Saving...' : '✓ Save Preferences'}
            </button>
          </div>
        </div>

        {/* Account Info strip */}
        <div style={{ marginTop: 20, padding: '16px 24px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Account ID: </span>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{user?._id?.slice(-8)?.toUpperCase()}</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Member since: </span>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long' }) : 'N/A'}
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Group: </span>
            {user?.groupId?.name || 'N/A'}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
    </>
  );
};

export default ProfilePage;