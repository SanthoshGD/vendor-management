export type ActionType =
  | 'FIELD_ACCEPT'
  | 'FIELD_OVERRIDE'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_VERIFIED'
  | 'DECISION'
  | 'VENDOR_INVITED'
  | 'AI_REVIEW'
  | 'AGENT_ACTION'
  | 'AGENT_BLOCKED'
  | 'AGENT_PENDING'
  | 'AGENT_APPROVAL'
  | 'AGENT_CONFIG'
  | 'GATE_BLOCKED'
  | 'ESCALATION_RESOLVED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  vendorId: string;
  vendorName: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: ActionType;
  documentId?: string | null;
  documentName?: string | null;
  fieldKey?: string | null;
  fieldLabel?: string | null;
  originalValue?: string | null;
  humanValue?: string | null;
  reason?: string | null;
}
