import {
  Activity, FileCheck2, FolderKanban, Home, Inbox,
  LayoutDashboard, Users, UserCog, Package, Settings
} from 'lucide-react';

export type PersonaRole = 'admin' | 'vendor';

export const adminNav: [string, string, any][] = [
  ['overview', 'Dashboard', LayoutDashboard],
  ['vendors', 'Vendors', Users],
  ['team', 'Teams', UserCog],
  ['products', 'Product Catalog', Package],
  ['activity', 'Activity', Activity],
  ['settings', 'Settings', Settings],
];

export const vendorNav: [string, string, any][] = [
  ['overview', 'My workspace', Home],
  ['onboarding', 'Onboarding', FolderKanban],
  ['actions', 'Action center', Inbox],
  ['documents', 'Documents', FileCheck2],
];

export const pageNamesByPersona: Record<PersonaRole, Record<string, string>> = {
  admin: {
    overview: 'Dashboard',
    vendors: 'Vendors',
    team: 'Teams',
    products: 'Product Catalog',
    activity: 'Activity',
    settings: 'Settings',
    'ai-review': 'Vendor Details',
    'vendor-details': 'Vendor Details',
  },
  vendor: {
    overview: 'My workspace',
    onboarding: 'Onboarding',
    actions: 'Action center',
    documents: 'Documents',
  },
};

export const ROLE_PAGES: Record<PersonaRole, string[]> = {
  admin: ['overview', 'vendors', 'team', 'products', 'activity', 'settings', 'ai-review', 'vendor-details'],
  vendor: ['overview', 'onboarding', 'actions', 'documents'],
};

export const HOME_PAGE: Record<PersonaRole, string> = {
  admin: 'overview',
  vendor: 'overview',
};

export const ROLE_LABEL: Record<PersonaRole, string> = {
  admin: 'Admin Portal',
  vendor: 'Vendor Portal',
};

export const BELL_FOOTER: Record<PersonaRole, { page: string; label: string }> = {
  admin: { page: 'activity', label: 'Open activity log' },
  vendor: { page: 'actions', label: 'Open action center' },
};
