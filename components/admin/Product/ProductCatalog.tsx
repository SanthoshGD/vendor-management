'use client';

import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import ProductCard from './ProductCard';

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
