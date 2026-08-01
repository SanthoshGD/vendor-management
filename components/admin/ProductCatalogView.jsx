import React from 'react';
import { Package, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'SS27 Premium Stretch Denim Jeans',
    vendorId: 'VEN-8842',
    vendorName: 'SilkRoad Textiles Co., Ltd.',
    country: 'Vietnam',
    category: 'T-shirts',
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

export default function ProductCatalogView({ vendorId = null }) {
  const filteredProducts = vendorId 
    ? MOCK_PRODUCTS.filter(p => p.vendorId === vendorId)
    : MOCK_PRODUCTS;

  return (
    <div className="product-catalog-view">
      <div className="portfolio-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
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
            <article className="panel" key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: '12px' }}>
              <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                <img 
                  src={product.image} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span 
                  className={`status-pill ${product.status === 'Approved' ? 'green' : 'amber'}`}
                  style={{ position: 'absolute', top: '8px', right: '8px' }}
                >
                  {product.status}
                </span>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{product.name}</h4>
                  {!vendorId && (
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                      {product.vendorName} <span style={{ color: 'var(--faint)' }}>({product.vendorId})</span>
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  <span className="status-pill neutral" style={{ fontSize: '11px' }}>{product.category}</span>
                  <span className="status-pill neutral" style={{ fontSize: '11px' }}>{product.country}</span>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--faint)' }}>
                  <span>ID: {product.id}</span>
                  <span>Updated {product.lastUpdated}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
