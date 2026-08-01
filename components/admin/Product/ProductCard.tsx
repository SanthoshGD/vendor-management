/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { Package, Globe, Tag, CheckCircle2, Clock3 } from 'lucide-react';

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
    <article className="panel product-catalog-card">
      <div className="product-image-container">
        <img src={product.image} alt={product.name} className="product-card-img" />
        <span className={`status-pill ${isApproved ? 'green' : 'amber'} product-status-pill`}>
          {product.status}
        </span>
      </div>

      <div className="product-card-body">
        <h4 className="product-title">{product.name}</h4>
        
        {showVendorName && (
          <p className="product-vendor-meta">
            <span>{product.vendorName}</span>
          </p>
        )}

        <div className="product-tags-row">
          <span className="status-pill neutral compact">
            <Globe size={10} className="mr-1 inline" />
            {product.country}
          </span>
          <span className="status-pill neutral compact">
            <Tag size={10} className="mr-1 inline" />
            {product.category}
          </span>
        </div>

        <div className="product-card-footer">
          <span>ID: {product.id}</span>
          <span className="flex items-center gap-1">
            <Clock3 size={10} />
            {product.lastUpdated}
          </span>
        </div>
      </div>
    </article>
  );
}
