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
  } else if (status === 'In Review' || status === 'Doc Review') {
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

export default function VendorList({ onOpenVendor, onModal }: { onOpenVendor: (id: string, tab?: string) => void; onModal?: (modal: any) => void }) {
  const { vendors } = useNexus();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ stage: 'All', category: 'All', status: 'All' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decided, setDecided] = useState<Record<string, 'approve' | 'reject'>>({});
  const pageSize = 6;

  // Combine context vendors with mock presentation defaults
  const normalizedVendors = useMemo(() => {
    return vendors.map((v: any, index: number) => {
      const mockDefaults = [
        { company: "Hualong Garment Factory", category: "Apparels", stage: "Profile Submitted", docs: "0/6", supervisor: "Liu Yanbo", submitted: "Yesterday, 4:30 PM", risk: "high" },
        { company: "Dongfang Footwear Export", category: "Shoes", stage: "Doc Review", docs: "4/6", supervisor: "Liu Yanbo", submitted: "Today, 9:15 AM", risk: "low" },
        { company: "Nair Global Exports Pvt. Ltd.", category: "Bags", stage: "Doc Review", docs: "5/6", supervisor: "Elena R.", submitted: "Today, 8:00 AM", risk: "high" },
        { company: "Jinpeng Leather Goods Co.", category: "Bags", stage: "Verified", docs: "6/6", supervisor: "Liu Yanbo", submitted: "Today, 10:42 AM", risk: "low" },
        { company: "Anatolian Leather Works", category: "Bags", stage: "Profile Approved", docs: "6/6", supervisor: "Marco B.", submitted: "5 days ago", risk: "low" },
        { company: "Delhi Craft Circle", category: "Jewelry", stage: "Products Pending", docs: "6/6", supervisor: "Priya N.", submitted: "3 days ago", risk: "low" },
      ];
      const d = mockDefaults[index % mockDefaults.length];
      return {
        id: v.id,
        name: v.name,
        company: v.company || v.legalName || v.profile?.companyName || d.company,
        category: v.category || d.category,
        stage: v.stage || d.stage,
        status: v.finalStatus || v.status || (index === 0 ? 'Pending' : index === 1 || index === 2 ? 'In Review' : 'Approved'),
        docs: v.docsCount || d.docs,
        supervisor: v.owner || d.supervisor,
        submitted: v.submitted || d.submitted,
        risk: (v.risk || d.risk).toLowerCase(),
      };
    });
  }, [vendors]);

  const filtered = useMemo(() => {
    return normalizedVendors.filter((v: any) => {
      const query = search.toLowerCase();
      const matchesSearch = !search || v.name.toLowerCase().includes(query) || v.company.toLowerCase().includes(query) || v.id.toLowerCase().includes(query);
      const matchesStage = filters.stage === 'All' || v.stage === filters.stage;
      const matchesCategory = filters.category === 'All' || v.category === filters.category;
      const matchesStatus = filters.status === 'All' || (decided[v.id] ? (decided[v.id] === 'approve' ? 'Approved' : 'Rejected') : v.status) === filters.status;

      return matchesSearch && matchesStage && matchesCategory && matchesStatus;
    });
  }, [normalizedVendors, search, filters, decided]);

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

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      {/* Top Title & Header Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Vendor pipeline</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            {filtered.length} vendors across 6 stages
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#64748B', border: 0, backgroundColor: 'transparent', cursor: 'pointer' }}>
              <LayoutGrid size={13} /> Kanban
            </button>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0F172A', border: 0, backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Search input */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Filter by name or company"
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

        {/* Filter Dropdowns */}
        {[
          { key: 'stage', options: ['All', 'Invited', 'Profile Submitted', 'Doc Review', 'Profile Approved', 'Products Pending', 'Verified'] },
          { key: 'category', options: ['All', 'Apparels', 'Shoes', 'Bags', 'Accessories', 'Watches', 'Jewelry'] },
          { key: 'status', options: ['All', 'Approved', 'Rejected', 'In Review', 'Pending', 'Invited', 'Verified'] },
        ].map((f) => (
          <div key={f.key} style={{ position: 'relative' }}>
            <select
              value={filters[f.key as keyof typeof filters]}
              onChange={(e) => { setFilters({ ...filters, [f.key]: e.target.value }); setPage(1); }}
              style={{
                height: '34px',
                paddingLeft: '10px',
                paddingRight: '26px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#475569',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              {f.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <ChevronDown size={11} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          </div>
        ))}

        {/* Reset Filter Button */}
        <button
          type="button"
          onClick={() => { setFilters({ stage: 'All', category: 'All', status: 'All' }); setSearch(''); setPage(1); }}
          style={{
            height: '34px',
            padding: '0 10px',
            borderRadius: '8px',
            border: '1px solid transparent',
            fontSize: '12px',
            color: '#64748B',
            backgroundColor: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={12} /> Reset
        </button>

        {/* Export Button */}
        <button
          type="button"
          style={{
            marginLeft: 'auto',
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
          <Download size={12} /> Export
        </button>
      </div>

      {/* Main Vendor Queue Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ width: '40px', padding: '12px 0 12px 16px' }}>
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} style={{ borderRadius: '4px', cursor: 'pointer' }} />
              </th>
              <th style={{ padding: '12px 8px' }}>VENDOR</th>
              <th style={{ padding: '12px 8px' }}>COMPANY</th>
              <th style={{ padding: '12px 8px' }}>CATEGORY</th>
              <th style={{ padding: '12px 8px' }}>STAGE</th>
              <th style={{ padding: '12px 8px' }}>STATUS</th>
              <th style={{ padding: '12px 8px' }}>DOCS</th>
              <th style={{ padding: '12px 8px' }}>VENDOR EXECUTIVE</th>
              <th style={{ padding: '12px 8px' }}>SUBMITTED</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((v: any) => {
              const currentStatus = decided[v.id] ? (decided[v.id] === 'approve' ? 'Approved' : 'Rejected') : v.status;
              const isActionable = !decided[v.id] && (v.status === 'In Review' || v.status === 'Pending');
              const initials = v.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('');

              return (
                <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }} className="hover:bg-slate-50/80">
                  <td style={{ padding: '12px 0 12px 16px' }}>
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleOne(v.id)} style={{ borderRadius: '4px', cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      type="button"
                      onClick={() => onOpenVendor(v.id, 'vendor-details')}
                      style={{ border: 0, backgroundColor: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initials}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{v.name}</span>
                      {v.risk === 'high' && <AlertTriangle size={12} style={{ color: '#E11D48', flexShrink: 0 }} />}
                      {v.risk === 'medium' && <AlertTriangle size={12} style={{ color: '#D97706', flexShrink: 0 }} />}
                    </button>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569', fontSize: '13px' }}>{v.company}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <CategoryTag category={v.category} />
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569', fontSize: '13px' }}>{v.stage}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <StatusBadge status={currentStatus} />
                  </td>
                  <td style={{ padding: '12px 8px', color: '#64748B', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>{v.docs}</td>
                  <td style={{ padding: '12px 8px', color: '#64748B', fontSize: '13px' }}>{v.supervisor}</td>
                  <td style={{ padding: '12px 8px', color: '#94A3B8', fontSize: '12px' }}>{v.submitted}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {isActionable && (
                        <>
                          <button
                            type="button"
                            onClick={() => decide(v.id, 'approve')}
                            title="Approve"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(v.id, 'reject')}
                            title="Reject"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}

                      {/* EXPLICIT VIEW BUTTON */}
                      <button
                        type="button"
                        onClick={() => onOpenVendor(v.id, 'vendor-details')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#047857',
                          backgroundColor: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        View <ChevronRight size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px' }}>
                  No vendors match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Pagination Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#64748B' }}>
          <span>
            Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: page <= 1 ? '#F8FAFC' : '#FFFFFF',
                color: page <= 1 ? '#CBD5E1' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: page <= 1 ? 'default' : 'pointer',
              }}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i + 1)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: page === i + 1 ? '1px solid #0F172A' : '1px solid #E2E8F0',
                  backgroundColor: page === i + 1 ? '#0F172A' : '#FFFFFF',
                  color: page === i + 1 ? '#FFFFFF' : '#475569',
                  fontWeight: page === i + 1 ? 600 : 400,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: page >= totalPages ? '#F8FAFC' : '#FFFFFF',
                color: page >= totalPages ? '#CBD5E1' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: page >= totalPages ? 'default' : 'pointer',
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
