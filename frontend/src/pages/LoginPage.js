// pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [form, setForm]             = useState({ name: '', email: '', password: '', groupName: '' });
  const [showPw, setShowPw]         = useState(false);
  const { login, register }         = useAuth();
  const navigate                    = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Email aur password daalo');
    if (form.password.length < 6) return toast.error('Password kam se kam 6 characters ka hona chahiye');
    if (isRegister && !form.name) return toast.error('Naam daalo');

    setLoading(true);
    try {
      if (isRegister) {
        await register({ name: form.name, email: form.email, password: form.password, groupName: form.groupName });
        toast.success('Account ban gaya! KhataNest mein khush aamdeed 🎉');
      } else {
        await login(form.email, form.password);
        toast.success('Login ho gaye!');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kuch galat hua, dobara try karo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -5%, var(--accent-soft), transparent)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900, color: '#000',
            boxShadow: '0 0 50px rgba(46,204,154,0.3)',
          }}>K</div>
          <h1 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 900, fontSize: 30,
            color: 'var(--text)', margin: 0, letterSpacing: -0.5,
          }}>KhataNest</h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 13 }}>
            Hostel Expense Management
          </p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20, padding: 28,
        }}>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'var(--surface-alt)',
            borderRadius: 10, padding: 4, marginBottom: 24,
          }}>
            {['Login', 'Register'].map(t => (
              <button key={t} onClick={() => setIsRegister(t === 'Register')} style={{
                flex: 1, padding: '9px', borderRadius: 8,
                border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all .2s',
                background: (isRegister ? t === 'Register' : t === 'Login')
                  ? 'var(--accent-soft)' : 'transparent',
                color: (isRegister ? t === 'Register' : t === 'Login')
                  ? 'var(--accent)' : 'var(--text-muted)',
              }}>{t}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>

            {/* Name — Register only */}
            {isRegister && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Ali Raza"
                  value={form.name}
                  onChange={set('name')}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="ali@example.com"
                value={form.email}
                onChange={set('email')}
                required
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 4 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 16,
                    color: 'var(--text-muted)',
                  }}
                >{showPw ? '🙈' : '👁️'}</button>
              </div>
            </div>

            {/* ✅ Forgot Password link — Login mode only */}
            {!isRegister && (
              <div style={{ textAlign: 'right', marginBottom: 20, marginTop: 8 }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 12,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Password bhool gaye? Reset karo
                </Link>
              </div>
            )}

            {/* Group Name — Register only */}
            {isRegister && (
              <div style={{ marginBottom: 20, marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Group / Hostel Name
                </label>
                <input
                  type="text"
                  placeholder="Mera Hostel Group"
                  value={form.groupName}
                  onChange={set('groupName')}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              borderRadius: 12, border: 'none',
              marginTop: isRegister ? 0 : 0,
              background: loading
                ? 'var(--border)'
                : 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
              color: loading ? 'var(--text-muted)' : '#000',
              fontWeight: 800, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: loading ? 'none' : '0 4px 20px rgba(46,204,154,0.3)',
              transition: 'all .2s',
            }}>
              {loading
                ? '⏳ Please wait...'
                : isRegister ? '🚀 Account Banao' : '🔐 Login Karo'
              }
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        {!isRegister && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
            Demo:{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>admin@hostel.com</span>
            {' / '}
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>admin123</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;