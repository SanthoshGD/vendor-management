'use client';

import React, { useState, useMemo } from 'react';
import { useNexus } from '../../../context/NexusContext';
import { 
  Search, ChevronRight, ChevronDown, SlidersHorizontal, Download, 
  Check, X, UserCog, AlertTriangle, CircleDot, LayoutGrid, List
} from 'lucide-react';

const CATEGORY_TAG_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Apparels: { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
  Shoes: { bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' },
  Bags: { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE' },
  Accessories: { bg: '#FDF4FF', color: '#A21CAF', border: '#F5D0FE' },
  Watches: { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
  Jewelry: { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
};

function CategoryTag({ category }: { category: string }) {
  const style = CATEGORY_TAG_STYLES[category] || CATEGORY_TAG_STYLES.Apparels;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = '#FEF3C7';
  let color = '#D97706';
  let border = '#FDE68A';

  if (status === 'Approved' || status === 'Verified' || status === 'Active') {
    bg = '#ECFDF5';
    color = '#059669';
    border = '#A7F3D0';
  } else if (status === 'In Review' || status === 'Doc Review' || status === 'Pending Review') {
    bg = '#F0F9FF';
    color = '#0284C7';
    border = '#BAE6FD';
  } else if (status === 'Rejected') {
    bg = '#FFF1F2';
    color = '#E11D48';
    border = '#FECDD3';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
      }}
    >
      <CircleDot size={9} strokeWidth={3} />
      {status}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const r = risk.toLowerCase();
  const isHigh = r === 'high';
  const isMedium = r === 'medium';
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: isHigh ? '#FFF1F2' : isMedium ? '#FFFBEB' : '#F0F9FF',
        color: isHigh ? '#E11D48' : isMedium ? '#D97706' : '#0369A1',
        border: `1px solid ${isHigh ? '#FECDD3' : isMedium ? '#FDE68A' : '#BAE6FD'}`,
      }}
    >
      {isHigh && <AlertTriangle size={11} />}
      {isHigh ? 'High Risk' : isMedium ? 'Medium Risk' : 'Low Risk'}
    </span>
  );
}

