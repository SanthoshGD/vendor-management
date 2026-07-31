import type { Vendor } from '../types/vendor';
import type { AuditLogEntry } from '../types/audit';

export function downloadComplianceReport(vendors: Vendor[], auditLogs: AuditLogEntry[]): void {
  const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [[
    'Vendor ID', 'Vendor', 'Country', 'Category', 'Stage', 'Status', 'Progress %',
    'Documents verified', 'Documents outstanding', 'Open findings', 'Risk', 'Risk score', 'Owner', 'SLA', 'ERP ID',
  ]];

  for (const v of vendors) {
    rows.push([
      v.id, v.name, v.country, v.category, v.stage || '', v.status || '', v.progress || 0,
      v.docs || 0, v.missingCount || 0, v.openFindings || 0, v.risk || '', v.riskScore || 0,
      v.owner, v.sla, v.erpId || '',
    ]);
  }

  rows.push([]);
  rows.push(['Audit trail']);
  rows.push(['Timestamp', 'Vendor', 'Actor', 'Action', 'Document', 'Field', 'Original value', 'Human value', 'Reason']);

  for (const log of auditLogs) {
    rows.push([
      log.timestamp, log.vendorName, log.actorName, log.actionType,
      log.documentName || '', log.fieldLabel || '', log.originalValue || '',
      log.humanValue || '', log.reason || '',
    ]);
  }

  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stylesphere-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
