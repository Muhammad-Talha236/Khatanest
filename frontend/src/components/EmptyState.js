// components/EmptyState.js
import React from 'react';

const EmptyState = ({ icon = '📭', title, message, action }) => (
  <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 18, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14, maxWidth: 360, margin: '0 auto 24px' }}>{message}</div>
    {action}
  </div>
);

export default EmptyState;
