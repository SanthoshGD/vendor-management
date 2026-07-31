import React from 'react';
import { AlertTriangle, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';

export default function DiagnosticTooltip({ diagnosticText, confidence, crossDocMismatch, mismatchNote }) {
  if (!diagnosticText && !crossDocMismatch) return null;

  const isRed = confidence < 60 || crossDocMismatch;

  return (
    <div style={{
      ...styles.tooltipCard,
      borderColor: isRed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)',
      background: isRed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)'
    }}>
      <div style={styles.tooltipHeader}>
        {isRed ? (
          <AlertCircle size={14} color="#EF4444" />
        ) : (
          <AlertTriangle size={14} color="#F59E0B" />
        )}
        <span style={{
          ...styles.tooltipTitle,
          color: isRed ? '#F87171' : '#FBBF24'
        }}>
          {crossDocMismatch ? 'Cross-Document Discrepancy Flag' : 'AI Diagnostic Uncertainty Note'}
        </span>
      </div>

      {diagnosticText && (
        <div style={styles.tooltipBody}>
          {diagnosticText}
        </div>
      )}

      {crossDocMismatch && mismatchNote && (
        <div style={styles.mismatchBox}>
          <strong>Entity Discrepancy:</strong> {mismatchNote}
        </div>
      )}

      <div style={styles.tooltipFooter}>
        <Sparkles size={12} color="#9CA3AF" />
        <span>Press Tab to auto-jump to this exception field. Use Shift+Drag on canvas for Point-Extract OCR.</span>
      </div>
    </div>
  );
}

const styles = {
  tooltipCard: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.78rem'
  },
  tooltipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '600'
  },
  tooltipTitle: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  tooltipBody: {
    color: '#E5E7EB',
    lineHeight: '1.4'
  },
  mismatchBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '6px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem'
  },
  tooltipFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.68rem',
    color: '#9CA3AF',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '4px',
    marginTop: '2px'
  }
};
