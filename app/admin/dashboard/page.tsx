'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import Dashboard from '../../../components/admin/Dashboard/Dashboard';

export default function AdminDashboardPage() {
  return (
    <PortalLayout persona="admin">
      <Dashboard />
    </PortalLayout>
  );
}