export default function VendorList({ onOpenVendor, onModal }: { onOpenVendor: (id: string, tab?: string) => void; onModal?: (modal: any) => void }) {
  const { vendors, submitDecision, notify } = useNexus();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decided, setDecided] = useState<Record<string, 'approve' | 'reject'>>({});
  const pageSize = 8;

  // Normalize vendors with required columns: Vendor Name, Country, Risk, Status, Assigned Vendor Executive, Submission Date, Priority
  const normalizedVendors = useMemo(() => {
    return vendors.map((v: any, index: number) => {
      const mockDefaults = [
        { company: "Hualong Garment Factory", country: "China", category: "Apparels", stage: "Profile Submitted", supervisor: "Priya Sharma", submitted: "Yesterday, 4:30 PM", risk: "high", priority: "P1 - High" },
        { company: "Dongfang Footwear Export", country: "China", category: "Shoes", stage: "Doc Review", supervisor: "Liu Yanbo", submitted: "Today, 9:15 AM", risk: "low", priority: "P3 - Normal" },
        { company: "Nair Global Exports Pvt. Ltd.", country: "India", category: "Bags", stage: "Doc Review", supervisor: "Elena Rostova", submitted: "Today, 8:00 AM", risk: "high", priority: "P1 - High" },
        { company: "Jinpeng Leather Goods Co.", country: "China", category: "Bags", stage: "Verified", supervisor: "Priya Sharma", submitted: "Today, 10:42 AM", risk: "low", priority: "P3 - Normal" },
        { company: "Anatolian Leather Works", country: "Turkey", category: "Bags", stage: "Profile Approved", supervisor: "Marco B.", submitted: "5 days ago", risk: "low", priority: "P2 - Medium" },
        { company: "Delhi Craft Circle", country: "India", category: "Jewelry", stage: "Products Pending", supervisor: "Priya Sharma", submitted: "3 days ago", risk: "low", priority: "P3 - Normal" },
      ];
      const d = mockDefaults[index % mockDefaults.length];
      return {
        id: v.id,
        name: v.name,
        company: v.company || v.legalName || v.profile?.companyName || d.company,
        country: v.country || v.profile?.country || d.country,
        category: v.category || d.category,
        stage: v.stage || d.stage,
        status: v.finalStatus || v.status || (index === 0 ? 'Pending Review' : index === 1 || index === 2 ? 'In Review' : 'Approved'),
        supervisor: v.owner || d.supervisor,
        submitted: v.submitted || d.submitted,
        risk: (v.risk || d.risk).toLowerCase(),
        priority: d.priority,
      };
    });
  }, [vendors]);

  const filtered = useMemo(() => {
    return normalizedVendors.filter((v: any) => {
      const query = search.toLowerCase();
      const matchesSearch = !search || v.name.toLowerCase().includes(query) || v.company.toLowerCase().includes(query) || v.country.toLowerCase().includes(query) || v.id.toLowerCase().includes(query);
      
      const currentStatus = decided[v.id] ? (decided[v.id] === 'approve' ? 'Approved' : 'Rejected') : v.status;
      
      let matchesFilter = true;
      if (activeFilter === 'Pending Review') matchesFilter = currentStatus === 'Pending Review' || currentStatus === 'Pending';
      else if (activeFilter === 'In Review') matchesFilter = currentStatus === 'In Review' || currentStatus === 'Doc Review';
      else if (activeFilter === 'Approved') matchesFilter = currentStatus === 'Approved' || currentStatus === 'Verified' || currentStatus === 'Active';
      else if (activeFilter === 'Rejected') matchesFilter = currentStatus === 'Rejected';
      else if (activeFilter === 'High Risk') matchesFilter = v.risk === 'high';

      return matchesSearch && matchesFilter;
    });
  }, [normalizedVendors, search, activeFilter, decided]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const decide = (id: string, action: 'approve' | 'reject') => {
    setDecided((prev) => ({ ...prev, [id]: action }));
  };

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r: any) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPageSelected) pageRows.forEach((r: any) => next.delete(r.id));
    else pageRows.forEach((r: any) => next.add(r.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const filterTabs = ['All', 'Pending Review', 'In Review', 'Approved', 'Rejected', 'High Risk'];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      {/* Top Title & Header Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Vendors</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Master directory of all registered suppliers and application status
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              backgroundColor: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          {filterTabs.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setActiveFilter(f); setPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: activeFilter === f ? 600 : 500,
                color: activeFilter === f ? '#0F172A' : '#64748B',
                backgroundColor: activeFilter === f ? '#F1F5F9' : 'transparent',
                border: 0,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search vendor name, country, or ID..."
            style={{
              width: '100%',
              height: '34px',
              paddingLeft: '30px',
              paddingRight: '12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              color: '#1E293B',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Master Vendors Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ width: '40px', padding: '12px 0 12px 16px' }}>
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} style={{ borderRadius: '4px', cursor: 'pointer' }} />
              </th>
              <th style={{ padding: '12px 8px' }}>VENDOR NAME</th>
              <th style={{ padding: '12px 8px' }}>COUNTRY</th>
              <th style={{ padding: '12px 8px' }}>RISK</th>
              <th style={{ padding: '12px 8px' }}>STATUS</th>
              <th style={{ padding: '12px 8px' }}>ASSIGNED VENDOR EXECUTIVE</th>
              <th style={{ padding: '12px 8px' }}>SUBMISSION DATE</th>
              <th style={{ padding: '12px 8px' }}>PRIORITY</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((v: any) => {
              const currentStatus = decided[v.id] ? (decided[v.id] === 'approve' ? 'Approved' : 'Rejected') : v.status;
              const initials = v.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('');

              return (
                <tr
                  key={v.id}
                  style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease', cursor: 'pointer' }}
                  className="hover:bg-slate-50/80"
                  onClick={() => onOpenVendor(v.id, 'vendor-details')}
                >
                  <td style={{ padding: '12px 0 12px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleOne(v.id)} style={{ borderRadius: '4px', cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initials}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{v.name}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{v.company}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#334155', fontSize: '13px', fontWeight: 500 }}>{v.country}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <RiskBadge risk={v.risk} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <StatusBadge status={currentStatus} />
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569', fontSize: '13px', fontWeight: 500 }}>{v.supervisor}</td>
                  <td style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px' }}>{v.submitted}</td>
                  <td style={{ padding: '12px 8px', color: '#475569', fontSize: '12px', fontWeight: 500 }}>{v.priority}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          decide(v.id, 'approve');
                          submitDecision(v.id, 'APPROVE', 'Approved from directory', {});
                          notify(`✅ Vendor Approved\nApproval email has been sent to ${v.name}.`, 'green');
                        }}
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid #A7F3D0',
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          decide(v.id, 'reject');
                          submitDecision(v.id, 'REJECT', 'Rejected from directory', {});
                          notify(`❌ Vendor Rejected\nVendor ${v.name} has been notified.`, 'critical');
                        }}
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid #FECDD3',
                          backgroundColor: '#FFF1F2',
                          color: '#E11D48',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <X size={12} /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenVendor(v.id, 'vendor-details')}
                        style={{
                          height: '28px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#FFFFFF',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        Details <ChevronRight size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  No vendors match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
