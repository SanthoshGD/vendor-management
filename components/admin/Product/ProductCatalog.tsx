'use client';

import React, { useMemo, useState } from 'react';
import { Package, Filter, Check, X, AlertCircle } from 'lucide-react';
import ProductCard from './ProductCard';
import { useNexus } from '../../../context/NexusContext';

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Crewneck Cotton T-Shirt',
    vendorId: 'v3',
    vendorName: 'Zhang Weilong · Hualong Garment Factory',
    country: 'China',
    category: 'Apparels',
    status: 'Approved',
    lastUpdated: 'Today',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-2',
    name: 'Heavyweight Fleece Pullover Hoodie',
    vendorId: 'v3',
    vendorName: 'Zhang Weilong · Hualong Garment Factory',
    country: 'China',
    category: 'Apparels',
    status: 'Approved',
    lastUpdated: 'Yesterday',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-3',
    name: 'Genuine Leather Travel Duffel Bag',
    vendorId: 'v1',
    vendorName: 'Wei Mingzhi · Jinpeng Leather Goods Co.',
    country: 'China',
    category: 'Bags',
    status: 'Approved',
    lastUpdated: '3 days ago',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-4',
    name: 'Classic Leather Crossbody Bag',
    vendorId: 'v1',
    vendorName: 'Wei Mingzhi · Jinpeng Leather Goods Co.',
    country: 'China',
    category: 'Bags',
    status: 'Approved',
    lastUpdated: '1 day ago',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-5',
    name: 'Handcrafted Woven Leather Loafers',
    vendorId: 'v2',
    vendorName: 'Chen Lihua · Dongfang Footwear Export',
    country: 'China',
    category: 'Shoes',
    status: 'Approved',
    lastUpdated: '2 days ago',
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-6',
    name: 'Sport Performance Athletic Sneakers',
    vendorId: 'v2',
    vendorName: 'Chen Lihua · Dongfang Footwear Export',
    country: 'China',
    category: 'Shoes',
    status: 'Approved',
    lastUpdated: '2 days ago',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-7',
    name: 'Handcrafted Sterling Silver Necklace Set',
    vendorId: 'v7',
    vendorName: 'Priya Sharma · Delhi Craft Circle',
    country: 'India',
    category: 'Jewelry',
    status: 'Approved',
    lastUpdated: '3 days ago',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-8',
    name: 'Gold Plated Traditional Designer Bangles',
    vendorId: 'v7',
    vendorName: 'Priya Sharma · Delhi Craft Circle',
    country: 'India',
    category: 'Jewelry',
    status: 'Approved',
    lastUpdated: '4 days ago',
    image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-9',
    name: 'Minimalist Steel Chronograph Watch',
    vendorId: 'v5',
    vendorName: 'Liu Hao · Mingde Watch Trading Co.',
    country: 'China',
    category: 'Watches',
    status: 'Pending Review',
    lastUpdated: '1 day ago',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-15',
    name: 'Aviation Automatic Pilot Watch',
    vendorId: 'v5',
    vendorName: 'Liu Hao · Mingde Watch Trading Co.',
    country: 'China',
    category: 'Watches',
    status: 'Pending Review',
    lastUpdated: 'Today',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-16',
    name: 'Classic Gold Mesh Dress Watch',
    vendorId: 'v5',
    vendorName: 'Liu Hao · Mingde Watch Trading Co.',
    country: 'China',
    category: 'Watches',
    status: 'Approved',
    lastUpdated: '3 days ago',
    image: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-10',
    name: 'Washed Denim Jacket with Brass Hardware',
    vendorId: 'v3',
    vendorName: 'Zhang Weilong · Hualong Garment Factory',
    country: 'China',
    category: 'Apparels',
    status: 'Pending Review',
    lastUpdated: 'Today',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-11',
    name: 'Full-Grain Leather Wallet with Coin Pocket',
    vendorId: 'v1',
    vendorName: 'Wei Mingzhi · Jinpeng Leather Goods Co.',
    country: 'China',
    category: 'Bags',
    status: 'Pending Review',
    lastUpdated: '12 hours ago',
    image: 'https://images.unsplash.com/photo-1588436706487-9d55d73a39e3?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-12',
    name: 'Classic Running Shoes with Mesh Upper',
    vendorId: 'v2',
    vendorName: 'Chen Lihua · Dongfang Footwear Export',
    country: 'China',
    category: 'Shoes',
    status: 'Pending Review',
    lastUpdated: '2 hours ago',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-13',
    name: 'Premium Wool Knit Cardigan Sweater',
    vendorId: 'v3',
    vendorName: 'Zhang Weilong · Hualong Garment Factory',
    country: 'China',
    category: 'Apparels',
    status: 'Pending Review',
    lastUpdated: 'Yesterday',
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-14',
    name: 'Raw Denim Slim Fit Jeans',
    vendorId: 'v3',
    vendorName: 'Zhang Weilong · Hualong Garment Factory',
    country: 'China',
    category: 'Apparels',
    status: 'Rejected',
    lastUpdated: '2 days ago',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=80',
  }
];

