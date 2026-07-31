import React, { useState, useMemo } from 'react';
import { useApp } from '../context/NexusContext';
import { 
  Clock, AlertTriangle, CheckCircle2, Search, Filter, ArrowUpDown, 
  ExternalLink, FileWarning, ShieldAlert, Sparkles, Building2, Globe, TrendingUp
} from 'lucide-react';

export default function Screen1VendorQueue() {
  const { metrics, vendors, selectVendorForReview } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('RISK_DESC');

  // Filtered & Sorted Vendors
  const filteredVendors = useMemo(() => {
    return vendors
      .filter(vendor => {
        const matchesSearch = 
          vendor.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendor.vendor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendor.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCountry = selectedCountry === 'ALL' || vendor.country === selectedCountry;
        const matchesStatus = selectedStatus === 'ALL' || vendor.status === selectedStatus;

        return matchesSearch && matchesCountry && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'RISK_DESC') return b.overall_ai_risk_score - a.overall_ai_risk_score;
        if (sortBy === 'RISK_ASC') return a.overall_ai_risk_score - b.overall_ai_risk_score;
        if (sortBy === 'SLA_ASC') return a.sla_time_remaining_hours - b.sla_time_remaining_hours;
        if (sortBy === 'DOCS_DESC') return b.documents_uploaded - a.documents_uploaded;
        return 0;
      });
  }, [vendors, searchTerm, selectedCountry, selectedStatus, sortBy]);

  const countriesList = useMemo(() => {
    const set = new Set(vendors.map(v => v.country));
    return Array.from(set);
  }, [vendors]);

  return (
    <div style={styles.container}>
      {/* 1. Header Metrics Dashboard */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Target SLA Clock</span>
            <Clock size={18} color="#1A73E8" />
          </div>
          <div style={styles.metricValue}>48h <span style={styles.metricSub}>Max Target</span></div>
          <div style={styles.metricFooter}>
            <span style={{ color: '#137333', fontWeight: '600' }}>{metrics.slaComplianceRate}% SLA On-Time</span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Pending Reviews</span>
            <Building2 size={18} color="#B06000" />
          </div>
          <div style={styles.metricValue}>{metrics.pendingReviewCount} <span style={styles.metricSub}>Applications</span></div>
          <div style={styles.metricFooter}>
            <span>{metrics.dailyVolume}</span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Auto-Flagged Anomalies</span>
            <ShieldAlert size={18} color="#C5221F" />
          </div>
          <div style={styles.metricValue}>{metrics.autoFlaggedAnomalies} <span style={styles.metricSub}>Critical</span></div>
          <div style={styles.metricFooter}>
            <span style={{ color: '#C5221F' }}>Discrepancies require human review</span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Avg Handling Time (AHT)</span>
            <TrendingUp size={18} color="#137333" />
          </div>
          <div style={styles.metricValue}>{metrics.avgHandlingTimeMins}m <span style={styles.metricSub}>/ application</span></div>
          <div style={styles.metricFooter}>
            <span style={{ color: '#137333' }}>71% faster vs manual review</span>
          </div>
        </div>
      </div>

      {/* 2. Control Bar (Filter, Search, Sort) */}
      <div style={styles.controlBar}>
        <div style={styles.searchWrapper}>
          <Search size={16} color="#5F6368" />
          <input
            type="text"
            placeholder="Search vendor name, ID, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <div style={styles.filterItem}>
            <Globe size={14} color="#5F6368" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              style={styles.selectInput}
            >
              <option value="ALL">All Countries</option>
              {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={styles.filterItem}>
            <Filter size={14} color="#5F6368" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.selectInput}
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_DOCS">Pending Docs</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div style={styles.filterItem}>
            <ArrowUpDown size={14} color="#5F6368" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.selectInput}
            >
              <option value="RISK_DESC">Sort: AI Risk Score (High → Low)</option>
              <option value="RISK_ASC">Sort: AI Risk Score (Low → High)</option>
              <option value="SLA_ASC">Sort: SLA Time (Urgent First)</option>
              <option value="DOCS_DESC">Sort: Documents Uploaded</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. High-Density Vendor Data Table (32px-40px row height, sticky header) */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Vendor ID</th>
              <th style={styles.th}>Legal Entity Name</th>
              <th style={styles.th}>Country</th>
              <th style={styles.th}>Product Category</th>
              <th style={styles.th}>AI Risk Score (0-100)</th>
              <th style={styles.th}>Doc Completeness</th>
              <th style={styles.th}>SLA Deadline</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map(vendor => {
              const riskColorClass = 
                vendor.overall_ai_risk_score >= 80 ? 'red' :
                vendor.overall_ai_risk_score >= 50 ? 'amber' : 'green';

              const isSlaUrgent = vendor.sla_time_remaining_hours <= 12;

              return (
                <tr key={vendor.vendor_id} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.vendorIdTag}>{vendor.vendor_id}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.vendorName}>{vendor.legal_name}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.countryPill}>
                      {vendor.country}
                    </div>
                  </td>
                  <td style={styles.td}>{vendor.category}</td>
                  <td style={styles.td}>
                    <span className={`badge-confidence ${riskColorClass}`}>
                      {vendor.overall_ai_risk_score} / 100
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.docCountBadge}>
                      {vendor.documents_uploaded} / {vendor.documents_mandatory_total} Docs
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{
                      ...styles.slaTimer,
                      color: isSlaUrgent ? '#C5221F' : 'var(--text-secondary)'
                    }}>
                      <Clock size={13} />
                      <span>{vendor.sla_time_remaining_hours}h remaining</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={vendor.status} />
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <button
                      onClick={() => selectVendorForReview(vendor.vendor_id)}
                      style={styles.reviewCta}
                    >
                      <span>Start Review</span>
                      <ExternalLink size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    IN_REVIEW: { label: 'In Review', bg: 'rgba(26, 115, 232, 0.1)', color: '#1A73E8', border: 'rgba(26, 115, 232, 0.25)' },
    APPROVED: { label: 'Approved', bg: '#E6F4EA', color: '#137333', border: '#CEEAD6' },
    PENDING_DOCS: { label: 'Pending Docs', bg: '#FEF7E0', color: '#B06000', border: '#FCE8E6' },
    REJECTED: { label: 'Rejected', bg: '#FCE8E6', color: '#C5221F', border: '#FAD2CF' },
    ESCALATED: { label: 'Escalated', bg: 'rgba(168, 85, 247, 0.12)', color: '#9333EA', border: 'rgba(168, 85, 247, 0.25)' }
  };
  const conf = map[status] || map.IN_REVIEW;

  return (
    <span style={{
      fontSize: '0.72rem',
      fontWeight: '600',
      padding: '3px 8px',
      borderRadius: '4px',
      background: conf.bg,
      color: conf.color,
      border: `1px solid ${conf.border}`,
      display: 'inline-block'
    }}>
      {conf.label}
    </span>
  );
}

