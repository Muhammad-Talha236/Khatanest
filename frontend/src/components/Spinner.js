// components/Spinner.js
import React from 'react';

const Spinner = ({ size = 40, message }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
    <div style={{
      width: size, height: size, border: `3px solid var(--border)`,
      borderTopColor: 'var(--accent)', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
    {message && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</div>}
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);

export default Spinner;
