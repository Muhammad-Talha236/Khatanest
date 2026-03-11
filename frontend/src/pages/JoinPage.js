// pages/LoginPage.js — Updated with forgot password link
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</label>
    <input {...props} style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', transition: 'all .2s' }} />
  </div>
);

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [form, setForm]             = useState({ name: '', email: '', password: '', groupName: '' });
  const { login, register }         = useAuth();
  const { isDark, toggleTheme }     = useTheme();
  const navigate                    = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      if (isRegister) {
        if (!form.name) return toast.error('Name is required');
        await register({ name: form.name, email: form.email, password: form.password, groupName: form.groupName });
        toast.success('Account created! Welcome to KhataNest 🎉');
      } else {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -5%, var(--accent-soft), transparent)', position: 'relative' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Theme toggle */}
        <button onClick={toggleTheme} style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <span>{isDark ? '☀️' : '🌙'}</span><span>{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, margin: '0 auto 14px', background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900, color: '#000', boxShadow: '0 0 50px rgba(46,204,154,0.3)' }}>K</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 34, color: 'var(--text)', margin: 0, letterSpacing: -1 }}>KhataNest</h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 14 }}>Hostel Expense Management</p>
        </div>

        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 20, padding: 28 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {['Login', 'Register'].map(t => (
              <button key={t} onClick={() => setIsRegister(t === 'Register')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all .2s', background: (isRegister ? t === 'Register' : t === 'Login') ? 'var(--accent-soft)' : 'transparent', color: (isRegister ? t === 'Register' : t === 'Login') ? 'var(--accent)' : 'var(--text-muted)' }}>{t}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && <Input label="Full Name" type="text" placeholder="Ali Raza" value={form.name} onChange={set('name')} required />}
            <Input label="Email Address" type="email" placeholder="ali@hostel.com" value={form.email} onChange={set('email')} required />
            <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
            {isRegister && <Input label="Group / Hostel Name" type="text" placeholder="My Hostel Group" value={form.groupName} onChange={set('groupName')} />}

            {/* ✅ NEW: Forgot password link */}
            {!isRegister && (
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', marginTop: 4, background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', color: '#000', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 20px rgba(46,204,154,0.3)', opacity: loading ? 0.7 : 1, transition: 'opacity .2s' }}>
              {loading ? 'Please wait...' : (isRegister ? 'Create Account & Group' : 'Login to KhataNest')}
            </button>
          </form>

          {!isRegister && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
              Demo: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>admin@hostel.com</span> / <span style={{ color: 'var(--accent)', fontWeight: 600 }}>admin123</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;