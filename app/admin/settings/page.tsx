'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import SettingsView from '../../../components/admin/SettingsView';

export default function AdminSettingsPage() {
  return (
    <PortalLayout persona="admin">
      <SettingsView />
    </PortalLayout>
  );
}
