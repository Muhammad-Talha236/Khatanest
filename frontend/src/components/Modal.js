// components/Modal.js - Reusable modal with confirmation support
import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 480 }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, backdropFilter: 'blur(4px)',
      animation: 'fadeIn .2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface-alt)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        animation: 'slideUp .25s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 20, color: 'var(--text)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Confirmation modal
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={400}>
    <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
    <div style={{ display: 'flex', gap: 10 }}>
      <button onClick={onClose} style={{
        flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)',
        background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 14,
      }}>Cancel</button>
      <button onClick={onConfirm} disabled={loading} style={{
        flex: 1, padding: '10px', borderRadius: 10, border: 'none',
        background: 'var(--red)', color: '#fff', fontWeight: 800, fontSize: 14,
        opacity: loading ? 0.6 : 1,
      }}>{loading ? 'Deleting...' : confirmText}</button>
    </div>
  </Modal>
);

export default Modal;
