import {
  Activity, Bot, FileCheck2, FolderKanban, Home, Inbox,
  LayoutDashboard, ShieldCheck, Users,
} from 'lucide-react';

export type PersonaRole = 'admin' | 'supervisor' | 'vendor';

export const adminNav = [
  ['overview', 'Overview', LayoutDashboard],
  ['vendors', 'Vendor queue', Users],
  ['onboarding', 'Document collection', FolderKanban],
  ['compliance', 'Compliance', ShieldCheck],
  ['agents', 'Agent console', Bot],
  ['activity', 'Audit record', Activity],
] as const;

export const supervisorNav = [
  ['oversight', 'Oversight', LayoutDashboard],
  ['requests', 'Requests', Inbox],
  ['vendors', 'All vendors', Users],
  ['agents', 'Agent policy', Bot],
  ['activity', 'Audit record', Activity],
] as const;

export const vendorNav = [
  ['overview', 'My workspace', Home],
  ['onboarding', 'Onboarding', FolderKanban],
  ['actions', 'Action center', Inbox],
  ['documents', 'Documents', FileCheck2],
] as const;

export const pageNamesByPersona: Record<PersonaRole, Record<string, string>> = {
  admin: {
    overview: 'Overview',
    vendors: 'Vendor queue',
    onboarding: 'Document collection',
    compliance: 'Compliance',
    'ai-review': 'Review workspace',
    agents: 'Agent console',
    activity: 'Audit record',
  },
  supervisor: {
    oversight: 'Oversight',
    requests: 'Requests',
    vendors: 'All vendors',
    'ai-review': 'Case review',
    agents: 'Agent policy',
    activity: 'Audit record',
  },
  vendor: {
    overview: 'My workspace',
    onboarding: 'Onboarding',
    actions: 'Action center',
    documents: 'Documents',
  },
};

export const ROLE_PAGES: Record<PersonaRole, string[]> = {
  admin: ['overview', 'vendors', 'onboarding', 'ai-review', 'compliance', 'agents', 'activity'],
  supervisor: ['oversight', 'requests', 'vendors', 'agents', 'activity', 'ai-review'],
  vendor: ['overview', 'onboarding', 'actions', 'documents'],
};

export const HOME_PAGE: Record<PersonaRole, string> = {
  admin: 'overview',
  supervisor: 'oversight',
  vendor: 'overview',
};

export const ROLE_LABEL: Record<PersonaRole, string> = {
  admin: 'Admin workspace',
  supervisor: 'Supervisor workspace',
  vendor: 'Vendor portal',
};

export const BELL_FOOTER: Record<PersonaRole, { page: string; label: string }> = {
  admin: { page: 'activity', label: 'Open audit record' },
  supervisor: { page: 'requests', label: 'Open requests' },
  vendor: { page: 'actions', label: 'Open action center' },
};
