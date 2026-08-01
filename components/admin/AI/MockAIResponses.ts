export interface AICopilotCard {
  title: string;
  subtitle?: string;
  riskScore?: number;
  riskLevel?: 'Low' | 'Medium' | 'High';
  country?: string;
  assignedReviewer?: string;
  status: string;
  actions: { label: string; actionId: string; payload?: any }[];
  details?: { label: string; value: string | number }[];
}

export interface AICopilotTable {
  headers: string[];
  rows: Array<{
    id: string; // for actions
    cells: string[];
  }>;
}

export interface AICopilotResponse {
  summary: string;
  reasons?: string[];
  recommendation?: string;
  confidence?: number;
  sources?: string[];
  cards?: AICopilotCard[];
  table?: AICopilotTable;
  details?: { label: string; value: string | number }[];
}

export const MOCK_AI_RESPONSES: Record<string, AICopilotResponse> = {
  // 1. Pending vendors query
  'show pending vendors': {
    summary: 'Found 3 pending vendors awaiting compliance review in the active queue.',
    reasons: [
      'Shanghai Textile Co. — Expiring liability insurance (5 days left)',
      'Hualong Garment Factory — Unverified GST certificate',
      'Vietnam SilkRoad Co. — Risk flags on supplier code of conduct signature'
    ],
    table: {
      headers: ['Vendor', 'Country', 'Risk', 'Assigned Executive', 'Days Waiting'],
      rows: [
        { id: 'v3', cells: ['Hualong Garment Factory', 'China', 'High', 'Elena Rostova', '3 days'] },
        { id: 'v11', cells: ['Mumbai Garment House', 'India', 'Low', 'Priya Sharma', '1 day'] },
        { id: 'v4', cells: ['Vietnam SilkRoad Co.', 'Vietnam', 'Medium', 'Elena Rostova', '4 days'] }
      ]
    },
    sources: ['Vendor Database', 'Compliance Rules Table', 'onboarding_queue_v2']
  },

  // 2. High risk query
  'high risk vendors': {
    summary: 'The following high-risk vendors require immediate attention due to automated deterministic compliance flags.',
    cards: [
      {
        title: 'Hualong Garment Factory',
        subtitle: 'Entity mismatch & Expired Certificates',
        riskScore: 78,
        riskLevel: 'High',
        country: 'China',
        assignedReviewer: 'Elena Rostova',
        status: 'In Review',
        actions: [
          { label: 'View Details', actionId: 'open_vendor', payload: 'v3' },
          { label: 'Inspect Docs', actionId: 'open_docs', payload: 'v3' }
        ],
        details: [
          { label: 'GST Matching', value: 'Mismatch (Tax vs Registry)' },
          { label: 'Liability Policy', value: 'Expires in 5 days' }
        ]
      }
    ],
    sources: ['Deterministic Risk Model', 'Doc Verification Log', 'GST Registry API']
  },

  // 3. Expiring documents
  'expiring documents': {
    summary: 'Found 2 documents expiring within the next 30 days that require update requests.',
    reasons: [
      'Hualong Garment Factory — Liability Insurance Certificate expires 06 Aug 2026',
      'Wei Mingzhi Ltd — ISO Quality Certificate expires 25 Aug 2026'
    ],
    table: {
      headers: ['Vendor', 'Document Type', 'Expiry Date', 'Assigned Reviewer'],
      rows: [
        { id: 'v3', cells: ['Hualong Garment Factory', 'Liability Insurance', '06 Aug 2026', 'Elena Rostova'] },
        { id: 'v1', cells: ['Wei Mingzhi Ltd', 'ISO Quality Cert', '25 Aug 2026', 'Priya Sharma'] }
      ]
    },
    sources: ['Insurance Certificate Database', 'ISO Registry Audit']
  },

  // 4. Missing Compliance Certificate
  'missing compliance': {
    summary: 'Discovered 1 vendor with pending mandatory compliance certificates.',
    reasons: [
      'Mumbai Garment House — Missing Bank Account Verification Letter and Supplier Code of Conduct'
    ],
    cards: [
      {
        title: 'Mumbai Garment House',
        subtitle: 'Missing compliance docs',
        riskLevel: 'Low',
        country: 'India',
        status: 'Profile Submitted',
        actions: [
          { label: 'Open Profile', actionId: 'open_vendor', payload: 'v11' }
        ]
      }
    ],
    sources: ['Internal Onboarding Matrix', 'Supplier Upload Bucket']
  },

  // 5. China suppliers
  'china suppliers': {
    summary: 'Found 3 registered suppliers operating from mainland China.',
    table: {
      headers: ['Vendor Name', 'Province/Region', 'Risk Category', 'Approval Status'],
      rows: [
        { id: 'v3', cells: ['Hualong Garment Factory', 'Zhejiang', 'High', 'In Review'] },
        { id: 'v1', cells: ['Wei Mingzhi Leather Goods', 'Guangdong', 'Low', 'Approved'] },
        { id: 'v2', cells: ['Dongfang Footwear Export', 'Fujian', 'Low', 'Approved'] }
      ]
    },
    sources: ['Vendor Profile Registry', 'Region Mapping Metadata']
  },

  // 6. Approval summary
  'approval summary': {
    summary: 'Onboarding and approval statistics for today.',
    details: [
      { label: 'Approved Today', value: 4 },
      { label: 'SLA Passed', value: '100%' },
      { label: 'Average Verification Time', value: '14.2 hours' },
      { label: 'Auto-Approved rate (China)', value: '88%' }
    ],
    sources: ['Daily Performance Metrics', 'Audit Logs Table']
  },

  // 7. Expiring Insurance
  'which insurance expires next week?': {
    summary: 'One vendor has an insurance policy expiring within 7 days.',
    cards: [
      {
        title: 'Hualong Garment Factory',
        subtitle: 'Liability Insurance Expiry Warning',
        riskScore: 78,
        riskLevel: 'High',
        country: 'China',
        status: 'Doc Review',
        actions: [
          { label: 'Request Update', actionId: 'comms_send', payload: { vendorId: 'v3', msg: 'Please upload your renewed Liability Insurance Certificate.' } }
        ],
        details: [
          { label: 'Policy Number', value: 'POL-9930-X3' },
          { label: 'Expiration', value: '06 Aug 2026' }
        ]
      }
    ],
    sources: ['Liability Database Index', 'Active Vendor Contracts']
  },

  // 8. Why is Shanghai Textile/Hualong high risk?
  'why is hualong garment factory high risk?': {
    summary: 'The deterministic risk engine calculated a High Risk Score of 78/100 for Hualong Garment Factory due to several compliance violations.',
    reasons: [
      'Liability Insurance Certificate expires in 5 days (+25 Risk Weight)',
      'GST Registration certificate matching failed; local tax entity name does not align with corporate Registry database (+20 Risk Weight)',
      'Bank account verification letter missing official seal (+15 Risk Weight)'
    ],
    recommendation: 'Do not approve this vendor. Please open Vendor Details, select the Documents tab, and click Reject on the tax certificate and bank letter requesting new uploads.',
    confidence: 94,
    sources: ['Tax Authority API Validator', 'Deterministic Risk Engine', 'Internal Audit Policy V4']
  },

  // 9. Summarize Hualong
  'summarize hualong garment factory': {
    summary: 'Hualong Garment Factory is a major apparel supplier based in Zhejiang, China. They are currently in Stage 3 (Doc Review).',
    details: [
      { label: 'AI Extraction', value: '27 fields matched, 3 errors flagged' },
      { label: 'Executive Owner', value: 'Elena Rostova (Vendor Executive)' },
      { label: 'Verification Rate', value: '4 of 6 approved' }
    ],
    recommendation: 'Perform manual verification on the tax certificate and request clarification via the Communication panel.',
    sources: ['Vendor Registration Profile', 'AI Extraction Agent Log']
  },

  // 10. List product catalog
  'product catalog': {
    summary: 'Retrieved the latest product catalog submissions awaiting approval.',
    table: {
      headers: ['SKU', 'Product Name', 'Category', 'Vendor Name', 'Status'],
      rows: [
        { id: 'prod-1', cells: ['prod-1', 'Crewneck Cotton T-Shirt', 'Apparels', 'Hualong Garment Factory', 'Approved'] },
        { id: 'prod-2', cells: ['prod-2', 'Heavyweight Fleece Pullover Hoodie', 'Apparels', 'Hualong Garment Factory', 'Approved'] },
        { id: 'prod-9', cells: ['prod-9', 'Minimalist Steel Chronograph Watch', 'Watches', 'Mingde Watch Trading Co.', 'Pending'] }
      ]
    },
    sources: ['Product Verification Database', 'Catalog Seed v2']
  },

  // 11. Vendor onboarding status
  'onboarding status': {
    summary: 'Active status breakdown for current vendor onboarding pipeline.',
    details: [
      { label: 'Invited Stage', value: 2 },
      { label: 'Profile Submitted', value: 1 },
      { label: 'Doc Review Workspace', value: 1 },
      { label: 'Verified & Approved', value: 3 }
    ],
    sources: ['Nexus Context Onboarding Matrix']
  },

  // 12. Risk Analysis
  'risk analysis': {
    summary: 'Risk breakdown score across all active suppliers.',
    table: {
      headers: ['Supplier', 'Score', 'Level', 'Primary Reason'],
      rows: [
        { id: 'v3', cells: ['Hualong Garment Factory', '78/100', 'High', 'Entity name mismatch'] },
        { id: 'v4', cells: ['Vietnam SilkRoad Co.', '42/100', 'Medium', 'ISO audit pending'] },
        { id: 'v1', cells: ['Wei Mingzhi Leather Goods', '12/100', 'Low', 'All checks passed'] }
      ]
    },
    sources: ['Risk Triage Dashboard service']
  },

  // 13. Audit history
  'audit history': {
    summary: 'Recent audit logs for onboarding and compliance decisions.',
    table: {
      headers: ['Timestamp', 'Target', 'Action', 'Authorized By', 'Result'],
      rows: [
        { id: 'v3', cells: ['10 mins ago', 'Hualong Garment', 'Document Rejected', 'System AI', 'Tax Cert Rejected'] },
        { id: 'v1', cells: ['1 hour ago', 'Wei Mingzhi', 'Vendor Approved', 'Elena Rostova', 'Onboarding Complete'] }
      ]
    },
    sources: ['System Audit Feed Ledger']
  },

  // 14. Vendor communications
  'vendor communications': {
    summary: 'Unresolved communication logs and threads for active suppliers.',
    reasons: [
      'Hualong Garment: Executive sent request for liability certificate update (Awaiting Reply)',
      'Vietnam SilkRoad: Vendor asked about ISO document scope (Reply needed)'
    ],
    sources: ['Vendor Messenger Engine', 'Intercom Connector']
  },

  // 15. Compliance checks
  'compliance checks': {
    summary: 'Deterministic compliance checks execution details.',
    table: {
      headers: ['Check ID', 'Validation Name', 'Target Field', 'Status'],
      rows: [
        { id: 'check-1', cells: ['Tax-ID-Match', 'GST/VAT Matching', 'Registration ID', 'Passed'] },
        { id: 'check-2', cells: ['COI-Validity', 'Certificate Expiry Check', 'End Date', 'Warning'] }
      ]
    },
    sources: ['Compliance Rules Catalog']
  },

  // 16. AI explanations
  'ai explanation': {
    summary: 'The StyleSphere compliance AI processes document uploads in three stages: OCR Text Extraction, NLP Entity Extraction, and External Registry Cross-Reference (e.g. government tax database). Any mismatch triggers a manual review exception.',
    sources: ['StyleSphere Technical Specs V1']
  },

  // 17. Approval recommendations
  'approval recommendations': {
    summary: 'AI Copilot auto-review recommendations for the current active list:',
    reasons: [
      'Wei Mingzhi Leather Goods: RECOMMENDED APPROVE (All documentation verified with 100% extract confidence)',
      'Hualong Garment Factory: RECOMMENDED REJECT / REQUEST CORRECTION (Entity mismatch and expired insurance detected)'
    ],
    sources: ['Triage Engine Recommendation Matrix']
  },

  // 18. Executive summaries
  'executive summaries': {
    summary: 'Executive summary of compliance operations:',
    reasons: [
      'Active Vendors Onboarded: 8',
      'Average onboarding SLA duration: 23 hours',
      'AI accuracy verification rate: 98.4%',
      'Active compliance exceptions: 1 (Zhejiang, China)'
    ],
    sources: ['Operations Audit Ledger']
  },

  // 19. Find rejected vendors
  'find rejected vendors': {
    summary: 'Found 1 supplier currently marked as Rejected due to documentation failure.',
    cards: [
      {
        title: 'Vietnam SilkRoad Co.',
        subtitle: 'Document verification failed',
        riskLevel: 'High',
        country: 'Vietnam',
        status: 'Rejected',
        actions: [
          { label: 'Re-open Chat', actionId: 'open_comms', payload: 'v4' }
        ],
        details: [
          { label: 'Rejection Reason', value: 'Supplier Code of Conduct signoff unvalidated' }
        ]
      }
    ],
    sources: ['Nexus Database Archives']
  },

  // 20. Shanghai Textile query
  'why is shanghai textile high risk?': {
    summary: 'The risk engine flagged Shanghai Textile Co. at 82/100 due to severe document compliance failures.',
    reasons: [
      'Liability Insurance certificate expires in 5 days (+25)',
      'GST Registration certificate mismatch: Tax registry returns "Shanghai Textile Joint Stock" but uploaded legal name reads "SilkRoad Textiles Co." (+30)',
      'Missing bank verification letter upload (+15)'
    ],
    recommendation: 'Request updated liability insurance certificate and a corrected bank account verification letter.',
    confidence: 96,
    sources: ['Tax Registry API', 'Doc Extract Log']
  },

  // 21. Which vendors need attention?
  'which vendors need attention?': {
    summary: 'I located 3 vendors requiring immediate review due to outstanding compliance violations.',
    reasons: [
      'Hualong Garment Factory (Zhejiang, China) — Expiring insurance & unverified GST',
      'Vietnam SilkRoad Co. (Vietnam) — Rejected Supplier Code of Conduct'
    ],
    table: {
      headers: ['Vendor', 'Country', 'SLA Waiting', 'Critical Exception'],
      rows: [
        { id: 'v3', cells: ['Hualong Garment Factory', 'China', '3 days', 'Tax & Insurance Mismatch'] },
        { id: 'v4', cells: ['Vietnam SilkRoad Co.', 'Vietnam', '4 days', 'Signoff Rejected'] }
      ]
    },
    sources: ['Nexus Priority Engine Index']
  },

  // 22. General help fallback
  'help': {
    summary: 'How can I assist you with StyleSphere Compliance? You can type commands like:',
    reasons: [
      '"show pending vendors" to list review pipeline',
      '"why is hualong garment factory high risk?" to get detailed compliance logs',
      '"expiring documents" to audit certificates',
      '"china suppliers" to view regional distribution',
      '"product catalog" to view submitted products'
    ],
    sources: ['Help Documentation Index']
  }
};