interface ProductCatalogProps {
  vendorId?: string | null;
}

export default function ProductCatalog({ vendorId = null }: ProductCatalogProps) {
  const { vendors, submitDecision, notify } = useNexus();
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending Review' | 'Approved' | 'Rejected'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const filteredAndSortedProducts = useMemo(() => {
    // 1. Initial vendor filter
    let list = MOCK_PRODUCTS;
    if (vendorId) {
      const matched = MOCK_PRODUCTS.filter(
        p => p.vendorId === vendorId || p.vendorName.toLowerCase().includes(vendorId.toLowerCase())
      );
      list = matched.length > 0 ? matched : MOCK_PRODUCTS.slice(0, 4);
    }

    // 2. Status filter
    if (statusFilter !== 'All') {
      list = list.filter(p => p.status === statusFilter);
    }

    // 3. Category filter
    if (categoryFilter !== 'All') {
      list = list.filter(p => p.category === categoryFilter);
    }

    // 4. Sort: Pending Review (1) -> Rejected (2) -> Approved (3)
    const statusWeight: Record<string, number> = {
      'Pending Review': 1,
      'Rejected': 2,
      'Approved': 3
    };

    return [...list].sort((a, b) => {
      const wA = statusWeight[a.status] || 99;
      const wB = statusWeight[b.status] || 99;
      return wA - wB;
    });
  }, [vendorId, statusFilter, categoryFilter]);

  // Extract unique categories from raw products for filter buttons
  const categories = useMemo(() => {
    const set = new Set(MOCK_PRODUCTS.map(p => p.category));
    return ['All', ...Array.from(set)];
  }, []);

  const sortedVendorGroups = useMemo(() => {
    const groups: Record<string, typeof MOCK_PRODUCTS> = {};
    filteredAndSortedProducts.forEach(p => {
      const vName = p.vendorName;
      if (!groups[vName]) {
        groups[vName] = [];
      }
      groups[vName].push(p);
    });

    const statusWeight: Record<string, number> = {
      'Pending Review': 1,
      'Rejected': 2,
      'Approved': 3
    };

    const vendorNames = Object.keys(groups).sort((a, b) => {
      const minWeightA = Math.min(...groups[a].map(p => statusWeight[p.status] || 99));
      const minWeightB = Math.min(...groups[b].map(p => statusWeight[p.status] || 99));
      if (minWeightA !== minWeightB) {
        return minWeightA - minWeightB;
      }
      return a.localeCompare(b);
    });

    return {
      names: vendorNames,
      groups
    };
  }, [filteredAndSortedProducts]);

  return (
    <div style={{ padding: vendorId ? 0 : '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: vendorId ? 'transparent' : '#F8FAFC', minHeight: vendorId ? 'auto' : '100%', boxSizing: 'border-box' }}>
      {!vendorId && (
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Product Verification & Catalog</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Review, verify, and approve sample product catalog line items submitted by onboarding suppliers
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="portfolio-stats mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <span><strong>{filteredAndSortedProducts.length}</strong><small>Total Displayed</small></span>
        <span><strong>{filteredAndSortedProducts.filter(p => p.status === 'Approved').length}</strong><small>Approved Items</small></span>
        <span><strong>{filteredAndSortedProducts.filter(p => p.status === 'Pending Review').length}</strong><small>Awaiting Verification</small></span>
      </div>

      {/* Filter strip controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Status filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 650, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} />
            Status:
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['All', 'Pending Review', 'Approved', 'Rejected'] as const).map((statusVal) => (
              <button
                key={statusVal}
                type="button"
                onClick={() => setStatusFilter(statusVal)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: statusFilter === statusVal ? '#10B981' : '#E2E8F0',
                  backgroundColor: statusFilter === statusVal ? '#ECFDF5' : '#FFFFFF',
                  color: statusFilter === statusVal ? '#059669' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {statusVal}
              </button>
            ))}
          </div>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', fontWeight: 650, color: '#475569' }}>Category:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {categories.map((catVal) => (
              <button
                key={catVal}
                type="button"
                onClick={() => setCategoryFilter(catVal)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: categoryFilter === catVal ? '#10B981' : '#E2E8F0',
                  backgroundColor: categoryFilter === catVal ? '#ECFDF5' : '#FFFFFF',
                  color: categoryFilter === catVal ? '#059669' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {catVal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid rendering */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="table-empty py-12 text-center text-slate-500" style={{ padding: '40px 0', border: '1px dashed #CBD5E1', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
          <Package className="mx-auto mb-3 opacity-30" size={32} style={{ margin: '0 auto 12px auto', display: 'block', color: '#64748B' }} />
          <span style={{ fontSize: '13px', color: '#64748B' }}>No products match the selected filters.</span>
        </div>
      ) : vendorId ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredAndSortedProducts.map(product => (
            <ProductCard key={product.id} product={product} showVendorName={false} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {sortedVendorGroups.names.map(vName => {
            const groupProducts = sortedVendorGroups.groups[vName];
            const country = groupProducts[0]?.country || 'Unknown';
            const groupVendorId = groupProducts[0]?.vendorId;
            const vendorObj = vendors.find((v: any) => v.id === groupVendorId);

            return (
              <div key={vName} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid #E2E8F0',
                  paddingBottom: '8px',
                  marginTop: '8px'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                    {vName}
                  </h3>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 650,
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {country}
                  </span>

                  {/* Vendor Approve/Reject level buttons */}
                  {vendorObj?.finalStatus ? (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: vendorObj.finalStatus === 'Approved' ? '#ECFDF5' : vendorObj.finalStatus === 'Rejected' ? '#FFF1F2' : '#FFFBEB',
                      color: vendorObj.finalStatus === 'Approved' ? '#059669' : vendorObj.finalStatus === 'Rejected' ? '#E11D48' : '#D97706',
                      border: `1px solid ${vendorObj.finalStatus === 'Approved' ? '#A7F3D0' : vendorObj.finalStatus === 'Rejected' ? '#FECDD3' : '#FDE68A'}`,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginLeft: '12px'
                    }}>
                      {vendorObj.finalStatus === 'Approved' ? <Check size={11} /> : vendorObj.finalStatus === 'Rejected' ? <X size={11} /> : <AlertCircle size={11} />}
                      {vendorObj.finalStatus}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                      <button
                        type="button"
                        className="catalog-btn-reject"
                        onClick={() => {
                          submitDecision(groupVendorId, 'REJECT', 'Rejected during product catalog verification', {});
                          notify(`Vendor application rejected. Notification sent to ${vName}.`, 'critical');
                        }}
                      >
                        <X size={13} style={{ color: '#E11D48' }} /> Reject Vendor
                      </button>
                      <button
                        type="button"
                        className="catalog-btn-approve"
                        onClick={() => {
                          submitDecision(groupVendorId, 'APPROVE', 'Approved during product catalog verification', {});
                          notify(`✅ Vendor Approved. Approval email and portal notification have been sent to ${vName}.`, 'green');
                        }}
                      >
                        <Check size={13} /> Approve Vendor
                      </button>
                    </div>
                  )}

                  <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>
                    {groupProducts.length} product{groupProducts.length !== 1 ? 's' : ''} submitted
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {groupProducts.map(product => (
                    <ProductCard key={product.id} product={product} showVendorName={false} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
