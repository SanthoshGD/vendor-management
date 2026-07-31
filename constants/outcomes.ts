import {
  Activity, AlertCircle, Bot, CheckCircle2, Clock3, Upload,
  Users, Sparkles, ShieldCheck, Settings,
} from 'lucide-react';
import type { ActionType } from '../types/audit';
import type { RequestTypeKey, RequestTypeMeta, RequestOutcomeKey, RequestOutcomeMeta } from '../types/request';

export const ACTION_META: Record<ActionType, [any, string]> = {
  FIELD_ACCEPT: [CheckCircle2, 'green'],
  FIELD_OVERRIDE: [Sparkles, 'violet'],
  DOCUMENT_UPLOAD: [Upload, 'blue'],
  DOCUMENT_VERIFIED: [CheckCircle2, 'green'],
  DECISION: [ShieldCheck, 'green'],
  VENDOR_INVITED: [Users, 'blue'],
  AI_REVIEW: [Sparkles, 'violet'],
  AGENT_ACTION: [Bot, 'violet'],
  AGENT_BLOCKED: [ShieldCheck, 'red'],
  AGENT_PENDING: [Clock3, 'amber'],
  AGENT_APPROVAL: [CheckCircle2, 'green'],
  AGENT_CONFIG: [Settings, 'blue'],
  GATE_BLOCKED: [ShieldCheck, 'red'],
  ESCALATION_RESOLVED: [ShieldCheck, 'violet'],
};

export const REQUEST_TYPES: Record<RequestTypeKey, RequestTypeMeta> = {
  RISK_ACCEPTANCE: { label: 'Risk acceptance', tone: 'amber', outcomes: ['GRANT', 'REJECT', 'RETURN'] },
  AUTHORITY: { label: 'Delegated limit breach', tone: 'violet', outcomes: ['APPROVE', 'REJECT', 'RETURN'] },
  ESCALATION: { label: 'Reviewer escalation', tone: 'red', outcomes: ['APPROVE', 'REJECT', 'RETURN'] },
  POLICY_CHANGE: { label: 'Policy change', tone: 'blue', outcomes: ['UPDATE_GATE', 'REJECT'] },
  REASSESSMENT: { label: 'Continuous monitoring alert', tone: 'red', outcomes: ['CONFIRM', 'WAIVE', 'EXEMPT', 'SUSPEND'] },
};

export const REQUEST_OUTCOMES: Record<RequestOutcomeKey | string, RequestOutcomeMeta> = {
  GRANT: { label: 'Grant exception', copy: 'Clear the finding under your delegated risk-acceptance authority.', audit: 'Risk acceptance granted', tone: 'primary', needsExpiry: true },
  APPROVE: { label: 'Approve request', copy: 'Approve the reviewer\'s proposal and return the case for activation.', audit: 'Request approved', tone: 'primary' },
  REJECT: { label: 'Reject request', copy: 'Decline the request and instruct the team to enforce the baseline control.', audit: 'Request rejected', tone: 'danger' },
  RETURN: { label: 'Hand back to reviewer', copy: 'Return the case to the reviewer\'s queue with instructions for missing evidence.', audit: 'Handed back to reviewer', tone: 'secondary' },
  CONFIRM: { label: 'Confirm hit & reopen diligence', copy: 'Reopen the vendor\'s diligence pack for a fresh review.', audit: 'Monitoring hit confirmed', tone: 'primary' },
  WAIVE: { label: 'Waive as non-material', copy: 'Clear the alert without changing the vendor\'s approval status.', audit: 'Monitoring alert waived', tone: 'secondary' },
  EXEMPT: { label: 'Exempt vendor category', copy: 'Update policy to exclude this category from this specific check.', audit: 'Category exempted from check', tone: 'secondary' },
  UPDATE_GATE: { label: 'Update platform policy', copy: 'Apply the proposed policy change across all future reviews.', audit: 'Platform policy updated', tone: 'primary' },
  SUSPEND: { label: 'Suspend vendor immediately', copy: 'Block the vendor in ERP and notify sourcing to halt orders.', audit: 'Vendor suspended', tone: 'danger' },
};

export const FINDING_OUTCOMES: Record<string, [string, string]> = Object.freeze({
  accept: ['Accepted the agent\'s reading', 'Reviewer agreed with the finding and cleared it.'],
  dismiss: ['Dismissed as a false positive', 'Reviewer judged the finding incorrect on the evidence.'],
  mitigated: ['Resolved outside the system', 'Reviewer confirmed the issue was settled with the supplier directly.'],
});

export const REASON_TAXONOMY = [
  'OCR typo / low-contrast scan',
  'Legal name mismatch across documents',
  'Expired certificate / date discrepancy',
  'Updated document re-issued by vendor',
  'Regulatory or currency format variance',
  'Registry record verified externally',
] as const;

export const APPROVAL_CEILING = 70;

export const DEFAULT_SETTINGS = { density: 'comfortable', notifications: true };

