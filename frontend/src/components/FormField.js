// components/FormField.js - Reusable form field
import React from 'react';

const FormField = ({ label, error, children, required }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label style={{
        display: 'block', marginBottom: 6, fontSize: 11,
        color: 'var(--text-muted)', fontWeight: 700,
        letterSpacing: 0.8, textTransform: 'uppercase',
      }}>
        {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
    )}
    {children}
    {error && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
  </div>
);

export default FormField;