// Generates fallback mock responses for phrases that might not be exact keys
export function getMockAIResponse(query: string): AICopilotResponse {
  const normalized = query.trim().toLowerCase();
  
  // Try exact matches
  if (MOCK_AI_RESPONSES[normalized]) {
    return MOCK_AI_RESPONSES[normalized];
  }

  // Try partial searches
  for (const [key, resp] of Object.entries(MOCK_AI_RESPONSES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return resp;
    }
  }

  // Let's create smart dynamic falls
  if (normalized.includes('vendor') || normalized.includes('review') || normalized.includes('pending')) {
    return MOCK_AI_RESPONSES['show pending vendors'];
  }
  if (normalized.includes('risk') || normalized.includes('score')) {
    return MOCK_AI_RESPONSES['high risk vendors'];
  }
  if (normalized.includes('insurance') || normalized.includes('expire') || normalized.includes('date')) {
    return MOCK_AI_RESPONSES['expiring documents'];
  }
  if (normalized.includes('china') || normalized.includes('chinese')) {
    return MOCK_AI_RESPONSES['china suppliers'];
  }
  if (normalized.includes('product') || normalized.includes('catalog')) {
    return MOCK_AI_RESPONSES['product catalog'];
  }
  if (normalized.includes('summary') || normalized.includes('onboarding') || normalized.includes('audit')) {
    return MOCK_AI_RESPONSES['approval summary'];
  }

  // Fallback generic response
  return {
    summary: `Processed query: "${query}". StyleSphere AI verified the active vendor catalog context. No direct critical flags matched this exact term.`,
    reasons: [
      'Verified with the Supabase index of 8 active vendor credentials',
      'Deterministic compliance rules matching completed with zero exceptions'
    ],
    sources: ['Supabase Vendor Index', 'Gemini RAG context-agent']
  };
}
