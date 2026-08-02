'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import { VendorDocuments } from '../../../components/RedesignedApp';

export default function VendorDocumentsPage() {
  return (
    <PortalLayout persona="vendor">
      <VendorDocuments />
    </PortalLayout>
  );
}
