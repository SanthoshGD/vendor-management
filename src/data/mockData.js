// Canonical vendor, document, and audit dataset for StyleSphere Vendor Nexus.
//
// Design note: a field's on-canvas bounding box is DERIVED at render time in
// DocumentCanvas.jsx from the field's position inside `fields` (see
// `layoutFields` there). That keeps the highlight box and the rendered row
// guaranteed to match - nothing here needs hand-tuned pixel coordinates.

export const CURRENT_USERS = {
  // `customer` is retained as an alias of `admin` so existing audit entries and
  // any caller that still asks for CURRENT_USERS.customer keeps working.
  admin: { id: 'PN-014', name: 'Priya Nair', role: 'Compliance Manager', initials: 'PN' },
  customer: { id: 'PN-014', name: 'Priya Nair', role: 'Compliance Manager', initials: 'PN' },
  supervisor: { id: 'AM-002', name: 'Arun Mehta', role: 'Head of Compliance', initials: 'AM' },
  vendor: { id: 'SUP-3312', name: 'Chen Wei', role: 'Export Manager', initials: 'CW' },
};

// AI never approves - it only extracts, scores, and flags. `resolved` tracks
// whether a *human* has explicitly accepted or corrected a field.
const field = (key, label, value, confidence, extra = {}) => ({
  key,
  label,
  value,
  confidence,
  resolved: false,
  humanVerified: false,
  ...extra,
});

const resolvedField = (key, label, value, confidence, extra = {}) => ({
  ...field(key, label, value, confidence, extra),
  resolved: true,
  humanVerified: true,
});

export const REASON_TAXONOMY = [
  'OCR typo / low-contrast scan',
  'Legal name mismatch across documents',
  'Expired certificate / date discrepancy',
  'Updated document re-issued by vendor',
  'Regulatory or currency format variance',
  'Registry record verified externally',
];

