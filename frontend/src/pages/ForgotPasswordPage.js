// pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
      toast.success('Password reset email sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 28, color: 'var(--text)' }}>
            Reset Password
          </h1>
        </div>

        {submitted ? (
          <div style={{ 
            background: 'var(--surface-alt)', 
            border: '1px solid var(--border)', 
            borderRadius: 16, 
            padding: 32,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>Check your email</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              We've sent a password reset link to {email}
            </p>
            <Link to="/login">
              <button style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'var(--accent)', border: 'none',
                color: '#000', fontWeight: 700, cursor: 'pointer'
              }}>
                Back to Login
              </button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 24
          }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', marginBottom: 6, fontSize: 11,
                color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 14
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                border: 'none', background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                color: '#000', fontWeight: 800, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link to="/login" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none' }}>
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;