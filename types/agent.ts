export interface AgentDefinition {
  id: string;
  name: string;
  role?: string;
  glyph: string;
  tone: 'blue' | 'amber' | 'violet' | 'green' | 'red' | 'neutral';
  blurb?: string;
  capability?: string;
  thresholdLabel?: string;
  thresholdDefault?: string;
  enabled?: boolean;
  threshold?: number | string;
  fourEyes?: boolean;
  purpose?: string;
  autonomy?: string;
  channels?: string[];
  skills?: any[];
  rules?: any[];
  governance?: string;
  boundaries?: string[];
  actions?: any[];
  context?: any[];
}

export interface AgentConfig {
  version: number;
  updatedAt: string;
  updatedBy: string;
  note?: string;
  acceptedWorkflowChanges?: any[];
  retiredAt?: string;
  agents: AgentDefinition[];
}

export interface AgentProposal {
  id: string;
  vendorId: string;
  vendorName: string;
  agentId: string;
  agentName: string;
  actionId: string;
  summary: string;
  proposedAt: string;
  status: 'pending' | 'accepted' | 'declined';
  resolution?: string;
  resolvedAt?: string;
}

export interface AssessmentFinding {
  id: string;
  code: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  blurb: string;
  resolved: boolean;
  fieldKey?: string;
  docId?: string;
}

export interface AssessmentBlocker {
  kind: 'mismatch' | 'missing' | 'expiring' | 'finding';
  title: string;
  detail: string;
}

export interface TriageAssessment {
  band: 'decide' | 'blocked' | 'working' | 'ready';
  headline: string;
  waitingOn?: string;
  agentId?: string;
  stats: {
    checked: number;
    autoCleared: number;
    needsHuman: number;
    chasing: number;
  };
  open: AssessmentFinding[];
  blockers: AssessmentBlocker[];
  findings?: AssessmentFinding[];
  reasons?: string[];
  docCount?: number;
}
