import React, { useState, useMemo } from 'react';
import { useApp } from '../context/NexusContext';
import { 
  History, Search, Filter, Cpu, CheckCircle2, AlertTriangle, 
  ArrowRight, ShieldCheck, UserCheck, Terminal, ExternalLink, Calendar, HardDrive, Crop
} from 'lucide-react';

export default function Screen3AuditLog() {
  const { auditLogs } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('ALL');
  const [activeAuditDetail, setActiveAuditDetail] = useState(auditLogs[0] || null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.vendor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.field_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.override_reason_taxonomy || log.override_reason).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedActionType === 'ALL' || log.action_type === selectedActionType;

      return matchesSearch && matchesType;
    });
  }, [auditLogs, searchTerm, selectedActionType]);

  return (
    <div style={styles.container}>
      {/* Control Header */}
      <div style={styles.controlHeader}>
        <div style={styles.headerTitleGroup}>
          <History size={20} color="#1A73E8" />
          <div>
            <h2 style={styles.title}>Immutable Audit & Compliance History</h2>
            <p style={styles.subtitle}>Complete event stream of all AI recommendations, human decisions, override taxonomies, and visual diff micro-states.</p>
          </div>
        </div>

        <div style={styles.filterGroup}>
          <div style={styles.searchWrapper}>
            <Search size={14} color="#5F6368" />
            <input
              type="text"
              placeholder="Search vendor, field, or taxonomy reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterItem}>
            <Filter size={14} color="#5F6368" />
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              style={styles.selectInput}
            >
              <option value="ALL">All Event Actions</option>
              <option value="FIELD_OVERRIDE">Field Overrides</option>
              <option value="DECISION_SUBMIT">Decision Submissions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Feed & Detail Inspector Grid */}
      <div style={styles.gridContainer}>
        {/* Left: Audit Log Feed Cards */}
        <div style={styles.feedColumn}>
          <div style={styles.feedTitle}>Event Stream ({filteredLogs.length} Logged Records)</div>

          <div style={styles.feedListScroll}>
            {filteredLogs.map((log) => {
              const isSelected = activeAuditDetail?.id === log.id;

              return (
                <div
                  key={log.id}
                  style={{
                    ...styles.auditCard,
                    ...(isSelected ? styles.auditCardSelected : {})
                  }}
                  onClick={() => setActiveAuditDetail(log)}
                >
                  <div style={styles.cardHeaderRow}>
                    <span style={styles.auditIdTag} className="font-mono-metadata">{log.audit_id || log.id}</span>
                    <span style={styles.timestampTag} className="font-mono-metadata">
                      <Calendar size={12} />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div style={styles.vendorRow}>
                    <span style={styles.vendorName}>{log.vendor_name}</span>
                    <span style={styles.vendorId} className="font-mono-metadata">{log.vendor_id}</span>
                  </div>

                  {/* 5 Required Elements: AI Rec, Human Decision, Override Taxonomy, Timestamp, User ID */}
                  {/* Embedded Visual Diff Snippet: Red Strikethrough vs Green New Value */}
                  <div style={styles.visualDiffContainer}>
                    <div style={styles.diffHeader}>
                      <span style={styles.diffFieldLabel}>{log.field_label}</span>
                      <span style={styles.taxonomyBadge}>{log.override_reason_taxonomy || log.override_reason}</span>
                    </div>

                    <div style={styles.diffComparisonBox}>
                      <div style={styles.oldValueBox}>
                        <span style={styles.diffValueLabel}>AI Recommendation</span>
                        <span style={styles.oldValueText} className="font-mono-extracted">{log.ai_recommendation || log.original_ai_value}</span>
                      </div>

                      <div style={styles.arrowIconBox}>
                        <ArrowRight size={14} color="#1A73E8" />
                      </div>

                      <div style={styles.newValueBox}>
                        <span style={styles.diffValueLabel}>Human Decision</span>
                        <span style={styles.newValueText} className="font-mono-extracted">{log.human_decision || log.human_value}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.cardFooterRow}>
                    <div style={styles.userInfoTag}>
                      <UserCheck size={12} color="#5F6368" />
                      <span className="font-mono-metadata">{log.user_id} ({log.user_name})</span>
                    </div>
                    <div style={styles.ipTag} className="font-mono-metadata">
                      IP: {log.user_ip}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Deep Inspection Panel & Cropped PDF Region */}
        <div style={styles.detailColumn}>
          {activeAuditDetail ? (
            <div style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <Cpu size={16} color="#1A73E8" />
                <span>Audit Inspection & AI Provenance</span>
              </div>

              <div style={styles.detailContentScroll}>
                <div style={styles.detailSection}>
                  <div style={styles.sectionTitle}>Compliance Event Metadata</div>
                  <div style={styles.metaGrid}>
                    <div><span style={styles.metaLabel}>Audit ID:</span> <strong className="font-mono-metadata">{activeAuditDetail.audit_id || activeAuditDetail.id}</strong></div>
                    <div><span style={styles.metaLabel}>Timestamp:</span> <strong className="font-mono-metadata">{activeAuditDetail.timestamp}</strong></div>
                    <div><span style={styles.metaLabel}>Executive User:</span> <strong className="font-mono-metadata">{activeAuditDetail.user_id}</strong></div>
                    <div><span style={styles.metaLabel}>Executive IP:</span> <strong className="font-mono-metadata">{activeAuditDetail.user_ip}</strong></div>
                    <div><span style={styles.metaLabel}>Document File:</span> <strong>{activeAuditDetail.document_name} ({activeAuditDetail.document_id})</strong></div>
                  </div>
                </div>

                {/* Dynamically Cropped PDF Source Region Preview */}
                <div style={styles.cropThumbnailSection}>
                  <div style={styles.sectionTitleHeader}>
                    <Crop size={14} color="#1A73E8" />
                    <span>Source PDF Region Visual Crop ({activeAuditDetail.model_provenance?.bounding_box_coordinates || 'P1_X410_Y680'})</span>
                  </div>
                  <div style={styles.cropContainer}>
                    <div style={styles.cropPaperMock}>
                      <div style={styles.cropHighlightBox}>
                        <div style={styles.cropTextRed} className="font-mono-extracted">{activeAuditDetail.ai_recommendation || activeAuditDetail.original_ai_value}</div>
                        <div style={styles.cropTextGreen} className="font-mono-extracted">{activeAuditDetail.human_decision || activeAuditDetail.human_value}</div>
                      </div>
                    </div>
                    <div style={styles.cropMetaOverlay} className="font-mono-metadata">
                      Bounding Box Coords: {activeAuditDetail.model_provenance?.bounding_box_coordinates || 'P1_X410_Y680'}
                    </div>
                  </div>
                </div>

                {/* AI Provenance Metadata */}
                <div style={styles.detailSection}>
                  <div style={styles.sectionTitle}>AI Extraction Provenance Payload</div>
                  <div style={styles.metaGrid}>
                    <div><span style={styles.metaLabel}>Model Name:</span> <strong style={{ color: '#1A73E8' }}>{activeAuditDetail.model_provenance?.model_name || activeAuditDetail.model_provenance?.model_id}</strong></div>
                    <div><span style={styles.metaLabel}>Model Version:</span> <strong className="font-mono-metadata">{activeAuditDetail.model_provenance?.model_version}</strong></div>
                    <div><span style={styles.metaLabel}>Raw AI Confidence:</span> <strong style={{ color: '#137333' }}>{activeAuditDetail.model_provenance?.raw_score || activeAuditDetail.model_provenance?.raw_confidence}</strong></div>
                    <div><span style={styles.metaLabel}>Inference Latency:</span> <strong className="font-mono-metadata">{activeAuditDetail.model_provenance?.latency_ms || 142} ms</strong></div>
                  </div>
                </div>

                <div style={styles.detailSection}>
                  <div style={styles.sectionTitle}>Executive Compliance Rationale</div>
                  <div style={styles.notesText}>{activeAuditDetail.override_notes}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.emptyDetail}>
              <HardDrive size={40} color="#5F6368" />
              <p>Select any audit record on the left to inspect detailed micro-state diffs, visual crop previews, and AI provenance payload.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: 'calc(100vh - 67px)',
    overflow: 'hidden'
  },
  controlHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--surface-panel)',
    padding: '14px 20px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-subtle)'
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  subtitle: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    marginTop: '2px'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--surface-base)',
    border: '1px solid var(--border-medium)',
    borderRadius: '6px',
    padding: '6px 12px',
    width: '280px'
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '0.82rem',
    width: '100%'
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--surface-base)',
    border: '1px solid var(--border-medium)',
    borderRadius: '6px',
    padding: '5px 10px'
  },
  selectInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '0.8rem'
  },
  gridContainer: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '16px',
    overflow: 'hidden'
  },
  feedColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflow: 'hidden'
  },
  feedTitle: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  feedListScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px'
  },
  auditCard: {
    background: 'var(--surface-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  auditCardSelected: {
    background: 'rgba(26, 115, 232, 0.04)',
    border: '1px solid var(--primary-500)',
    boxShadow: '0 0 0 2px rgba(26, 115, 232, 0.15)'
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  auditIdTag: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--primary-500)',
    background: 'rgba(26, 115, 232, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  timestampTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: 'var(--text-secondary)'
  },
  vendorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  vendorName: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  vendorId: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  visualDiffContainer: {
    background: 'var(--surface-base)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  diffHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  diffFieldLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  taxonomyBadge: {
    fontSize: '0.68rem',
    fontWeight: '600',
    background: '#FEF7E0',
    color: '#B06000',
    border: '1px solid #FCE8E6',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  diffComparisonBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px'
  },
  oldValueBox: {
    flex: 1,
    background: '#FCE8E6',
    border: '1px solid #FAD2CF',
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column'
  },
  newValueBox: {
    flex: 1,
    background: '#E6F4EA',
    border: '1px solid #CEEAD6',
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column'
  },
  diffValueLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  oldValueText: {
    fontSize: '0.8rem',
    color: '#C5221F',
    textDecoration: 'line-through',
    fontWeight: '600'
  },
  newValueText: {
    fontSize: '0.8rem',
    color: '#137333',
    fontWeight: '600'
  },
  arrowIconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardFooterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    color: 'var(--text-secondary)'
  },
  userInfoTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  detailColumn: {
    height: '100%',
    overflow: 'hidden'
  },
  detailCard: {
    height: '100%',
    background: 'var(--surface-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 18px',
    background: 'var(--surface-base)',
    borderBottom: '1px solid var(--border-subtle)',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  detailContentScroll: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto'
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'var(--surface-base)',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)'
  },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--primary-500)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  sectionTitleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--primary-500)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    fontSize: '0.8rem',
    color: 'var(--text-primary)'
  },
  metaLabel: {
    color: 'var(--text-secondary)'
  },
  cropThumbnailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'var(--surface-base)',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)'
  },
  cropContainer: {
    background: '#FFFFFF',
    borderRadius: '6px',
    padding: '16px',
    border: '1px solid var(--border-medium)',
    position: 'relative',
    overflow: 'hidden'
  },
  cropPaperMock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cropHighlightBox: {
    border: '2px solid #1A73E8',
    background: 'rgba(26, 115, 232, 0.1)',
    padding: '8px 16px',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  cropTextRed: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#C5221F',
    textDecoration: 'line-through'
  },
  cropTextGreen: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#137333'
  },
  cropMetaOverlay: {
    marginTop: '8px',
    fontSize: '0.68rem',
    color: 'var(--text-secondary)',
    textAlign: 'center'
  },
  notesText: {
    fontSize: '0.82rem',
    color: 'var(--text-primary)',
    lineHeight: '1.4'
  },
  emptyDetail: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-secondary)',
    gap: '12px'
  }
};
