export interface PolicyClause {
  id: string;
  source: string;
  title: string;
  requirement: string;
  severity: 'high' | 'medium' | 'low';
}

export const POLICY_SOURCES: Record<string, string> = {
  PROC: 'StyleSphere Company Procurement Policy v4.2',
  SCOC: 'Supplier Code of Conduct (2026 revision)',
  IEC: 'Foreign Trade Policy — Importer-Exporter Code',
  GST: 'GST / national tax registration rules',
  REG: 'StyleSphere Regulatory Standards Register',
  FIN: 'Group Treasury — Supplier Payment Controls',
};

const clause = (
  id: string,
  sourceKey: string,
  title: string,
  requirement: string,
  severity: 'high' | 'medium' | 'low'
): PolicyClause => ({
  id,
  source: POLICY_SOURCES[sourceKey] || sourceKey,
  title,
  requirement,
  severity,
});

export const POLICY_CLAUSES: Record<string, PolicyClause> = {
  'PROC-2.1': clause('PROC-2.1', 'PROC', 'Single verified legal identity',
    'A supplier must present one consistent registered legal entity name across every submitted document. Variations limited to legal-form abbreviation (Ltd. / Limited / Co., Ltd.) are acceptable and do not require escalation.', 'high'),

  'PROC-2.4': clause('PROC-2.4', 'PROC', 'No duplicate supplier records',
    'A manufacturing site already present in the supplier master may not be onboarded a second time under a different trading name. Matching tax registration, banking, or site address across applications must be resolved before review continues.', 'high'),

  'PROC-3.3': clause('PROC-3.3', 'PROC', 'Complete mandatory evidence pack',
    'Onboarding review may not conclude until every mandatory document for the supplier category and country of manufacture has been received and verified.', 'high'),

  'PROC-5.1': clause('PROC-5.1', 'PROC', 'Human approval is mandatory',
    'No automated system may approve, reject, or activate a supplier. A named human with approval authority must record the final decision, with a stated reason, before ERP activation.', 'high'),

  'PROC-6.2': clause('PROC-6.2', 'PROC', 'Evidence validity window',
    'Certificates and licences must remain valid for the full initial contract term. Evidence expiring within 90 days must be confirmed as under renewal before approval.', 'medium'),

  'GST-1.2': clause('GST-1.2', 'GST', 'Tax registration format and status',
    'The tax registration number must match the issuing jurisdiction\'s format and resolve to an active registration on the national registry.', 'high'),

  'IEC-2.3': clause('IEC-2.3', 'IEC', 'Import / export licence currency',
    'A valid, unexpired import-export code or national export licence is mandatory for any supplier shipping across a customs border.', 'high'),

  'FIN-4.1': clause('FIN-4.1', 'FIN', 'Bank account belongs to the contracting entity',
    'The account holder named on the bank verification letter must be the same legal entity as the one on the tax registration. Payment may not be released to a third-party account.', 'high'),

  'INS-3.1': clause('INS-3.1', 'REG', 'Liability insurance floor',
    'Suppliers must carry general liability cover of at least USD 2,000,000 for the duration of the supply agreement.', 'medium'),

  'SCC-7.4': clause('SCC-7.4', 'SCOC', 'Independent social compliance audit',
    'Every manufacturing site must hold a current third-party social compliance audit (WRAP, BSCI, SA8000 or equivalent) no older than 18 months.', 'high'),

  'REG-9.1': clause('REG-9.1', 'REG', 'REACH restricted substances',
    'Leather, textile and hardware components entering the EU must be certified against the current REACH Annex XVII restricted substance list.', 'high'),

  'REG-9.4': clause('REG-9.4', 'REG', 'Chromium VI in tanned leather',
    'Chrome-tanned leather articles require an ISO 17075 chromium VI test below 3 mg/kg. This test is mandatory and non-waivable for all leather goods suppliers.', 'high'),
};

export const DOC_CLAUSE: Record<string, string> = {
  TAX: 'GST-1.2',
  IEC: 'IEC-2.3',
  LICENSE: 'PROC-2.1',
  BANK: 'FIN-4.1',
  COI: 'INS-3.1',
  AUDIT: 'SCC-7.4',
  REACH: 'REG-9.1',
  ISO17075: 'REG-9.4',
  ISO: 'SCC-7.4',
  OEKO: 'REG-9.1',
  BAA: 'PROC-2.1',
};

export const getClause = (id: string): PolicyClause | null => POLICY_CLAUSES[id] || null;
