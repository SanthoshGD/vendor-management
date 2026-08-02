'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import ProductCatalog from '../../../components/admin/Product/ProductCatalog';

export default function AdminProductsPage() {
  return (
    <PortalLayout persona="admin">
      <ProductCatalog />
    </PortalLayout>
  );
}
