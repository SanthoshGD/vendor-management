/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef } from 'react';
import { Globe, Tag, Clock3, Building2, Sparkles, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNexus } from '../../../context/NexusContext';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    vendorName: string;
    country: string;
    category: string;
    status: string;
    lastUpdated?: string;
    submitted?: string;
    image: string;
    images?: string[];
    flag?: string | null;
    risk?: string;
  };
  showVendorName?: boolean;
}

export function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollByAmount = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ position: 'relative', marginBottom: '12px' }} className="group">
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          borderRadius: '10px',
          scrollbarWidth: 'none',
        }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 100%',
              height: '180px',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#F1F5F9',
            }}
          >
            <img
              src={src}
              alt={`${alt} - photo ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <ChevronLeft size={14} className="text-slate-600" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <ChevronRight size={14} className="text-slate-600" />
          </button>
        </>
      )}

      <span
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          color: '#FFFFFF',
          fontSize: '10px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '6px',
          backdropFilter: 'blur(4px)',
        }}
      >
        {images.length} photos
      </span>
    </div>
  );
}

export default function ProductCard({ product, showVendorName = true }: ProductCardProps) {
  const { notify } = useNexus();
  const [currentStatus, setCurrentStatus] = useState(product.status);
  const images = product.images && product.images.length > 0 ? product.images : [product.image];

  const handleApprove = () => {
    setCurrentStatus('Approved');
    notify(`✅ Product "${product.name}" verified and added to catalog.`, 'green');
  };

  const handleReject = () => {
    setCurrentStatus('Rejected');
    notify(`❌ Product "${product.name}" rejected. Flag notification sent to vendor.`, 'critical');
  };

  const isApproved = currentStatus === 'Approved';
  const isRejected = currentStatus === 'Rejected';

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Photo Carousel */}
      <ImageCarousel images={images} alt={product.name} />

      {/* AI Flag Callout */}
      {product.flag && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '11px',
            backgroundColor: product.risk === 'high' ? '#FFF1F2' : '#FFFBEB',
            color: product.risk === 'high' ? '#BE123C' : '#B45309',
            border: `1px solid ${product.risk === 'high' ? '#FECDD3' : '#FDE68A'}`,
          }}
        >
          <Sparkles size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span>{product.flag}</span>
        </div>
      )}

      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.4 }}>
            {product.name}
          </h4>
          {showVendorName && (
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={13} style={{ color: '#94A3B8' }} />
                <span>{product.vendorName}</span>
              </span>
              {isApproved && (
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Check size={10} strokeWidth={3} /> Verified Vendor
                </span>
              )}
            </div>
          )}
        </div>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: isApproved ? '#ECFDF5' : isRejected ? '#FFF1F2' : '#FFFBEB',
            color: isApproved ? '#059669' : isRejected ? '#E11D48' : '#D97706',
            border: `1px solid ${isApproved ? '#A7F3D0' : isRejected ? '#FECDD3' : '#FDE68A'}`,
            flexShrink: 0,
          }}
        >
          {currentStatus}
        </span>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Globe size={11} /> {product.country}
        </span>
        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <Tag size={11} /> {product.category}
        </span>
      </div>

      {/* Footer Info */}
      <div style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
        <span>SKU: {product.id}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock3 size={11} /> {product.submitted || product.lastUpdated}
        </span>
      </div>

    </article>
  );
}
