export type RequestTypeKey =
  | 'RISK_ACCEPTANCE'
  | 'AUTHORITY'
  | 'ESCALATION'
  | 'POLICY_CHANGE'
  | 'REASSESSMENT';

export type RequestOutcomeKey =
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN'
  | 'GRANT'
  | 'CONFIRM'
  | 'WAIVE'
  | 'EXEMPT'
  | 'UPDATE_GATE'
  | 'SUSPEND';

export interface RequestTypeMeta {
  label: string;
  tone: 'amber' | 'violet' | 'red' | 'blue';
  outcomes: RequestOutcomeKey[];
}

export interface RequestOutcomeMeta {
  label: string;
  copy: string;
  audit: string;
  tone: 'primary' | 'danger' | 'secondary';
  needsExpiry?: boolean;
}

export interface SupervisorRequest {
  id: string;
  vendorId?: string | null;
  vendorName?: string;
  vendorShortName?: string;
  type: RequestTypeKey;
  title: string;
  reason: string;
  raisedBy: string;
  raisedAt: string;
  slaHours: number;
  status: 'open' | 'resolved';
  outcome?: RequestOutcomeKey | string;
  supervisorNote?: string;
  resolvedAt?: string;
  detail?: {
    control?: string;
    compensating?: string;
    proposedExpiry?: string;
    threshold?: string;
    trigger?: string;
    fourEyes?: string;
    openFindings?: string;
    evidence?: string;
    raisedFrom?: string;
    before?: string;
    after?: string;
    effect?: string;
    source?: string;
    exposure?: string;
    lastDiligence?: string;
    [key: string]: any;
  };
  // Computed helpers
  ageHours?: number;
  breached?: boolean;
}

export interface ProcurementRequest {
  id: string;
  title: string;
  vendorId: string;
  vendor: string;
  amount: string;
  due: string;
  status: string;
  tone: 'blue' | 'amber' | 'violet' | 'green' | 'red' | 'neutral';
}

export interface RiskException {
  id: string;
  requestId: string;
  vendorId?: string;
  vendorName?: string;
  vendorShortName?: string;
  title: string;
  grantedAt: string;
  expiresAt: string;
  lapsed: boolean;
  lapsingSoon: boolean;
  daysLeft: number;
  detail?: any;
}