const styles = {
  container: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: 'calc(100vh - 67px)',
    overflowY: 'auto'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  metricCard: {
    background: 'var(--surface-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: 'var(--shadow-subtle)'
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  metricTitle: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px'
  },
  metricSub: {
    fontSize: '0.78rem',
    fontWeight: '400',
    color: 'var(--text-muted)'
  },
  metricFooter: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)'
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    background: 'var(--surface-panel)',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)'
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--surface-base)',
    border: '1px solid var(--border-medium)',
    borderRadius: '6px',
    padding: '6px 12px',
    width: '320px'
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '0.82rem',
    width: '100%'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
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
    fontSize: '0.8rem',
    cursor: 'pointer'
  },
  tableCard: {
    background: 'var(--surface-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-panel)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '10px 14px',
    fontSize: '0.72rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--surface-base)',
    position: 'sticky',
    top: 0
  },
  tr: {
    borderBottom: '1px solid var(--border-subtle)',
    height: '38px' // High density row height spec (32px-40px)
  },
  td: {
    padding: '8px 14px',
    fontSize: '0.82rem',
    color: 'var(--text-primary)',
    verticalAlign: 'middle'
  },
  vendorIdTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: '600',
    fontSize: '0.78rem',
    color: 'var(--primary-500)',
    background: 'rgba(26, 115, 232, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  vendorName: {
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  countryPill: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: '500',
    background: 'var(--surface-base)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)'
  },
  docCountBadge: {
    fontSize: '0.78rem',
    fontWeight: '500',
    color: 'var(--text-secondary)'
  },
  slaTimer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.78rem',
    fontWeight: '500'
  },
  reviewCta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '6px',
    background: 'var(--primary-500)',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: '600',
    fontSize: '0.78rem',
    cursor: 'pointer'
  }
};
