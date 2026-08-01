'use client';

import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import ProductCard from './ProductCard';

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'SS27 Premium Stretch Denim Jeans',
    vendorId: 'VEN-8842',
    vendorName: 'SilkRoad Textiles Co., Ltd.',
    country: 'Vietnam',
    category: 'Denim',
    status: 'Approved',
    lastUpdated: '2 days ago',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-2',
    name: 'Organic Cotton Slub Tee',
    vendorId: 'VEN-8842',
    vendorName: 'SilkRoad Textiles Co., Ltd.',
    country: 'Vietnam',
    category: 'T-shirts',
    status: 'Approved',
    lastUpdated: '2 days ago',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-3',
    name: 'Classic Cable Knit Crewneck',
    vendorId: 'VEN-9104',
    vendorName: 'Dhaka Apparel Crafts Ltd.',
    country: 'Bangladesh',
    category: 'Knitwear',
    status: 'Pending Review',
    lastUpdated: '1 day ago',
    image: 'https://images.unsplash.com/photo-1574164904299-3a102b110380?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-4',
    name: 'Full-Grain Vegetable Tanned Leather Tote',
    vendorId: 'VEN-3312',
    vendorName: 'Guangzhou Artisan Leathers Co., Ltd.',
    country: 'China',
    category: 'Handbags',
    status: 'Approved',
    lastUpdated: '3 days ago',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-5',
    name: 'Minimalist Bifold Leather Wallet',
    vendorId: 'VEN-3312',
    vendorName: 'Guangzhou Artisan Leathers Co., Ltd.',
    country: 'China',
    category: 'Handbags',
    status: 'Approved',
    lastUpdated: '3 days ago',
    image: 'https://images.unsplash.com/photo-1627124718185-60f17f4337af?w=400&auto=format&fit=crop&q=80',
  }
];

interface ProductCatalogProps {
  vendorId?: string | null;
}

export default function ProductCatalog({ vendorId = null }: ProductCatalogProps) {
  const filteredProducts = useMemo(() => {
    // If vendorId is VEN-3312 (Guangzhou Artisan), let's show its China leather products, etc.
    // We can also fallback map vendor IDs to names dynamically or use mock mappings
    if (!vendorId) return MOCK_PRODUCTS;

    // Let's perform a loose or direct check. Since VEN-3312 is our main Guangzhou Leather,
    // and other vendors exist in mock data, let's map them to make it look realistic.
    const mapVendorIdToName: Record<string, string> = {
      'v1': 'VEN-3312', // Wei Mingzhi (Jinpeng Leather / Guangzhou Artisan)
      'v2': 'VEN-8842', // Chen Lihua (Dongfang Footwear / SilkRoad)
      'v7': 'VEN-9104', // Priya Sharma (Delhi Craft Circle)
    };
    
    const targetId = mapVendorIdToName[vendorId] || vendorId;
    return MOCK_PRODUCTS.filter(p => p.vendorId === targetId || p.vendorName.toLowerCase().includes(vendorId.toLowerCase()));
  }, [vendorId]);

  return (
    <div className="product-catalog-view">
      <div className="portfolio-stats mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
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
