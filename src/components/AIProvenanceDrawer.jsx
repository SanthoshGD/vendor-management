import React from 'react';
import { useApp } from '../context/AppContext';
import { Cpu, X, Box, Clock, ShieldCheck, Terminal, Copy, Check } from 'lucide-react';

export default function AIProvenanceDrawer() {
  const { provenanceDrawerData, setProvenanceDrawerData } = useApp();
  const [copied, setCopied] = React.useState(false);

  if (!provenanceDrawerData) return null;

  const field = provenanceDrawerData;
  const box = field.box || { ymin: 20, xmin: 25, ymax: 27, xmax: 75 };

  const rawJson = {
    field_key: field.key,
    field_label: field.label,
    extracted_value: field.value,
    confidence_score: (field.confidence / 100).toFixed(3),
    bounding_box_percent: {
      ymin: box.ymin,
      xmin: box.xmin,
      ymax: box.ymax,
      xmax: box.xmax
    },
    bounding_box_pixels: {
      ymin: Math.round(box.ymin * 8.8),
      xmin: Math.round(box.xmin * 6.8),
      ymax: Math.round(box.ymax * 8.8),
      xmax: Math.round(box.xmax * 6.8)
    },
    ai_model_provenance: {
      model_id: "StyleSphere-OCR-Engine-v3.4-prod",
      model_version: "2026.04.1-patch2",
      model_architecture: "Multimodal Transformer OCR + LayoutLMv3",
      inference_latency_ms: 142,
      execution_timestamp: "2026-07-26T14:32:04.112Z"
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(rawJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.drawerOverlay} onClick={() => setProvenanceDrawerData(null)}>
      <div style={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Cpu size={18} color="#6366F1" />
            <span>Deep AI Provenance & Coordinate Metadata</span>
          </div>
          <button style={styles.closeBtn} onClick={() => setProvenanceDrawerData(null)}>
            <X size={16} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.metaRow}>
            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>TARGET FIELD</span>
              <span style={styles.metaValue}>{field.label}</span>
            </div>
            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>MODEL INFERENCE ID</span>
              <span style={styles.metaValueMono}>StyleSphere-OCR-v3.4</span>
            </div>
          </div>

          <div style={styles.metaRow}>
            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>RAW AI CONFIDENCE</span>
              <span style={styles.metaValueScore}>{(field.confidence / 100).toFixed(3)} ({field.confidence}%)</span>
            </div>
            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>INFERENCE LATENCY</span>
              <span style={styles.metaValue}>142 ms</span>
            </div>
          </div>

          {/* Bounding Box Coordinates */}
          <div style={styles.coordCard}>
            <div style={styles.coordHeader}>
              <Box size={14} color="#818CF8" />
              <span>Pixel & Viewport Bounding Box Coordinates</span>
            </div>
            <div style={styles.coordGrid}>
              <div>ymin: <strong className="font-mono">{box.ymin}%</strong> ({Math.round(box.ymin * 8.8)}px)</div>
              <div>xmin: <strong className="font-mono">{box.xmin}%</strong> ({Math.round(box.xmin * 6.8)}px)</div>
              <div>ymax: <strong className="font-mono">{box.ymax}%</strong> ({Math.round(box.ymax * 8.8)}px)</div>
              <div>xmax: <strong className="font-mono">{box.xmax}%</strong> ({Math.round(box.xmax * 6.8)}px)</div>
            </div>
          </div>

          {/* Raw JSON Provenance Inspector */}
          <div style={styles.jsonCard}>
            <div style={styles.jsonHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} color="#10B981" />
                <span>Raw Model Provenance Payload</span>
              </div>
              <button style={styles.copyBtn} onClick={handleCopy}>
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre style={styles.jsonPre}>
              {JSON.stringify(rawJson, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end'
  },
  drawerCard: {
    width: '420px',
    height: '100%',
    background: '#111726',
    borderLeft: '1px solid rgba(99, 102, 241, 0.4)',
    boxShadow: '-10px 0 30px rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'rgba(9, 13, 22, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  titleGroup: {
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
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto'
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  metaBox: {
    background: 'rgba(17, 23, 38, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '10px 12px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  metaLabel: {
    fontSize: '0.68rem',
    fontWeight: '600',
    color: '#9CA3AF'
  },
  metaValue: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#F3F4F6'
  },
  metaValueMono: {
    fontSize: '0.78rem',
    color: '#818CF8',
    fontFamily: "'JetBrains Mono', monospace"
  },
  metaValueScore: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#10B981'
  },
  coordCard: {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  coordHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#818CF8'
  },
  coordGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#D1D5DB'
  },
  jsonCard: {
    background: '#090D16',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  jsonHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.04)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '0.75rem',
    color: '#9CA3AF'
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  jsonPre: {
    padding: '12px',
    fontSize: '0.72rem',
    color: '#34D399',
    fontFamily: "'JetBrains Mono', monospace",
    margin: 0,
    overflowX: 'auto',
    maxHeight: '260px'
  }
};
