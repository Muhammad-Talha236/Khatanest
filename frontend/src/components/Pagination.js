// components/Pagination.js
import React from 'react';

const Pagination = ({ current, total, onChange }) => {
  if (total <= 1) return null;
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
      <BtnPage onClick={() => onChange(current - 1)} disabled={current === 1}>←</BtnPage>
      {pages.map((p, i) => (
        p === '...'
          ? <span key={i} style={{ padding: '0 8px', color: 'var(--text-muted)', lineHeight: '36px' }}>…</span>
          : <BtnPage key={p} active={p === current} onClick={() => onChange(p)}>{p}</BtnPage>
      ))}
      <BtnPage onClick={() => onChange(current + 1)} disabled={current === total}>→</BtnPage>
    </div>
  );
};

const BtnPage = ({ children, active, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: 36, height: 36, borderRadius: 8, border: `1px solid ${active ? 'var(--accent-glow)' : 'var(--border)'}`,
    background: active ? 'var(--accent-soft)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: active ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1, fontSize: 13,
  }}>{children}</button>
);

export default Pagination;
