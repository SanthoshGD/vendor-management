export interface VendorField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  resolved: boolean;
  humanVerified: boolean;
  crossDocMismatch?: boolean;
  mismatchNote?: string;
  diagnostic?: string;
  translatedValue?: string;
  originalValue?: string;
  humanValue?: string;
  reason?: string;
  overrideBy?: string;
  overrideAt?: string;
}

export interface RejectionInfo {
  reason: string;
  detail: string;
  requestedAt: string;
}

export interface VendorDocument {
  id: string;
  code: string;
  title: string;
  fileName?: string;
  pageCount?: number;
  docTemplate?: string;
  language?: string | null;
  status: 'Verified' | 'Needs Review' | 'Flagged' | 'Missing' | 'Processing' | 'Uploaded';
  fields: VendorField[];
  rejection?: RejectionInfo;
}

export interface VendorProfile {
  legalName?: string;
  country?: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
}

export interface VendorSupervisorNote {
  note: string;
  returnedAt: string;
}

export interface Vendor {
  id: string;
  initials: string;
  name: string;
  shortName?: string;
  country: string;
  category: string;
  contact: string;
  email: string;
  owner: string;
  baseRiskScore: number;
  slaHours: number;
  sla: string;
  finalStatus?: 'Active' | 'Approved' | 'Rejected' | null;
  aiSummary: string;
  documents: VendorDocument[];
  hasSubmittedApplication?: boolean;
  onboardingStep?: number;
  onboardingMethod?: string;
  profile?: VendorProfile;
  supervisorNote?: VendorSupervisorNote;
  checklistId?: string;
  checklistLabel?: string;
  erpId?: string;
  // Computed runtime helpers
  progress?: number;
  docs?: number;
  verifiedCount?: number;
  missingCount?: number;
  openFindings?: number;
  risk?: 'Low' | 'Medium' | 'High';
  riskScore?: number;
  stage?: string;
  status?: string;
  submittedAt?: string;
}
