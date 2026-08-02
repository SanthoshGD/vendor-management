'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import { VendorActions } from '../../../components/RedesignedApp';

export default function VendorActionsPage() {
  return (
    <PortalLayout persona="vendor">
      <VendorActions />
    </PortalLayout>
  );
}
