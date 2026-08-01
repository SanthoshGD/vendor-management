'use client';

import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import ProductCard from './ProductCard';

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Cotton T-Shirt',
    vendorId: 'VEN-5501',
    vendorName: 'Shanghai Textile Co., Ltd.',
    country: 'China',
    category: 'T-Shirts',
    status: 'Approved',
    lastUpdated: 'Today',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-2',
    name: 'Premium Fleece Hoodie',
    vendorId: 'VEN-3312',
    vendorName: 'Guangzhou Apparel Ltd.',
    country: 'China',
    category: 'Hoodies',
    status: 'Approved',
    lastUpdated: 'Yesterday',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-3',
    name: 'Raw Selvedge Denim Jeans',
    vendorId: 'VEN-4109',
    vendorName: 'Ningbo Fashion Group',
    country: 'China',
    category: 'Denim Jeans',
    status: 'Approved',
    lastUpdated: '3 days ago',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-4',
    name: 'Leather Bomber Jacket',
    vendorId: 'VEN-6202',
    vendorName: 'Beijing Garments Ltd.',
    country: 'China',
    category: 'Jacket',
    status: 'Pending Review',
    lastUpdated: '1 day ago',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-5',
    name: 'Classic Piqué Polo Shirt',
    vendorId: 'VEN-5501',
    vendorName: 'Shanghai Textile Co., Ltd.',
    country: 'China',
    category: 'Polo Shirt',
    status: 'Approved',
    lastUpdated: '2 days ago',
    image: 'https://images.unsplash.com/photo-1625910513413-441656b279d0?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-6',
    name: 'Handcrafted Silver Jewelry Set',
    vendorId: 'VEN-9104',
    vendorName: 'Delhi Craft Circle',
    country: 'India',
    category: 'Jewelry',
    status: 'Approved',
    lastUpdated: '2 days ago',
    image: 'https://images.unsplash.com/photo-1620135104013-1abdff4b1ca7?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-7',
    name: 'Woven Leather Loafers',
    vendorId: 'VEN-3312',
    vendorName: 'Anatolian Leather Works',
    country: 'Turkey',
    category: 'Footwear',
    status: 'Approved',
    lastUpdated: '3 days ago',
    image: 'https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-8',
    name: 'Canvas Slip-on Sneakers',
    vendorId: 'VEN-4109',
    vendorName: 'Ningbo Fashion Group',
    country: 'China',
    category: 'Footwear',
    status: 'Approved',
    lastUpdated: '4 days ago',
    image: 'https://images.unsplash.com/photo-1676379827610-c380c52db0c6?w=500&auto=format&fit=crop&q=80',
  }
];

interface ProductCatalogProps {
  vendorId?: string | null;
}

export default function ProductCatalog({ vendorId = null }: ProductCatalogProps) {
  const filteredProducts = useMemo(() => {
    if (!vendorId) return MOCK_PRODUCTS;

    const matched = MOCK_PRODUCTS.filter(
      p => p.vendorId === vendorId || p.vendorName.toLowerCase().includes(vendorId.toLowerCase())
    );

    // If specific vendor doesn't have custom items attached, fallback to showing a selection of sample products
    if (matched.length > 0) return matched;
    return MOCK_PRODUCTS.slice(0, 4);
  }, [vendorId]);

  return (
    <div style={{ padding: vendorId ? 0 : '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: vendorId ? 'transparent' : '#F8FAFC', minHeight: vendorId ? 'auto' : '100%' }}>
      {!vendorId && (
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Product Verification & Catalog</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Review, verify, and approve sample product catalog line items submitted by onboarding suppliers
          </p>
        </div>
      )}

      <div className="portfolio-stats mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <span><strong>{filteredProducts.length}</strong><small>Total Products</small></span>
        <span><strong>{filteredProducts.filter(p => p.status === 'Approved').length}</strong><small>Approved Catalog Items</small></span>
        <span><strong>{filteredProducts.filter(p => p.status === 'Pending Review').length}</strong><small>Awaiting Verification</small></span>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="table-empty py-12 text-center text-slate-500">
          <Package className="mx-auto mb-3 opacity-30" size={32} />
          No products listed for this supplier.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} showVendorName={!vendorId} />
          ))}
        </div>
      )}
    </div>
  );
}
