/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { Globe, Tag, Clock3, Building2 } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    vendorName: string;
    country: string;
    category: string;
    status: string;
    lastUpdated: string;
    image: string;
  };
  showVendorName?: boolean;
}

export default function ProductCard({ product, showVendorName = true }: ProductCardProps) {
  const isApproved = product.status === 'Approved';

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', height: '160px', width: '100%', backgroundColor: '#F1F5F9' }}>
        <img
          src={product.image}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: isApproved ? '#ECFDF5' : '#FFFBEB',
            color: isApproved ? '#059669' : '#D97706',
            border: `1px solid ${isApproved ? '#A7F3D0' : '#FDE68A'}`,
          }}
        >
          {product.status}
        </span>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.4 }}>
          {product.name}
        </h4>

        {showVendorName && (
          <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <Building2 size={13} style={{ color: '#94A3B8' }} />
            <span>{product.vendorName}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Globe size={11} /> {product.country}
          </span>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Tag size={11} /> {product.category}
          </span>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
          <span>SKU: {product.id}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock3 size={11} /> {product.lastUpdated}
          </span>
        </div>
      </div>
    </article>
  );
}
