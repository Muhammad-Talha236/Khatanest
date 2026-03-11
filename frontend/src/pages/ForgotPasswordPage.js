// pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── Forgot Password Page ─────────────────────────────────────────
export const ForgotPasswordPage = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Email daalo');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900, color: '#000',
            boxShadow: '0 0 50px rgba(46,204,154,0.3)',
          }}>K</div>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>
            Password Reset
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 13 }}>
            KhataNest · Hostel Expense Management
          </p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20, padding: 28,
        }}>
          {sent ? (
            /* ── Success State ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>📧</div>
              <h3 style={{
                fontFamily: "'DM Sans', sans-serif", fontWeight: 800,
                fontSize: 18, color: 'var(--text)', marginBottom: 10,
              }}>Email Bhej Di!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8, lineHeight: 1.7 }}>
                Agar <strong style={{ color: 'var(--accent)' }}>{email}</strong> registered hai to reset link bhej di gayi hai.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 28, lineHeight: 1.6 }}>
                ⏰ Link <strong style={{ color: 'var(--text)' }}>15 minutes</strong> mein expire ho jaayega.<br/>
                Spam folder bhi check karo.
              </p>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                  color: '#000', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>
                  ← Login par wapas jao
                </button>
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
            <form onSubmit={handleSubmit}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Apni registered email daalo — hum reset link bhej denge.
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', marginBottom: 6,
                  fontSize: 11, color: 'var(--text-muted)',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
                }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ali@example.com"
                  required
                  autoFocus
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: loading ? 'var(--border)' : 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                color: loading ? 'var(--text-muted)' : '#000',
                fontWeight: 800, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: loading ? 'none' : '0 4px 20px rgba(46,204,154,0.3)',
                transition: 'all .2s',
              }}>
                {loading ? '⏳ Bhej rahe hain...' : '📧 Reset Link Bhejo'}
              </button>

              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
                Yaad aa gaya?{' '}
                <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
                  Login karo
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Reset Password Page ──────────────────────────────────────────
export const ResetPasswordPage = () => {
  const { token }    = require('react-router-dom').useParams();
  const navigate     = require('react-router-dom').useNavigate();
  const [form, setForm]       = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [showPw, setShowPw]   = useState({ password: false, confirm: false });

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3;
  const strengthColors = ['transparent', '#FF5C6A', '#FFB547', '#2ECC9A'];
  const strengthLabels = ['', 'Kamzor', 'Theek Hai', 'Mazboot'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password kam se kam 6 characters ka hona chahiye');
    if (form.password !== form.confirm) return toast.error('Passwords match nahi kar rahe');
    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.password);
      setDone(true);
      toast.success('Password reset ho gaya!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Link expire ho gaya hoga — dobara try karo');
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900, color: '#000',
            boxShadow: '0 0 50px rgba(46,204,154,0.3)',
          }}>K</div>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>
            Naya Password
          </h1>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20, padding: 28,
        }}>
          {done ? (
            /* ── Success ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, color: 'var(--accent)', fontSize: 18, marginBottom: 8 }}>
                Password Reset Ho Gaya!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>
                Ab login kar sakte ho naye password se.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                3 seconds mein login page par ja rahe hain...
              </p>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Naya password daalo — kam se kam 6 characters.
              </p>

              {/* New Password */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Naya Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw.password ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    required
                    style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, password: !p.password }))} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)',
                  }}>{showPw.password ? '🙈' : '👁️'}</button>
                </div>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
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
                  <div style={{ fontSize: 11, color: strengthColors[strength], fontWeight: 700 }}>
                    {strengthLabels[strength]}
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Dobara daalo"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box', paddingRight: 44,
                      borderColor: form.confirm && form.password !== form.confirm ? 'var(--red)' : undefined,
                    }}
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)',
                  }}>{showPw.confirm ? '🙈' : '👁️'}</button>
                </div>
                {form.confirm && form.password !== form.confirm && (
                  <div style={{ marginTop: 5, fontSize: 12, color: 'var(--red)' }}>✕ Passwords match nahi kar rahe</div>
                )}
                {form.confirm && form.password === form.confirm && form.password.length >= 6 && (
                  <div style={{ marginTop: 5, fontSize: 12, color: 'var(--accent)' }}>✓ Passwords match kar rahe hain</div>
                )}
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: loading ? 'var(--border)' : 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                color: loading ? 'var(--text-muted)' : '#000',
                fontWeight: 800, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: loading ? 'none' : '0 4px 20px rgba(46,204,154,0.3)',
                transition: 'all .2s',
              }}>
                {loading ? '⏳ Reset ho raha hai...' : '🔐 Password Reset Karo'}
              </button>

              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
                <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
                  ← Login par wapas jao
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};