export const INITIAL_VENDORS = [
  {
    id: 'VEN-8842',
    initials: 'ST',
    name: 'SilkRoad Textiles Co., Ltd.',
    shortName: 'SilkRoad Textiles',
    country: 'Vietnam',
    category: 'T-shirts',
    contact: 'Nguyen Van Minh',
    email: 'compliance@silkroadtex.vn',
    owner: 'Elena Rostova',
    baseRiskScore: 78,
    slaHours: 6,
    sla: '6h',
    finalStatus: null,
    aiSummary: 'Established apparel manufacturer with a complete document pack. Three evidence conflicts need human judgement before a recommendation can be sent.',
    documents: [
      {
        id: 'doc-8842-tax', code: 'TAX', title: 'GST / Tax & Import-Export Registration',
        fileName: 'SilkRoad_Tax_Registration.pdf', pageCount: 2, docTemplate: 'certificate',
        language: null, status: 'Needs Review',
        fields: [
          field('legal_name', 'Legal entity name', 'SilkRoad Textiles Co., Ltd.', 96, {
            crossDocMismatch: true,
            mismatchNote: 'The bank verification letter lists the entity as "SilkRoad Textiles Ltd." - missing "Co.,".',
          }),
          field('tax_registration_number', 'Tax registration no.', '07AAAAA0000A1Z5', 96),
          field('expiration_date', 'Certificate expiry date', '31 Dec 2026', 68, {
            diagnostic: 'Source stamp is low-contrast; the year could read 2026 or 2027.',
          }),
          field('registered_address', 'Registered corporate address', 'No. 88 Binh Duong Blvd, Thuan An, Binh Duong, Vietnam', 72, {
            diagnostic: 'Low OCR contrast on the street-number segment - verify against source.',
          }),
        ],
      },
      {
        id: 'doc-8842-bank', code: 'BANK', title: 'Vietcombank Account Verification Letter',
        fileName: 'Vietcombank_Account_Letter.pdf', pageCount: 2, docTemplate: 'bank',
        language: 'vi', status: 'Flagged',
        fields: [
          field('bank_name', 'Banking institution', 'Ngân hàng TMCP Ngoại thương Việt Nam', 97, {
            translatedValue: 'Joint Stock Commercial Bank for Foreign Trade of Vietnam (Vietcombank)',
          }),
          field('account_holder_name', 'Account holder name', 'CÔNG TY TNHH DỆT MAY SILKROAD', 68, {
            translatedValue: 'SilkRoad Textiles Ltd.',
            crossDocMismatch: true,
            mismatchNote: 'Differs from the tax registration record: "SilkRoad Textiles Co., Ltd."',
          }),
          field('iban_account_no', 'SWIFT / account number', 'BFTVVNVX-0041000889211', 84, {
            diagnostic: 'Character 14 renders ambiguously - could be "8" or "B". Compare against the bank stamp.',
          }),
        ],
      },
      { id: 'doc-8842-iec', code: 'IEC', title: 'Import / Export Code (IEC) Licence', fileName: 'Vietnam_Customs_IEC_License.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('iec_code', 'Customs IEC licence number', 'IEC-VN-2022-998144', 99)] },
      { id: 'doc-8842-baa', code: 'BAA', title: 'Business Alliance Agreement', fileName: 'StyleSphere_Bilateral_BAA_Signed.pdf', pageCount: 8, docTemplate: 'legal', language: null, status: 'Verified', fields: [field('signatory_name', 'Authorized executive signatory', 'Nguyen Van Minh', 91)] },
      { id: 'doc-8842-iso', code: 'ISO', title: 'ISO 9001:2015 Quality Certification', fileName: 'SGS_ISO9001_Certificate.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('iso_audit_body', 'Certification body', 'SGS International Inspection Services Ltd.', 96)] },
      { id: 'doc-8842-coi', code: 'COI', title: 'Certificate of Liability Insurance', fileName: 'Allianz_Global_Liability_Policy.pdf', pageCount: 3, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('coverage_amount', 'General liability coverage', '$5,000,000 USD', 98)] },
      { id: 'doc-8842-audit', code: 'AUDIT', title: 'Social Compliance & WRAP Factory Audit', fileName: 'Intertek_WRAP_Gold_Audit_Report.pdf', pageCount: 14, docTemplate: 'audit', language: null, status: 'Verified', fields: [field('audit_score', 'WRAP social compliance rating', 'Gold Certificate (98.4 / 100)', 99)] },
      { id: 'doc-8842-oeko', code: 'OEKO', title: 'OEKO-TEX Standard 100 Eco-Certification', fileName: 'OEKO_TEX_Standard100.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('oeko_cert_no', 'OEKO-TEX certificate ID', '19.HVN.88412 HOHENSTEIN HTTI', 95)] },
    ],
  },
  {
    id: 'VEN-9104',
    initials: 'DA',
    name: 'Dhaka Apparel Crafts Ltd.',
    shortName: 'Dhaka Apparel Crafts',
    country: 'Bangladesh',
    category: 'Knitwear',
    contact: 'Tariq Rahman',
    email: 'info@dhakaapparel.bd',
    owner: 'Elena Rostova',
    baseRiskScore: 91,
    slaHours: 2,
    sla: '2h',
    finalStatus: null,
    aiSummary: 'Two mandatory documents are missing and one legal-name conflict is open. Review is paused until the supplier responds.',
    documents: [
      {
        id: 'doc-9104-tax', code: 'TAX', title: 'Tax Registration Certificate', fileName: 'Dhaka_Tax_Registration.pdf',
        pageCount: 2, docTemplate: 'certificate', language: null, status: 'Flagged',
        fields: [
          field('legal_name', 'Legal entity name', 'Dhaka Apparel Crafts Ltd.', 91, {
            crossDocMismatch: true,
            mismatchNote: 'Business Alliance Agreement lists "Dhaka Apparel Crafts Limited" - confirm which is authoritative.',
          }),
          field('tax_registration_number', 'Tax registration no.', 'BD-9911042', 82, {
            diagnostic: 'Faint secondary stamp overlaps the last two digits.',
          }),
        ],
      },
      { id: 'doc-9104-iec', code: 'IEC', title: 'Import / Export Code Licence', fileName: 'Dhaka_IEC_License.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('iec_code', 'Customs IEC licence number', 'IEC-BD-2021-441209', 97)] },
      { id: 'doc-9104-baa', code: 'BAA', title: 'Business Alliance Agreement', fileName: 'Dhaka_BAA_Signed.pdf', pageCount: 6, docTemplate: 'legal', language: null, status: 'Verified', fields: [field('signatory_name', 'Authorized executive signatory', 'Tariq Rahman', 93)] },
      { id: 'doc-9104-bank', code: 'BANK', title: 'Bank Account Verification Letter', fileName: 'Dhaka_Bank_Letter.pdf', pageCount: 1, docTemplate: 'bank', language: null, status: 'Verified', fields: [field('account_holder_name', 'Account holder name', 'Dhaka Apparel Crafts Ltd.', 95)] },
      { id: 'doc-9104-coi', code: 'COI', title: 'Certificate of Liability Insurance', fileName: '', pageCount: 0, docTemplate: 'certificate', language: null, status: 'Missing', fields: [] },
      { id: 'doc-9104-audit', code: 'AUDIT', title: 'Social Compliance Audit Summary', fileName: '', pageCount: 0, docTemplate: 'audit', language: null, status: 'Missing', fields: [] },
    ],
  },
  {
    id: 'VEN-3312',
    initials: 'ZF',
    name: 'Guangzhou Artisan Leathers Co., Ltd.',
    shortName: 'Guangzhou Artisan Leathers',
    country: 'China',
    category: 'Handbags',
    contact: 'Chen Wei',
    email: 'export@gz-artisanleather.cn',
    owner: 'Aarav Mehta',
    baseRiskScore: 38,
    slaHours: 29,
    sla: '29h',
    finalStatus: null,
    aiSummary: 'Handbag atelier supplying full-grain calfskin and cast hardware. The Mandarin business licence extracted cleanly, but the licence expiry is low-confidence and the chromium VI leather test has not been supplied.',
    documents: [
      {
        // The centrepiece of the AI review demo: a Mandarin source document where
        // confidence deliberately spans all three tiers, so a reviewer can see
        // an auto-cleared field, a borderline one, and a genuinely unreadable one
        // in a single pass.
        // No language in the title. The supplier uploads whatever their
        // registrar issued, and extraction handles the language  -  naming it
        // here would imply the checklist expects a particular one.
        id: 'doc-3312-license', code: 'LICENSE', title: 'Unified Business Licence', fileName: 'GZ_Artisan_Business_License.pdf',
        pageCount: 1, docTemplate: 'license', language: 'zh', status: 'Needs Review',
        fields: [
          field('legal_name', 'Legal entity name', '广州工匠皮革有限公司', 98, {
            translatedValue: 'Guangzhou Artisan Leathers Co., Ltd.',
          }),
          field('registration_number', 'Unified social credit code', '914401017219846352K', 99, {
            translatedValue: '914401017219846352K',
          }),
          field('legal_representative', 'Legal representative', '陈伟', 95, {
            translatedValue: 'Chen Wei',
          }),
          field('business_scope', 'Business scope', '皮革制品、五金配件制造', 92, {
            translatedValue: 'Leather goods and metal hardware manufacturing',
          }),
          field('material_testing', 'Material testing / REACH', '合格', 85, {
            translatedValue: 'Passed',
            diagnostic: 'Single-character result stamp with no test reference number - confirm it maps to the current REACH annex.',
          }),
          field('expiration_date', 'Licence expiry date', '2026年08月', 55, {
            translatedValue: 'Aug 2026',
            diagnostic: 'The red company seal overprints the month digits - this could read 08 or 06, and no day is stated.',
          }),
        ],
      },
      { id: 'doc-3312-tax', code: 'TAX', title: 'Tax Registration Certificate', fileName: 'GZ_Artisan_Tax_Certificate.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('tax_registration_number', 'Tax registration no.', 'CN-91440101-MA5R2', 97)] },
      { id: 'doc-3312-iec', code: 'IEC', title: 'Export Licence', fileName: 'GZ_Artisan_Export_License.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('iec_code', 'Customs export licence number', 'IEC-CN-2021-440318', 98)] },
      { id: 'doc-3312-audit', code: 'AUDIT', title: 'Factory Social Compliance Audit', fileName: 'GZ_Artisan_Factory_Audit.pdf', pageCount: 11, docTemplate: 'audit', language: null, status: 'Verified', fields: [field('audit_score', 'Social compliance rating', 'BSCI Grade A (96 / 100)', 98)] },
      { id: 'doc-3312-coi', code: 'COI', title: 'Certificate of Liability Insurance', fileName: 'PICC_Liability_Policy.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('coverage_amount', 'General liability coverage', '$5,000,000 USD', 97)] },
      { id: 'doc-3312-reach', code: 'REACH', title: 'REACH Chemical Compliance Certificate', fileName: 'GZ_Artisan_REACH_Cert.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('cert_number', 'Certificate number', 'REACH-CN-88213', 96)] },
      // Outstanding on purpose: this is what the vendor portal's upload dropzone
      // is for, and what blocks the customer's approval decision.
      { id: 'doc-3312-iso17075', code: 'ISO17075', title: 'ISO 17075 Chromium VI Leather Test', fileName: '', pageCount: 0, docTemplate: 'certificate', language: null, status: 'Missing', fields: [] },
    ],
  },
  // Seeded to exercise the Intake Agent's duplicate detection. This is the same
  // Guangzhou manufacturing site as VEN-3312 re-applying under a trading name:
  // the tax registration number is identical, which is exactly the signal a
  // document-by-document human review cannot see.
  {
    id: 'VEN-2208',
    initials: 'PR',
    name: 'Pearl River Leather Trading Co., Ltd.',
    shortName: 'Pearl River Leather',
    country: 'China',
    category: 'Handbags',
    contact: 'Lin Hui',
    email: 'sales@pearlriver-leather.cn',
    owner: 'Elena Rostova',
    baseRiskScore: 84,
    slaHours: 12,
    sla: '12h',
    finalStatus: null,
    aiSummary: 'New applicant from Guangdong. The tax registration on file already appears against another supplier record - resolve before review continues.',
    documents: [
      {
        id: 'doc-2208-tax', code: 'TAX', title: 'Tax Registration Certificate', fileName: 'PearlRiver_Tax_Certificate.pdf',
        pageCount: 1, docTemplate: 'certificate', language: null, status: 'Needs Review',
        fields: [
          field('legal_name', 'Legal entity name', 'Pearl River Leather Trading Co., Ltd.', 94),
          field('tax_registration_number', 'Tax registration no.', 'CN-91440101-MA5R2', 93),
        ],
      },
      { id: 'doc-2208-iec', code: 'IEC', title: 'Export Licence', fileName: 'PearlRiver_Export_License.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('iec_code', 'Customs export licence number', 'IEC-CN-2023-440902', 96)] },
      { id: 'doc-2208-bank', code: 'BANK', title: 'Bank Account Verification Letter', fileName: '', pageCount: 0, docTemplate: 'bank', language: null, status: 'Missing', fields: [] },
      { id: 'doc-2208-audit', code: 'AUDIT', title: 'Factory Social Compliance Audit', fileName: '', pageCount: 0, docTemplate: 'audit', language: null, status: 'Missing', fields: [] },
      { id: 'doc-2208-coi', code: 'COI', title: 'Certificate of Liability Insurance', fileName: 'PearlRiver_Liability_Policy.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('coverage_amount', 'General liability coverage', '$1,000,000 USD', 96)] },
    ],
  },
  {
    id: 'VEN-7041',
    initials: 'AL',
    name: 'Anatolia Leatherworks A.Ş.',
    shortName: 'Anatolia Leatherworks',
    country: 'Turkey',
    category: 'Wallets',
    contact: 'Mehmet Yilmaz',
    email: 'legal@anatolia-leather.tr',
    owner: 'Elena Rostova',
    baseRiskScore: 56,
    slaHours: 18,
    sla: '18h',
    finalStatus: null,
    aiSummary: 'Complete submission with one environmental certificate nearing expiry - not blocking, but worth confirming renewal timing.',
    documents: [
      {
        id: 'doc-7041-reach', code: 'REACH', title: 'REACH Chemical Compliance Certificate', fileName: 'Anatolia_REACH_Cert.pdf',
        pageCount: 2, docTemplate: 'certificate', language: null, status: 'Needs Review',
        fields: [
          field('cert_number', 'Certificate number', 'REACH-TR-55021', 95),
          field('certificate_expiry', 'Certificate expiry date', '07 Aug 2026', 82, {
            diagnostic: 'Expires in 12 days - confirm the renewal is already in progress with the vendor.',
          }),
        ],
      },
      { id: 'doc-7041-tax', code: 'TAX', title: 'Tax Registration Certificate', fileName: 'Anatolia_Tax_Certificate.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('tax_registration_number', 'Tax registration no.', 'TR-78144122', 97)] },
      { id: 'doc-7041-iec', code: 'IEC', title: 'Export Licence', fileName: 'Anatolia_Export_License.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('iec_code', 'Customs export licence number', 'IEC-TR-2019-771402', 98)] },
      { id: 'doc-7041-audit', code: 'AUDIT', title: 'Factory Social Compliance Audit', fileName: 'Anatolia_Factory_Audit.pdf', pageCount: 9, docTemplate: 'audit', language: null, status: 'Verified', fields: [field('audit_score', 'Social compliance rating', 'SA8000 Certified', 96)] },
      { id: 'doc-7041-coi', code: 'COI', title: 'Certificate of Liability Insurance', fileName: 'Anatolia_Liability_Policy.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [field('coverage_amount', 'General liability coverage', '$3,000,000 USD', 96)] },
    ],
  },
  {
    id: 'VEN-4491',
    initials: 'IG',
    name: 'Indus Garments Pvt. Ltd.',
    shortName: 'Indus Garments',
    country: 'India',
    category: 'Denim',
    contact: 'Rajesh Kumar',
    email: 'ops@indusgarments.in',
    owner: 'Aarav Mehta',
    baseRiskScore: 9,
    slaHours: 999,
    sla: '-',
    finalStatus: 'Active',
    aiSummary: 'All mandatory checks passed. Approved and activated in the ERP supplier master.',
    documents: [
      { id: 'doc-4491-tax', code: 'TAX', title: 'GST Registration Certificate', fileName: 'Indus_GST_Certificate.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [resolvedField('tax_registration_number', 'GST registration no.', '24AAACI4491P1Z4', 98)] },
      { id: 'doc-4491-iec', code: 'IEC', title: 'Import / Export Code Licence', fileName: 'Indus_IEC_License.pdf', pageCount: 1, docTemplate: 'certificate', language: null, status: 'Verified', fields: [resolvedField('iec_code', 'Customs IEC licence number', 'AAACI4491P', 99)] },
      { id: 'doc-4491-bank', code: 'BANK', title: 'Bank Account Verification Letter', fileName: 'Indus_Bank_Letter.pdf', pageCount: 1, docTemplate: 'bank', language: null, status: 'Verified', fields: [resolvedField('account_holder_name', 'Account holder name', 'Indus Garments Pvt. Ltd.', 98)] },
      { id: 'doc-4491-audit', code: 'AUDIT', title: 'Factory Social Compliance Audit', fileName: 'Indus_Factory_Audit.pdf', pageCount: 10, docTemplate: 'audit', language: null, status: 'Verified', fields: [resolvedField('audit_score', 'Social compliance rating', 'WRAP Gold (97.1 / 100)', 99)] },
      { id: 'doc-4491-coi', code: 'COI', title: 'Certificate of Liability Insurance', fileName: 'Indus_Liability_Policy.pdf', pageCount: 2, docTemplate: 'certificate', language: null, status: 'Verified', fields: [resolvedField('coverage_amount', 'General liability coverage', '$4,000,000 USD', 98)] },
    ],
  },
];

export const INITIAL_REQUESTS = [
  { id: 'PR-24018', title: 'Organic cotton jersey - 12,000 m', vendorId: 'VEN-8842', vendor: 'SilkRoad Textiles', amount: '$84,600', due: '29 Jul', status: 'Quote received', tone: 'violet' },
  { id: 'PR-24017', title: 'SS27 denim production run', vendorId: 'VEN-4491', vendor: 'Indus Garments', amount: '$126,400', due: '31 Jul', status: 'Vendor reviewing', tone: 'blue' },
  { id: 'PR-24013', title: 'Cast brass handbag hardware - clasps & feet', vendorId: 'VEN-3312', vendor: 'Guangzhou Artisan Leathers', amount: '$46,800', due: '02 Aug', status: 'Approved', tone: 'green' },
  { id: 'PR-24009', title: 'Premium leather belt blanks', vendorId: 'VEN-7041', vendor: 'Anatolia Leatherworks', amount: '$31,250', due: '05 Aug', status: 'Draft', tone: 'neutral' },
];

// ---------------------------------------------------------------------------
// Supervisor request types.
//
// These are not invented UI states - each one is a decision that real
// third-party risk programmes reserve for someone above the person doing the
// review, and each carries the evidence that decision is supposed to be made
// on. The four kinds, and why a supervisor rather than an admin owns them:
//
//   RISK_ACCEPTANCE  A control cannot be met, so the risk is formally accepted
//                    instead of resolved. TPRM practice requires this to be
//                    time-boxed, backed by a compensating control, and signed
//                    by someone with risk authority - an exception that never
//                    expires is the classic audit finding, so `expiresAt` is
//                    mandatory and the platform lapses it automatically.
//
//   AUTHORITY        The vendor's risk rating or contract value exceeds the
//                    reviewer's delegated approval limit. Nobody chose to
//                    escalate this; a delegation-of-authority threshold routed
//                    it up, and four-eyes means the person who did the review
//                    cannot also be the person who approves it.
//
//   POLICY_CHANGE    A change to what the agents are allowed to do. Whoever
//                    operates the agents should not also be able to widen
//                    their own permissions without a second signature.
//
//   REASSESSMENT     Continuous monitoring flagged an already-approved vendor
//                    (sanctions hit, adverse media, expiring certification,
//                    financial deterioration). Onboarding is a point-in-time
//                    check; this is the lifecycle catching up with it, and the
//                    decision - re-run diligence, accept, or suspend - is a
//                    risk decision, not a queue task.
//
// A fifth kind, ESCALATION, is the admin manually asking for help. It is kept
// separate from AUTHORITY on purpose: "I am not comfortable deciding this" and
// "the policy says I am not allowed to decide this" are different events, and
// collapsing them would hide how often the threshold is actually firing.
// ---------------------------------------------------------------------------
export const REQUEST_TYPES = {
  RISK_ACCEPTANCE: {
    label: 'Risk acceptance',
    blurb: 'A control cannot be met. Accepting the risk, time-boxed, with a compensating control.',
    tone: 'red',
    slaHours: 24,
    outcomes: ['GRANT', 'REFUSE', 'RETURN'],
  },
  AUTHORITY: {
    label: 'Above approval authority',
    blurb: 'The reviewer’s delegated limit does not cover this vendor. Four-eyes approval required.',
    tone: 'amber',
    slaHours: 48,
    outcomes: ['UPHOLD', 'REJECT', 'RETURN'],
  },
  ESCALATION: {
    label: 'Escalated by reviewer',
    blurb: 'The reviewer has asked for a judgement they do not want to make alone.',
    tone: 'violet',
    slaHours: 24,
    outcomes: ['UPHOLD', 'REJECT', 'RETURN'],
  },
  POLICY_CHANGE: {
    label: 'Agent policy change',
    blurb: 'A change to what the agents may do without a human. Needs a second signature.',
    tone: 'blue',
    slaHours: 48,
    outcomes: ['APPROVE', 'REJECT'],
  },
  REASSESSMENT: {
    label: 'Monitoring alert',
    blurb: 'Continuous monitoring flagged an approved vendor. Re-run diligence, accept, or suspend.',
    tone: 'red',
    slaHours: 24,
    outcomes: ['REASSESS', 'ACCEPT', 'SUSPEND'],
  },
};

// What each outcome does and how it is described. Kept in one table so the
// dialog copy, the audit entry and the resulting vendor state can never drift
// apart - they are all read from here.
export const REQUEST_OUTCOMES = {
  GRANT: {
    label: 'Grant the exception',
    copy: 'The vendor proceeds with the risk formally accepted. You must set an expiry - the exception lapses on that date and the finding reopens.',
    audit: 'Risk acceptance granted',
    needsExpiry: true,
    tone: 'primary',
  },
  REFUSE: {
    label: 'Refuse the exception',
    copy: 'The control stands. The finding stays open and the vendor cannot be approved until it is genuinely resolved.',
    audit: 'Risk acceptance refused',
    tone: 'danger',
  },
  UPHOLD: {
    label: 'Approve on my authority',
    copy: 'You are approving this vendor under your own delegated limit. Your name, not the reviewer’s, is on the decision.',
    audit: 'Approved by supervisor',
    tone: 'primary',
  },
  REJECT: {
    label: 'Reject',
    copy: 'The request is refused and the case closes. The reviewer and the supplier are notified.',
    audit: 'Rejected by supervisor',
    tone: 'danger',
  },
  RETURN: {
    label: 'Hand back',
    copy: 'Ownership returns to the person who raised it. Your instruction appears at the top of their review workspace until they act on it.',
    audit: 'Returned to the reviewer',
    tone: 'secondary',
  },
  APPROVE: {
    label: 'Approve the change',
    copy: 'The new agent configuration takes effect and becomes the current version. The previous version stays available to revert to.',
    audit: 'Agent policy change approved',
    tone: 'primary',
  },
  REASSESS: {
    label: 'Re-run diligence',
    copy: 'The vendor returns to review with a fresh evidence request. Their approved status is suspended while that happens.',
    audit: 'Re-assessment ordered',
    tone: 'primary',
  },
  ACCEPT: {
    label: 'Accept, keep active',
    copy: 'The alert is noted and the vendor stays active. Your rationale is what an auditor will read if this vendor later fails.',
    audit: 'Monitoring alert accepted',
    tone: 'secondary',
  },
  SUSPEND: {
    label: 'Suspend the vendor',
    copy: 'The vendor is suspended immediately and cannot be transacted with until the alert is cleared.',
    audit: 'Vendor suspended',
    tone: 'danger',
  },
};

const iso = (daysAgo, hour = 9, minute = 0) => {
  const d = new Date('2026-07-26T09:00:00Z');
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
};

const hoursAgo = (h) => {
  const d = new Date('2026-07-26T09:00:00Z');
  d.setUTCHours(d.getUTCHours() - h);
  return d.toISOString();
};
const daysAhead = (n) => {
  const d = new Date('2026-07-26T09:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
};

// A supervisor's queue is never empty and never uniform - the point of seeding
// it is that the page has to be readable when four different kinds of decision
// are sitting in it at once, one of them already past its SLA.
export const INITIAL_REQUESTS_TO_SUPERVISOR = [
  {
    id: 'REQ-4471',
    type: 'RISK_ACCEPTANCE',
    vendorId: 'VEN-8842',
    vendorName: 'SilkRoad Textiles Co., Ltd.',
    vendorShortName: 'SilkRoad Textiles',
    title: 'Accept an expired social-compliance audit for 60 days',
    reason: 'Their SA8000 certificate lapsed on 30 June. The re-audit is booked for 18 August and the auditor has confirmed the date in writing. Production slots for the SS27 run are lost if we hold the vendor until then.',
    raisedBy: 'Priya Nair',
    raisedById: 'PN-014',
    raisedAt: hoursAgo(31),
    slaHours: 24,
    riskScore: 78,
    detail: {
      control: 'PROC-4.2 - valid social compliance certification at approval',
      compensating: 'Pre-shipment inspection on every lot until the re-audit closes; no payment terms beyond 30 days.',
      proposedExpiry: daysAhead(60),
    },
    status: 'open', outcome: null, supervisorNote: '', resolvedAt: null, expiresAt: null,
  },
  {
    id: 'REQ-4468',
    type: 'AUTHORITY',
    vendorId: 'VEN-9104',
    vendorName: 'Dhaka Apparel Crafts Ltd.',
    vendorShortName: 'Dhaka Apparel Crafts',
    title: 'High-risk vendor exceeds the reviewer’s approval limit',
    reason: 'Evidence pack is complete and every finding is cleared. Residual risk score 91 sits above the 70 ceiling a Compliance Manager may approve alone, so it routes to you under the delegation of authority.',
    raisedBy: 'Priya Nair',
    raisedById: 'PN-014',
    raisedAt: hoursAgo(9),
    slaHours: 48,
    riskScore: 91,
    detail: {
      threshold: 'Compliance Manager may approve up to residual risk 70',
      trigger: 'Residual risk 91 · Bangladesh · knitwear',
      fourEyes: 'Reviewed by Priya Nair - she cannot also approve it.',
    },
    status: 'open', outcome: null, supervisorNote: '', resolvedAt: null, expiresAt: null,
  },
  {
    id: 'REQ-4462',
    type: 'REASSESSMENT',
    vendorId: 'VEN-3312',
    vendorName: 'Guangzhou Artisan Leathers Ltd.',
    vendorShortName: 'Guangzhou Artisan Leathers',
    title: 'Adverse media hit on an already-approved supplier',
    reason: 'Continuous monitoring matched two regional news reports alleging unpaid wages at a subcontracted finishing site. The supplier is active and shipping against PR-24013.',
    raisedBy: 'Continuous monitoring',
    raisedById: 'AGT-MONITOR',
    raisedAt: hoursAgo(4),
    slaHours: 24,
    riskScore: 46,
    detail: {
      source: '2 adverse-media matches · confidence 71%',
      exposure: 'Active supplier · $46,800 open on PR-24013',
      lastDiligence: 'Full diligence completed 12 weeks ago',
    },
    status: 'open', outcome: null, supervisorNote: '', resolvedAt: null, expiresAt: null,
  },
  {
    id: 'REQ-4459',
    type: 'POLICY_CHANGE',
    vendorId: null,
    vendorName: 'Platform',
    vendorShortName: 'Platform',
    title: 'Raise the Document Agent auto-clear threshold from 90% to 95%',
    reason: 'We are auto-clearing fields at 90% confidence and correcting roughly one in twenty by hand afterwards. Raising the bar to 95% sends more to a human but should stop the corrections.',
    raisedBy: 'Priya Nair',
    raisedById: 'PN-014',
    raisedAt: hoursAgo(20),
    slaHours: 48,
    riskScore: null,
    detail: {
      before: 'Document Agent · auto-clear at ≥ 90% confidence',
      after: 'Document Agent · auto-clear at ≥ 95% confidence',
      effect: 'Tightens what an agent may clear without a human. Reversible from the config history.',
    },
    status: 'open', outcome: null, supervisorNote: '', resolvedAt: null, expiresAt: null,
  },
];

// ---------------------------------------------------------------------------
// Inbound request templates, for the live generator.
//
// A queue design is only honest if you can see it under load, so the Requests
// page can pull realistic work out of these. They are written as real cases
// rather than lorem - "chromium VI test lapsed", "director appears on a PEP
// list" - because a queue full of placeholder text tells you nothing about
// whether the page is readable when it is full.
//
// Each template says which vendors it can plausibly attach to, so a monitoring
// alert never lands on a supplier that was never approved.
// ---------------------------------------------------------------------------
export const REQUEST_TEMPLATES = [
  {
    type: 'RISK_ACCEPTANCE',
    title: (v) => `Accept a lapsed chromium VI test for ${v.shortName}`,
    reason: () => 'The ISO 17075 certificate expired last month. New samples are with the lab and results are due in three weeks. Holding the vendor stops the autumn hardware run.',
    detail: (v, ahead) => ({
      control: 'PROC-4.4 - valid restricted-substance testing on all leather',
      compensating: 'Quarantine stock on arrival; release only against the lab result.',
      proposedExpiry: ahead(45),
    }),
  },
  {
    type: 'RISK_ACCEPTANCE',
    title: (v) => `Waive the insurance floor for ${v.shortName}`,
    reason: () => 'Their liability cover is $4m against our $5m minimum. The broker has confirmed the top-up binds at renewal on 1 October.',
    detail: (v, ahead) => ({
      control: 'PROC-2.1 - $5m minimum liability cover',
      compensating: 'Order value capped at $50k until the endorsement is on file.',
      proposedExpiry: ahead(70),
    }),
  },
  {
    type: 'AUTHORITY',
    title: (v) => `${v.shortName} exceeds the reviewer’s approval limit`,
    reason: (v) => `Evidence pack complete, all findings cleared. Residual risk ${v.riskScore} sits above the 70 ceiling a Compliance Manager may approve alone.`,
    detail: (v) => ({
      threshold: 'Compliance Manager may approve up to residual risk 70',
      trigger: `Residual risk ${v.riskScore} · ${v.country} · ${v.category}`,
      fourEyes: 'Reviewed by Priya Nair - she cannot also approve it.',
    }),
  },
  {
    type: 'AUTHORITY',
    title: (v) => `First order with ${v.shortName} is above the reviewer’s value limit`,
    reason: () => 'Opening order is $310,000 against a $250,000 delegated limit for a first-time supplier. Diligence is complete and clean.',
    detail: (v) => ({
      threshold: 'Compliance Manager may commit up to $250,000 to a new supplier',
      trigger: `Opening commitment $310,000 · ${v.country}`,
      fourEyes: 'Reviewed by Priya Nair - she cannot also approve it.',
    }),
  },
  {
    type: 'REASSESSMENT',
    title: (v) => `Sanctions screening hit on ${v.shortName}`,
    reason: () => 'Overnight re-screening matched a director against a PEP and sanctions list. Name and date of birth match; nationality does not. The supplier is active.',
    detail: (v) => ({
      source: '1 sanctions/PEP match · confidence 64% · partial match',
      exposure: `Active supplier · ${v.category}`,
      lastDiligence: 'Full diligence completed 9 weeks ago',
    }),
    requiresApproved: true,
  },
  {
    type: 'REASSESSMENT',
    title: (v) => `Financial deterioration at ${v.shortName}`,
    reason: () => 'Credit rating dropped two notches after a filed late-payment notice. Continuity risk on an active production line.',
    detail: (v) => ({
      source: 'Credit rating B+ → CCC · filed 2 days ago',
      exposure: `Active supplier · ${v.category}`,
      lastDiligence: 'Financial review completed 6 months ago',
    }),
    requiresApproved: true,
  },
  {
    type: 'ESCALATION',
    title: (v) => `Reviewer escalated ${v.shortName}`,
    reason: () => 'The beneficial-ownership declaration lists a holding company I cannot trace to a natural person. I do not want to make this call alone.',
    detail: () => ({
      openFindings: '1 finding still open',
      evidence: 'Pack otherwise complete',
      raisedFrom: 'AI review workspace',
    }),
  },
  {
    type: 'POLICY_CHANGE',
    title: () => 'Let the Chaser Agent send a third reminder without a human',
    reason: () => 'Suppliers who ignore two reminders usually answer the third. Every one of those is currently a manual send and it is the biggest queue on the team.',
    detail: () => ({
      before: 'Chaser Agent · 2 automated reminders, then hand to a human',
      after: 'Chaser Agent · 3 automated reminders, then hand to a human',
      effect: 'Widens what an agent may do unattended. Reversible from the config history.',
    }),
    platform: true,
  },
  {
    type: 'POLICY_CHANGE',
    title: () => 'Allow the Document Agent to read passports for director checks',
    reason: () => 'Director identity is verified by hand today. Granting the context would automate it, but it puts identity documents in scope for the agent.',
    detail: () => ({
      before: 'Document Agent · context excludes identity documents',
      after: 'Document Agent · context includes passports and national IDs',
      effect: 'Expands the data an agent may read. Higher privacy exposure.',
    }),
    platform: true,
  },
];

export const INITIAL_AUDIT_LOGS = [
  // -------------------------------------------------------------------------
  // One complete case, seeded end to end.
  //
  // The Case files view is only worth opening if there is a case in it, and a
  // freshly-loaded demo had two events total - so the most expressive screen in
  // the product opened empty. This is Indus Garments' full arc: invited,
  // supplied, read by agents, corrected by a human, refused twice at a policy
  // boundary, sent up for four-eyes approval, then approved and activated.
  //
  // The two refusals are the point. An audit trail that only records what the
  // platform did, and never what it declined to do, is the kind that reads
  // beautifully right up until someone asks how the machine was stopped.
  //
  // Newest first - the Event log renders in array order.
  // -------------------------------------------------------------------------
  {
    id: 'AUD-10021', timestamp: iso(0, 10, 18), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Priya Nair', actorId: 'PN-014', actionType: 'DECISION',
    documentName: 'ERP activation', fieldLabel: 'Supplier master record',
    originalValue: 'Approved, pending activation', humanValue: 'Activated as SUP-2026-4491',
    reason: 'Final human approval present', notes: 'Supplier master record created and synchronized.',
  },
  {
    id: 'AUD-10020', timestamp: iso(0, 10, 11), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Priya Nair', actorId: 'PN-014', actionType: 'DECISION',
    documentName: 'Full compliance application', fieldLabel: 'Vendor decision',
    originalValue: 'Recommended: Low risk (9/100)', humanValue: 'Vendor approved',
    reason: 'All mandatory checks passed and the supervisor released the four-eyes hold',
    clauseRef: 'PROC-5.1', notes: 'Executive decision recorded by the Compliance Manager.',
  },
  {
    id: 'AUD-10019', timestamp: iso(0, 9, 58), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Arun Mehta', actorId: 'AM-002', actionType: 'REQUEST_RESOLVED',
    documentName: 'Above approval authority', fieldLabel: 'REQ-4471  /  Indus Garments exceeds the delegated limit',
    originalValue: 'Raised by Priya Nair', humanValue: 'Approved by supervisor',
    reason: 'Evidence pack complete and every finding cleared. Country risk drives the score, not the file.',
    clauseRef: 'PROC-5.1', notes: "Closed on the supervisor's authority. Four-eyes satisfied - the reviewer could not also approve it.",
  },
  {
    id: 'AUD-10018', timestamp: iso(0, 9, 41), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Priya Nair', actorId: 'PN-014', actionType: 'AUTHORITY_LIMIT_BLOCKED',
    documentName: 'Full compliance application', fieldLabel: 'Vendor approval',
    originalValue: 'Residual risk 74/100', humanValue: 'Refused - above the 70 delegated limit',
    reason: 'Compliance Manager may approve up to residual risk 70. This vendor scores 74.',
    clauseRef: 'PROC-5.1', notes: 'Sent to Arun Mehta for four-eyes approval instead.',
  },
  {
    id: 'AUD-10017', timestamp: iso(1, 16, 24), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Compliance Agent', actorId: 'AGT-COMPLIANCE@v1', agentId: 'compliance',
    actionType: 'AGENT_BLOCKED', documentName: 'approve_vendor', fieldLabel: 'Approve vendor',
    originalValue: 'Agent attempted action', humanValue: 'Refused by governance',
    reasoning: 'Every mandatory document was verified and no finding remained open, so the agent proposed closing the case itself.',
    reason: 'This action is withheld from every agent by policy PROC-5.1 - human approval is mandatory.',
    clauseRef: 'PROC-5.1', notes: 'Blocked (forbidden). No autonomy level and no configuration change can grant this action.',
  },
  {
    id: 'AUD-10016', timestamp: iso(1, 15, 52), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Priya Nair', actorId: 'PN-014', actionType: 'FIELD_OVERRIDE',
    documentName: 'Bank Account Verification Letter', fieldLabel: 'Account holder name',
    originalValue: 'Indus Garments Pvt Ltd', humanValue: 'Indus Garments Private Limited',
    reason: 'Legal name mismatch across documents',
    clauseRef: 'FIN-4.1', notes: 'Corrected against the registration certificate; the abbreviation was the bank’s, not the supplier’s.',
  },
  {
    id: 'AUD-10015', timestamp: iso(1, 15, 30), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Verification Agent', actorId: 'AGT-VERIFICATION@v1', agentId: 'verification',
    actionType: 'AGENT_ACTION', documentName: 'Corroborate registrations', fieldLabel: 'Registry lookup',
    originalValue: null, humanValue: 'Corroborated 3 registrations against the India registry',
    reasoning: 'Claimed registration numbers were checked against the public registry rather than accepted on the supplier’s word.',
    reason: 'Permitted under the Verification Agent allowlist at assisted autonomy.',
    clauseRef: 'GST-1.2', notes: 'External corroboration, not self-attestation.',
  },
  {
    id: 'AUD-10014', timestamp: iso(1, 15, 12), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'StyleSphere AI', actorId: 'IDP-3.4', actionType: 'DOCUMENT_VERIFIED',
    documentName: 'Tax Registration Certificate', fieldLabel: 'Automated verification',
    originalValue: 'indus_tax_registration.pdf', humanValue: 'Verified - 97% confidence',
    reason: 'Automated authenticity, expiry, and completeness checks',
    clauseRef: 'GST-1.2', notes: 'Passed simulated AI verification.',
  },
  {
    id: 'AUD-10013', timestamp: iso(2, 11, 5), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Rakesh Iyer', actorId: 'VEN-4491', actionType: 'APPLICATION_SUBMITTED',
    documentName: 'Full onboarding application', fieldLabel: 'Application submitted',
    originalValue: 'Draft with the supplier', humanValue: 'Submitted for compliance review',
    reason: 'Supplier completed every onboarding step', notes: '6 of 6 documents supplied.',
  },
  {
    id: 'AUD-10011', timestamp: iso(4, 9, 20), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Rakesh Iyer', actorId: 'VEN-4491', actionType: 'PROFILE_SUBMITTED',
    documentName: 'Company profile', fieldLabel: 'Registered company details',
    originalValue: 'Not yet provided', humanValue: 'Indus Garments Private Limited  /  India',
    reason: 'Supplier completed onboarding step 1', notes: 'Tax ID 27AAFCI9265R1ZQ  /  Registration U18101MH2009PTC195442.',
  },
  {
    id: 'AUD-10010', timestamp: iso(6, 14, 2), vendorId: 'VEN-4491', vendorName: 'Indus Garments Pvt. Ltd.',
    actorName: 'Priya Nair', actorId: 'PN-014', actionType: 'VENDOR_INVITED',
    documentName: 'Vendor invitation', fieldLabel: 'New vendor',
    originalValue: null, humanValue: 'Indus Garments Pvt. Ltd.',
    reason: 'Vendor invited to onboard', notes: 'Invitation sent to r.iyer@indusgarments.in.',
  },
  {
    id: 'AUD-10012', timestamp: iso(0, 9, 46), vendorId: 'VEN-8842', vendorName: 'SilkRoad Textiles Co., Ltd.',
    actorName: 'StyleSphere AI', actorId: 'IDP-3.4', actionType: 'AI_REVIEW',
    documentName: 'Full compliance application', fieldLabel: 'Automated evidence review',
    originalValue: null, humanValue: null,
    reason: 'Cross-document conflicts and low-confidence fields', notes: '9 documents classified, 42 fields extracted, 3 items routed to human review.',
  },
];
