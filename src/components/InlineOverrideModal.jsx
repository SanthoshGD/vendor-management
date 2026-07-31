import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, Check, X, Sparkles, Edit3 } from 'lucide-react';

export default function InlineOverrideModal({ field, docId, onClose }) {
  const { handleFieldValueChange } = useApp();

  const [newValue, setNewValue] = useState(field.value);
  const [selectedReason, setSelectedReason] = useState('OCR Typo / Low Contrast');
  const [customNotes, setCustomNotes] = useState('');

  const taxonomyOptions = [
    "OCR Typo / Low Contrast",
    "Legal Name Mismatch Across Documents",
    "Expired Certificate / Date Discrepancy",
    "Scan Blur / Stamp Overlay Defect",
    "Updated License Re-issued by Vendor",
    "Regulatory / Currency Format Variance"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    handleFieldValueChange(docId, field.key, newValue, selectedReason, customNotes);
    onClose();
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div style={styles.headerTitle}>
            <Edit3 size={16} color="#6366F1" />
            <span>Inline Field Override & Taxonomy Logger</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Target Field</label>
            <div style={styles.readOnlyField}>{field.label}</div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Original AI Extracted Value</label>
            <div style={styles.aiOldValue}>{field.value}</div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>New Verified Human Value</label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              style={styles.input}
              autoFocus
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <Tag size={14} color="#818CF8" />
              <span>Override Reason Taxonomy (Audit Category)</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={styles.select}
            >
              {taxonomyOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Executive Audit Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cross-referenced with Vietnam Business Registry Certificate #88412..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.saveBtn}>
              <Check size={16} />
              <span>Save & Log Override</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modalCard: {
    width: '460px',
    background: '#111726',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '12px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: 'rgba(9, 13, 22, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.88rem',
    fontWeight: '600',
    color: '#F3F4F6'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer'
  },
  form: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  readOnlyField: {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    fontSize: '0.82rem',
    color: '#D1D5DB',
    fontWeight: '500'
  },
  aiOldValue: {
    padding: '8px 12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '6px',
    fontSize: '0.82rem',
    color: '#F87171',
    textDecoration: 'line-through'
  },
  input: {
    padding: '10px 12px',
    background: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '6px',
    color: '#FFFFFF',
    outline: 'none',
    fontSize: '0.85rem'
  },
  select: {
    padding: '10px 12px',
    background: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '6px',
    color: '#FFFFFF',
    outline: 'none',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px'
  },
  cancelBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'transparent',
    color: '#9CA3AF',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  saveBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#4F46E5',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '0.82rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
  }
};
