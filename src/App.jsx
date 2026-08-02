import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Building2, Check, CheckCircle2,
  ChevronDown, ChevronRight, Circle, Clock, Database, Download, ExternalLink,
  Eye, FileCheck2, FileText, Globe2, HelpCircle, History, LockKeyhole,
  MessageSquare, MoreHorizontal, Pencil, Plus, RefreshCw, ScanLine, Search,
  Send, Settings2, ShieldAlert, ShieldCheck, Sparkles, UploadCloud,
  UserRoundCheck, X,
} from 'lucide-react';
import './App.css';

const STORAGE_KEY = 'stylesphere-nexus-demo-v1';

const REQUIRED_DOCUMENTS = [
  'Business registration', 'Tax registration', 'Import / export licence',
  'Bank verification', 'Financial statement', 'Factory audit', 'Insurance',
  'Supplier code', 'Product compliance',
];

const PRIMARY_DOCUMENTS = [
  { id: 'doc-registration', name: 'Business registration', code: 'REG', fileName: 'SilkRoad_Business_Registration.pdf', pages: 3, status: 'verified', confidence: 98, source: 'Vietnam Business Registry' },
  { id: 'doc-tax', name: 'Tax registration', code: 'TAX', fileName: 'SilkRoad_Tax_Registration.pdf', pages: 2, status: 'review', confidence: 84, source: 'Vietnam General Department of Taxation' },
  { id: 'doc-iec', name: 'Import / export licence', code: 'IEC', fileName: 'Import_Export_Licence_8842.pdf', pages: 1, status: 'verified', confidence: 99, source: 'Customs authority' },
  { id: 'doc-bank', name: 'Bank verification', code: 'BANK', fileName: 'Vietcombank_Account_Letter.pdf', pages: 2, status: 'review', confidence: 72, source: 'Vietcombank' },
  { id: 'doc-finance', name: 'Financial statement', code: 'FIN', fileName: 'Audited_Financials_FY2025.pdf', pages: 18, status: 'verified', confidence: 96, source: 'KPMG Vietnam' },
  { id: 'doc-factory', name: 'Factory audit', code: 'AUDIT', fileName: 'Intertek_WRAP_Audit_2026.pdf', pages: 14, status: 'verified', confidence: 97, source: 'Intertek' },
  { id: 'doc-insurance', name: 'Insurance', code: 'COI', fileName: 'Allianz_Liability_Certificate.pdf', pages: 3, status: 'verified', confidence: 98, source: 'Allianz' },
  { id: 'doc-code', name: 'Supplier code', code: 'SCOC', fileName: 'StyleSphere_Supplier_Code_Signed.pdf', pages: 7, status: 'verified', confidence: 100, source: 'StyleSphere' },
  { id: 'doc-product', name: 'Product compliance', code: 'OEKO', fileName: 'OEKO_TEX_Standard100.pdf', pages: 2, status: 'verified', confidence: 95, source: 'OEKO-TEX' },
];

const PRIMARY_ISSUES = [
  { id: 'issue-name', severity: 'high', title: 'Legal name differs across records', detail: 'The bank letter omits “Co.,” from the registered entity name.', field: 'Account holder name', extracted: 'SilkRoad Textiles Ltd.', expected: 'SilkRoad Textiles Co., Ltd.', confidence: 72, docId: 'doc-bank', source: 'Business registration vs. bank verification', resolved: false },
  { id: 'issue-expiry', severity: 'medium', title: 'Expiry date needs confirmation', detail: 'The source stamp is low contrast. AI read 31 Dec 2026.', field: 'Tax certificate expiry', extracted: '31 Dec 2026', expected: '31 Dec 2027', confidence: 68, docId: 'doc-tax', source: 'Tax registration, page 2', resolved: false },
  { id: 'issue-account', severity: 'medium', title: 'One account character is ambiguous', detail: 'Character 14 may be “8” or “B”. Compare with the bank stamp.', field: 'SWIFT / account number', extracted: 'BFTVVNVX-0041000889211', expected: 'BFTVVNVX-0041000B89211', confidence: 76, docId: 'doc-bank', source: 'Bank verification, page 1', resolved: false },
];

const createSupportingDocuments = (missing = []) =>
  REQUIRED_DOCUMENTS.map((name, index) => ({
    id: `doc-${index}`,
    name,
    code: ['REG', 'TAX', 'IEC', 'BANK', 'FIN', 'AUDIT', 'COI', 'SCOC', 'PROD'][index],
    fileName: missing.includes(name) ? '' : `${name.replaceAll(' ', '_')}.pdf`,
    pages: index + 1,
    status: missing.includes(name) ? 'missing' : 'verified',
    confidence: missing.includes(name) ? 0 : 94 + (index % 5),
    source: 'Supplier submission',
  }));

const INITIAL_CASES = [
  {
    id: 'VEND-2026-8842', name: 'SilkRoad Textiles Co., Ltd.', country: 'Vietnam',
    region: 'Binh Duong', flag: 'VN', category: 'Apparel & fabrics',
    contact: 'Nguyen Van Minh', email: 'compliance@silkroadtex.vn', risk: 'high',
    riskScore: 78, status: 'in_review', stage: 3, slaHours: 6,
    owner: 'Elena Rostova', submittedAt: '26 Jul 2026, 09:42',
    profileCompletion: 100, documents: PRIMARY_DOCUMENTS, issues: PRIMARY_ISSUES,
    recommendation: null, finalApproval: null, erpId: null,
    profile: {
      legalName: 'SilkRoad Textiles Co., Ltd.', tradingName: 'SilkRoad Textiles',
      registrationNumber: '0318992014', taxId: 'VN-0318992014',
      iec: 'IEC-VN-2022-998144',
      address: 'No. 88 Binh Duong Blvd, Thuan An, Binh Duong, Vietnam',
      workforce: '1,240', factories: '2',
    },
    aiSummary: 'Established apparel manufacturer with a complete document pack. Three evidence conflicts require human verification before a recommendation can be sent.',
  },
  {
    id: 'VEND-2026-9104', name: 'Dhaka Apparel Crafts Ltd.', country: 'Bangladesh',
    region: 'Dhaka', flag: 'BD', category: 'Knitwear & outerwear',
    contact: 'Tariq Rahman', email: 'info@dhakaapparel.bd', risk: 'critical',
    riskScore: 92, status: 'vendor_action', stage: 2, slaHours: 2,
    owner: 'Elena Rostova', submittedAt: '25 Jul 2026, 16:15',
    profileCompletion: 92, documents: createSupportingDocuments(['Insurance', 'Factory audit']),
    issues: [], recommendation: null, finalApproval: null, erpId: null,
    profile: { legalName: 'Dhaka Apparel Crafts Ltd.', taxId: 'BD-9911042' },
    aiSummary: 'Two mandatory documents are missing. Review is paused until the supplier responds.',
  },
  {
    id: 'VEND-2026-3312', name: 'Zhejiang Footwear Group Co.', country: 'China',
    region: 'Zhejiang', flag: 'CN', category: 'Footwear & rubber',
    contact: 'Chen Wei', email: 'global@zhejiangfootwear.cn', risk: 'low',
    riskScore: 14, status: 'ready', stage: 3, slaHours: 29, owner: 'Aarav Mehta',
    submittedAt: '26 Jul 2026, 11:00', profileCompletion: 100,
    documents: createSupportingDocuments(), issues: [], recommendation: null,
    finalApproval: null, erpId: null,
    profile: { legalName: 'Zhejiang Footwear Group Co.', taxId: 'CN-91330108' },
    aiSummary: 'All mandatory evidence is present and no material conflicts were found.',
  },
  {
    id: 'VEND-2026-7041', name: 'Anatolia Leatherworks A.Ş.', country: 'Turkey',
    region: 'Istanbul', flag: 'TR', category: 'Leather goods',
    contact: 'Mehmet Yilmaz', email: 'legal@anatolia-leather.tr', risk: 'medium',
    riskScore: 64, status: 'in_review', stage: 3, slaHours: 18, owner: 'Elena Rostova',
    submittedAt: '25 Jul 2026, 18:45', profileCompletion: 100,
    documents: createSupportingDocuments(), issues: [], recommendation: null,
    finalApproval: null, erpId: null,
    profile: { legalName: 'Anatolia Leatherworks A.Ş.', taxId: 'TR-78144122' },
    aiSummary: 'Complete submission with one non-blocking environmental certificate observation.',
  },
  {
    id: 'VEND-2026-4491', name: 'Indus Garments Pvt. Ltd.', country: 'India',
    region: 'Gujarat', flag: 'IN', category: 'Cotton & denim',
    contact: 'Rajesh Kumar', email: 'ops@indusgarments.in', risk: 'low',
    riskScore: 24, status: 'awaiting_approval', stage: 4, slaHours: 34,
    owner: 'Aarav Mehta', submittedAt: '26 Jul 2026, 07:20',
    profileCompletion: 100, documents: createSupportingDocuments(), issues: [],
    recommendation: { decision: 'Recommend approval', note: 'All checks passed.', by: 'Aarav Mehta' },
    finalApproval: null, erpId: null,
    profile: { legalName: 'Indus Garments Pvt. Ltd.', taxId: '24AAACI4491P1Z4', iec: 'AAACI4491P' },
    aiSummary: 'All mandatory checks passed. Executive recommendation is awaiting manager approval.',
  },
];

const INITIAL_AUDIT = [
  { id: 'evt-1', caseId: 'VEND-2026-8842', time: '26 Jul 2026, 09:46', actor: 'StyleSphere AI', actorId: 'IDP-3.4', type: 'AI review completed', detail: '9 documents classified, 42 fields extracted, 3 items routed to human review.', ai: 'Recommend review: 78 / 100 risk', human: 'Pending', reason: 'Cross-document conflicts and low-confidence fields' },
  { id: 'evt-2', caseId: 'VEND-2026-8842', time: '26 Jul 2026, 09:42', actor: 'Nguyen Van Minh', actorId: 'SUP-8842', type: 'Application submitted', detail: 'Supplier confirmed the company record and submitted 9 mandatory documents.', ai: 'Not applicable', human: 'Submitted', reason: 'Supplier attestation' },
  { id: 'evt-3', caseId: 'VEND-2026-4491', time: '26 Jul 2026, 10:18', actor: 'Aarav Mehta', actorId: 'ONB-218', type: 'Recommendation sent', detail: 'Complete evidence pack recommended for final approval.', ai: 'Low risk: 24 / 100', human: 'Recommend approval', reason: 'All mandatory checks passed' },
];

const ROLE_META = {
  supplier: { label: 'Supplier contact', name: 'Nguyen Van Minh', description: 'SilkRoad Textiles', initials: 'NM' },
  executive: { label: 'Onboarding executive', name: 'Elena Rostova', description: 'Supply Chain Operations', initials: 'ER' },
  manager: { label: 'Compliance manager', name: 'Priya Nair', description: 'Global Compliance', initials: 'PN' },
};

const STATUS_META = {
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'info' },
  ai_review: { label: 'AI review', tone: 'info' },
  in_review: { label: 'Human review', tone: 'warning' },
  vendor_action: { label: 'Supplier action', tone: 'danger' },
  ready: { label: 'Ready to recommend', tone: 'success' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'violet' },
  approved: { label: 'Approved', tone: 'success' },
  active: { label: 'Active in ERP', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

const STAGES = ['Submitted', 'AI review', 'Compliance review', 'Approval', 'ERP activation'];
const classNames = (...values) => values.filter(Boolean).join(' ');

function App() {
  const [role, setRole] = useState('executive');
  const [view, setView] = useState('worklist');
  const [cases, setCases] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.cases || INITIAL_CASES; }
    catch { return INITIAL_CASES; }
  });
  const [audit, setAudit] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.audit || INITIAL_AUDIT; }
    catch { return INITIAL_AUDIT; }
  });
  const [selectedCaseId, setSelectedCaseId] = useState('VEND-2026-8842');
  const [activeDocId, setActiveDocId] = useState('doc-bank');
  const [activeIssueId, setActiveIssueId] = useState('issue-name');
  const [filter, setFilter] = useState('My priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [reviewPanel, setReviewPanel] = useState('issues');

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify({ cases, audit })), [cases, audit]);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') { setModal(null); setRoleMenuOpen(false); }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) || cases[0],
    [cases, selectedCaseId],
  );
  const activeDoc = selectedCase.documents.find((doc) => doc.id === activeDocId) || selectedCase.documents[0];
  const activeIssue = selectedCase.issues.find((issue) => issue.id === activeIssueId)
    || selectedCase.issues.find((issue) => !issue.resolved) || null;
  const unresolvedIssues = selectedCase.issues.filter((issue) => !issue.resolved);
  const missingDocuments = selectedCase.documents.filter((doc) => ['missing', 'processing'].includes(doc.status));
  const canRecommend = unresolvedIssues.length === 0 && missingDocuments.length === 0;

  const showToast = (message, tone = 'success') => setToast({ message, tone });
  const appendAudit = (entry) => setAudit((current) => [{
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    caseId: selectedCase.id,
    time: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date()),
    ...entry,
  }, ...current]);
  const updateSelectedCase = (updater) =>
    setCases((current) => current.map((item) => item.id === selectedCase.id ? updater(item) : item));

  const openCase = (caseId, targetView = 'review') => {
    const nextCase = cases.find((item) => item.id === caseId);
    setSelectedCaseId(caseId);
    setActiveDocId(nextCase?.documents.find((doc) => doc.status === 'review')?.id || nextCase?.documents[0]?.id);
    setActiveIssueId(nextCase?.issues.find((issue) => !issue.resolved)?.id || '');
    setView(targetView);
  };

  const resolveIssue = (issue, resolution, correctedValue = '') => {
    const value = correctedValue || (resolution === 'source' ? issue.extracted : issue.expected);
    updateSelectedCase((item) => {
      const nextIssues = item.issues.map((candidate) => candidate.id === issue.id
        ? { ...candidate, resolved: true, resolution: value, resolvedBy: ROLE_META[role].name }
        : candidate);
      const remaining = nextIssues.filter((candidate) => !candidate.resolved);
      return {
        ...item,
        issues: nextIssues,
        status: remaining.length === 0 ? 'ready' : item.status,
        risk: remaining.length === 0 ? 'low' : item.risk,
        riskScore: remaining.length === 0 ? 28 : item.riskScore,
        documents: item.documents.map((doc) =>
          doc.id === issue.docId && nextIssues.filter((candidate) => candidate.docId === issue.docId && !candidate.resolved).length === 0
            ? { ...doc, status: 'verified', confidence: 100 } : doc),
      };
    });
    appendAudit({
      actor: ROLE_META[role].name, actorId: role === 'manager' ? 'MGR-014' : 'ONB-704',
      type: resolution === 'source' ? 'AI finding accepted' : 'Field override recorded',
      detail: `${issue.field} resolved as “${value}”.`,
      ai: `${issue.extracted} (${issue.confidence}% confidence)`, human: value,
      reason: resolution === 'source' ? 'Source evidence confirmed' : 'Cross-document verification',
    });
    setModal(null);
    setActiveIssueId(selectedCase.issues.find((candidate) => candidate.id !== issue.id && !candidate.resolved)?.id || '');
    showToast('Finding resolved and added to the audit trail.');
  };

  const requestDocument = (document, note) => {
    updateSelectedCase((item) => ({
      ...item, status: 'vendor_action',
      documents: item.documents.map((doc) => doc.id === document.id ? { ...doc, status: 'missing' } : doc),
    }));
    appendAudit({
      actor: ROLE_META[role].name, actorId: 'ONB-704', type: 'Supplier action requested',
      detail: `Replacement requested for ${document.name}. ${note || ''}`.trim(),
      ai: `${document.confidence}% extraction confidence`, human: 'Replacement required',
      reason: note || 'Source evidence cannot be verified',
    });
    setModal(null); setView('history'); showToast('Request sent to the supplier.', 'info');
  };

  const uploadReplacement = (document, file) => {
    if (!file) return;
    updateSelectedCase((item) => ({
      ...item, status: 'ai_review',
      documents: item.documents.map((doc) => doc.id === document.id
        ? { ...doc, fileName: file.name, status: 'processing', confidence: 0 } : doc),
    }));
    appendAudit({
      actor: ROLE_META.supplier.name, actorId: 'SUP-8842', type: 'Replacement uploaded',
      detail: `${file.name} submitted for ${document.name}.`,
      ai: 'Queued for document review', human: 'Supplier submitted', reason: 'Response to evidence request',
    });
    setModal(null); showToast('Upload received. AI checks are running.', 'info');
    window.setTimeout(() => {
      setCases((current) => current.map((item) => item.id === selectedCase.id ? {
        ...item, status: 'in_review',
        documents: item.documents.map((doc) => doc.id === document.id
          ? { ...doc, status: 'verified', confidence: 97 } : doc),
      } : item));
      setAudit((current) => [{
        id: `evt-${Date.now()}-ai`, caseId: selectedCase.id, time: 'Just now',
        actor: 'StyleSphere AI', actorId: 'IDP-3.4', type: 'Replacement verified',
        detail: `${document.name} passed authenticity, expiry, and cross-document checks.`,
        ai: 'Verified: 97% confidence', human: 'Pending reviewer confirmation',
        reason: 'Automated evidence checks completed',
      }, ...current]);
      showToast('Replacement checks complete. The reviewer has been notified.');
    }, 1500);
  };

  const submitRecommendation = (note) => {
    if (!canRecommend) return;
    updateSelectedCase((item) => ({
      ...item, status: 'awaiting_approval', stage: 4,
      recommendation: { decision: 'Recommend approval', note, by: ROLE_META[role].name },
    }));
    appendAudit({
      actor: ROLE_META[role].name, actorId: 'ONB-704', type: 'Recommendation sent',
      detail: note || 'Complete evidence pack recommended for final approval.',
      ai: `Readiness score: ${100 - selectedCase.riskScore}%`, human: 'Recommend approval',
      reason: 'All mandatory checks resolved',
    });
    setModal(null); setView('history'); showToast('Recommendation sent to the compliance manager.');
  };

  const finalDecision = (decision, note) => {
    if (role !== 'manager') return;
    const approved = decision === 'approve';
    updateSelectedCase((item) => ({
      ...item, status: approved ? 'approved' : 'rejected', stage: approved ? 5 : 4,
      finalApproval: { decision: approved ? 'Approved' : 'Rejected', note, by: ROLE_META.manager.name },
    }));
    appendAudit({
      actor: ROLE_META.manager.name, actorId: 'MGR-014',
      type: approved ? 'Final approval recorded' : 'Application rejected',
      detail: note || (approved ? 'Human approval gate completed.' : 'Application returned to onboarding.'),
      ai: selectedCase.recommendation?.decision || 'No recommendation',
      human: approved ? 'Approved' : 'Rejected', reason: note || 'Compliance manager decision',
    });
    setModal(null);
    showToast(approved ? 'Final approval recorded. ERP activation is now available.' : 'Application rejected.');
  };

  const activateInErp = () => {
    if (role !== 'manager' || selectedCase.status !== 'approved') return;
    const erpId = `SUP-${new Date().getFullYear()}-${selectedCase.id.slice(-4)}`;
    updateSelectedCase((item) => ({ ...item, status: 'active', stage: 6, erpId }));
    appendAudit({
      actor: ROLE_META.manager.name, actorId: 'MGR-014', type: 'Vendor activated in ERP',
      detail: `Supplier master record ${erpId} created and synchronized.`,
      ai: 'All mandatory controls passed', human: 'Activation authorized',
      reason: 'Final human approval present',
    });
    setModal(null); showToast(`Vendor activated as ${erpId}.`);
  };

  const updateProfile = (formData) => {
    updateSelectedCase((item) => ({
      ...item,
      name: formData.get('legalName') || item.name,
      country: formData.get('country') || item.country,
      category: formData.get('category') || item.category,
      profile: {
        ...item.profile,
        legalName: formData.get('legalName') || item.profile.legalName,
        taxId: formData.get('taxId') || item.profile.taxId,
        iec: formData.get('iec') || item.profile.iec,
        address: formData.get('address') || item.profile.address,
      },
    }));
    appendAudit({
      actor: ROLE_META.supplier.name, actorId: 'SUP-8842', type: 'Company record updated',
      detail: 'Supplier profile details were edited and saved.',
      ai: 'Cross-document recheck queued', human: 'Supplier attested', reason: 'Profile maintenance',
    });
    setModal(null); showToast('Company record saved. Changes are visible to the reviewer.');
  };

  const resetDemo = () => {
    setCases(INITIAL_CASES); setAudit(INITIAL_AUDIT); setSelectedCaseId('VEND-2026-8842');
    setActiveDocId('doc-bank'); setActiveIssueId('issue-name'); setView('worklist'); setModal(null);
    localStorage.removeItem(STORAGE_KEY); showToast('Demo data restored.', 'info');
  };

  const exportAudit = () => {
    const rows = audit.filter((entry) => entry.caseId === selectedCase.id);
    const csv = [
      ['Time', 'Actor', 'Action', 'AI recommendation', 'Human decision', 'Reason'],
      ...rows.map((entry) => [entry.time, entry.actor, entry.type, entry.ai, entry.human, entry.reason]),
    ].map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${selectedCase.id}-audit.csv`; link.click();
    URL.revokeObjectURL(url); showToast('Audit history exported.');
  };

  const switchRole = (nextRole) => {
    setRole(nextRole); setRoleMenuOpen(false);
    if (nextRole === 'supplier') { setSelectedCaseId('VEND-2026-8842'); setView('worklist'); }
  };

  const worklist = role === 'supplier'
    ? <SupplierWorkbench item={selectedCase} audit={audit} onEditProfile={() => setModal({ type: 'profile' })} onUpload={(document) => setModal({ type: 'upload', document })} onViewActivity={() => setView('history')} />
    : <InternalWorklist cases={cases} filter={filter} setFilter={setFilter} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onOpenCase={openCase} />;

  return (
    <div className="app-shell">
      <Header role={role} view={view} setView={setView} roleMenuOpen={roleMenuOpen}
        setRoleMenuOpen={setRoleMenuOpen} switchRole={switchRole} resetDemo={resetDemo} />
      <main className="app-main">
        {view === 'worklist' && worklist}
        {view === 'review' && role !== 'supplier' && (
          <ReviewWorkspace item={selectedCase} activeDoc={activeDoc} activeIssue={activeIssue}
            activeDocId={activeDocId} setActiveDocId={setActiveDocId}
            setActiveIssueId={setActiveIssueId} unresolvedIssues={unresolvedIssues}
            missingDocuments={missingDocuments} reviewPanel={reviewPanel}
            setReviewPanel={setReviewPanel} canRecommend={canRecommend}
            onBack={() => setView('worklist')}
            onResolve={(issue, mode) => mode === 'source' ? resolveIssue(issue, 'source') : setModal({ type: 'override', issue })}
            onRequest={(document) => setModal({ type: 'request', document })}
            onRecommend={() => setModal({ type: 'recommend' })}
            onHistory={() => setView('history')} />
        )}
        {view === 'history' && (
          <ApprovalHistory item={selectedCase} role={role} audit={audit} cases={cases}
            onSelectCase={setSelectedCaseId} onBack={() => setView(role === 'supplier' ? 'worklist' : 'review')}
            onExport={exportAudit} onApprove={() => setModal({ type: 'approve' })}
            onReject={() => setModal({ type: 'reject' })} onActivate={() => setModal({ type: 'activate' })} />
        )}
      </main>
      {modal && <Modal modal={modal} item={selectedCase} onClose={() => setModal(null)}
        onResolve={resolveIssue} onRequest={requestDocument} onUpload={uploadReplacement}
        onRecommend={submitRecommendation} onDecision={finalDecision}
        onActivate={activateInErp} onUpdateProfile={updateProfile} />}
      {toast && <div className={classNames('toast', `toast-${toast.tone}`)} role="status">
        {toast.tone === 'success' ? <CheckCircle2 size={18} /> : <Bell size={18} />}
        <span>{toast.message}</span>
      </div>}
    </div>
  );
}

function Header({ role, view, setView, roleMenuOpen, setRoleMenuOpen, switchRole, resetDemo }) {
  const meta = ROLE_META[role];
  const navItems = role === 'supplier'
    ? [{ id: 'worklist', label: 'Application' }, { id: 'history', label: 'Activity' }]
    : [{ id: 'worklist', label: 'Worklist' }, { id: 'review', label: 'Review' }, { id: 'history', label: 'History' }];
  return (
    <header className="global-header">
      <div className="brand-lockup">
        <div className="brand-mark"><ShieldCheck size={20} strokeWidth={2.4} /></div>
        <div><div className="brand-name">StyleSphere</div><div className="brand-product">Vendor Nexus</div></div>
      </div>
      <nav className="top-nav" aria-label="Primary navigation">
        {navItems.map((item) => <button key={item.id}
          className={classNames('top-nav-item', view === item.id && 'active')}
          onClick={() => setView(item.id)}>{item.label}</button>)}
      </nav>
      <div className="header-actions">
        <button className="icon-button" aria-label="Help"><HelpCircle size={19} /></button>
        <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
        <div className="role-switcher">
          <button className="profile-button" onClick={() => setRoleMenuOpen(!roleMenuOpen)} aria-expanded={roleMenuOpen}>
            <span className="avatar">{meta.initials}</span>
            <span className="profile-copy"><strong>{meta.name}</strong><small>{meta.label}</small></span>
            <ChevronDown size={15} />
          </button>
          {roleMenuOpen && <div className="role-menu">
            <div className="role-menu-label">Preview product as</div>
            {Object.entries(ROLE_META).map(([key, roleMeta]) => <button key={key}
              className={classNames('role-menu-item', role === key && 'selected')}
              onClick={() => switchRole(key)}>
              <span className="avatar avatar-sm">{roleMeta.initials}</span>
              <span><strong>{roleMeta.label}</strong><small>{roleMeta.description}</small></span>
              {role === key && <Check size={16} />}
            </button>)}
            <div className="role-menu-divider" />
            <button className="role-menu-item compact" onClick={resetDemo}><RefreshCw size={16} />
              <span><strong>Reset demo</strong><small>Restore the original workflow</small></span>
            </button>
            <button className="role-menu-item compact"><Settings2 size={16} />
              <span><strong>Preferences</strong><small>Notifications and workspace</small></span>
            </button>
          </div>}
        </div>
      </div>
    </header>
  );
}

function InternalWorklist({ cases, filter, setFilter, searchQuery, setSearchQuery, onOpenCase }) {
  const metrics = [
    { label: 'At risk today', value: cases.filter((item) => item.slaHours <= 6 && !['active', 'approved'].includes(item.status)).length, helper: 'SLA under 6 hours', icon: AlertTriangle, tone: 'danger' },
    { label: 'Ready to review', value: cases.filter((item) => ['in_review', 'ready'].includes(item.status)).length, helper: 'AI assessment complete', icon: Sparkles, tone: 'violet' },
    { label: 'Waiting on supplier', value: cases.filter((item) => item.status === 'vendor_action').length, helper: 'Evidence requested', icon: MessageSquare, tone: 'warning' },
    { label: 'Awaiting approval', value: cases.filter((item) => item.status === 'awaiting_approval').length, helper: 'Manager action needed', icon: UserRoundCheck, tone: 'success' },
  ];
  const filtered = cases.filter((item) => {
    const matches = [item.id, item.name, item.country, item.category].join(' ').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matches) return false;
    if (filter === 'At risk') return item.slaHours <= 6 || item.risk === 'critical';
    if (filter === 'Supplier action') return item.status === 'vendor_action';
    if (filter === 'Approval') return item.status === 'awaiting_approval';
    return true;
  });
  return (
    <div className="page-container worklist-page">
      <section className="page-heading-row">
        <div><div className="eyebrow">Onboarding operations</div><h1>Move the right suppliers forward.</h1>
          <p>Prioritized by compliance risk, evidence readiness, and the 48-hour onboarding SLA.</p></div>
        <div className="heading-actions">
          <button className="button secondary"><Download size={16} /> Export worklist</button>
          <button className="button primary"><Plus size={16} /> Invite supplier</button>
        </div>
      </section>
      <section className="metric-grid" aria-label="Operational summary">
        {metrics.map((metric) => {
          const Icon = metric.icon; return <article className="metric-card" key={metric.label}>
            <div className={classNames('metric-icon', metric.tone)}><Icon size={19} /></div>
            <div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.helper}</small></div>
          </article>;
        })}
      </section>
      <section className="worklist-card">
        <div className="worklist-toolbar">
          <div className="saved-views" role="tablist" aria-label="Saved worklist views">
            {['My priority', 'At risk', 'Supplier action', 'Approval'].map((label) => <button key={label}
              className={classNames('filter-chip', filter === label && 'active')} onClick={() => setFilter(label)}>
              {label}{label === 'At risk' && <span className="chip-count">2</span>}
            </button>)}
          </div>
          <div className="toolbar-controls">
            <label className="search-field"><Search size={17} /><input value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search supplier, country, or ID" /></label>
            <button className="button secondary compact"><Settings2 size={16} /> Columns</button>
          </div>
        </div>
        <div className="queue-table" role="table" aria-label="Vendor applications">
          <div className="queue-row queue-header" role="row">
            <span role="columnheader">Supplier</span><span role="columnheader">Stage</span>
            <span role="columnheader">Evidence</span><span role="columnheader">Risk</span>
            <span role="columnheader">SLA</span><span role="columnheader">Next action</span><span />
          </div>
          {filtered.map((item) => {
            const status = STATUS_META[item.status];
            const readyDocs = item.documents.filter((doc) => doc.status !== 'missing').length;
            const openIssues = item.issues.filter((issue) => !issue.resolved).length;
            return <button className="queue-row queue-data-row" role="row" key={item.id}
              onClick={() => onOpenCase(item.id, item.status === 'awaiting_approval' ? 'history' : 'review')}>
              <span className="supplier-cell" role="cell"><span className="flag-avatar">{item.flag}</span>
                <span><strong>{item.name}</strong><small>{item.id} · {item.country}</small></span></span>
              <span role="cell"><span className={classNames('status-pill', status.tone)}>{status.label}</span></span>
              <span className="evidence-cell" role="cell"><span>{readyDocs}/{item.documents.length} documents</span>
                <span className="mini-progress"><i style={{ width: `${readyDocs / item.documents.length * 100}%` }} /></span>
                <small>{openIssues ? `${openIssues} findings open` : 'No blockers'}</small></span>
              <span role="cell"><span className={classNames('risk-badge', item.risk)}><i /> {item.riskScore}</span></span>
              <span className={classNames('sla-cell', item.slaHours <= 6 && 'urgent')} role="cell"><Clock size={15} /> {item.slaHours}h left</span>
              <span className="next-action" role="cell">{item.status === 'vendor_action' ? 'Track response'
                : item.status === 'awaiting_approval' ? 'Manager decision'
                  : openIssues ? `Resolve ${openIssues} findings` : 'Send recommendation'}</span>
              <span className="row-arrow" role="cell"><ChevronRight size={18} /></span>
            </button>;
          })}
        </div>
        <div className="table-footer"><span>Showing {filtered.length} of {cases.length} assigned applications</span><span>Sorted by risk-adjusted SLA</span></div>
      </section>
    </div>
  );
}

function SupplierWorkbench({ item, audit, onEditProfile, onUpload, onViewActivity }) {
  const status = STATUS_META[item.status];
  const completeDocs = item.documents.filter((doc) => !['missing', 'processing'].includes(doc.status)).length;
  const requested = item.documents.filter((doc) => doc.status === 'missing');
  const latest = audit.filter((entry) => entry.caseId === item.id).slice(0, 3);
  const actionRequired = requested.length > 0;
  return (
    <div className="supplier-page">
      <section className="supplier-hero"><div className="supplier-hero-inner">
        <div className="eyebrow light">StyleSphere supplier onboarding</div>
        <div className="supplier-title-row"><div><h1>{item.name}</h1><p>Application {item.id} · Submitted {item.submittedAt}</p></div>
          <span className={classNames('status-pill large', status.tone)}>{status.label}</span></div>
        <div className="supplier-steps" aria-label="Application progress">
          {STAGES.map((stage, index) => {
            const complete = index + 1 < item.stage; const active = index + 1 === item.stage;
            return <div className={classNames('supplier-step', complete && 'complete', active && 'active')} key={stage}>
              <span>{complete ? <Check size={15} /> : index + 1}</span><strong>{stage}</strong></div>;
          })}
        </div>
      </div></section>
      <div className="supplier-content">
        <section className={classNames('next-action-card', !actionRequired && 'calm')}>
          <div className="next-action-icon">{actionRequired ? <AlertTriangle size={24} /> : <ScanLine size={24} />}</div>
          <div className="next-action-copy"><span>{actionRequired ? 'Your action is needed' : 'Review in progress'}</span>
            <h2>{actionRequired ? `Replace ${requested.length} document${requested.length > 1 ? 's' : ''}` : 'We are checking your evidence pack.'}</h2>
            <p>{actionRequired ? 'Upload the requested evidence to restart compliance review. Your saved application will not be lost.'
              : 'No action is required right now. We will notify you if the reviewer needs more information.'}</p></div>
          {actionRequired ? <button className="button primary light" onClick={() => onUpload(requested[0])}>Upload replacement <ArrowRight size={16} /></button>
            : <span className="secure-processing"><LockKeyhole size={16} /> Secure processing</span>}
        </section>
        <div className="supplier-grid">
          <div className="supplier-main-column">
            <section className="content-card application-readiness">
              <div className="card-heading"><div><span className="section-kicker">Application readiness</span><h2>Everything in one place</h2></div>
                <strong className="readiness-score">{Math.round(((item.profileCompletion / 100 + completeDocs / item.documents.length) / 2) * 100)}<small>%</small></strong></div>
              <div className="readiness-list">
                <button className="readiness-row" onClick={onEditProfile}><span className="readiness-icon success"><Building2 size={19} /></span>
                  <span><strong>Company record</strong><small>Legal entity, registration, tax, and contact details</small></span>
                  <span className="row-status success">Complete <CheckCircle2 size={17} /></span></button>
                <div className="readiness-row"><span className={classNames('readiness-icon', requested.length ? 'warning' : 'success')}><FileCheck2 size={19} /></span>
                  <span><strong>Compliance evidence</strong><small>{completeDocs} of {item.documents.length} required documents received</small></span>
                  <span className={classNames('row-status', requested.length ? 'warning' : 'success')}>{requested.length ? `${requested.length} needed` : 'Complete'}
                    {requested.length ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}</span></div>
                <div className="readiness-row"><span className="readiness-icon info"><Sparkles size={19} /></span>
                  <span><strong>AI document review</strong><small>Authenticity, expiry, and cross-document matching</small></span>
                  <span className="row-status info">{item.status === 'ai_review' ? 'Processing' : 'Complete'} <ScanLine size={17} /></span></div>
                <div className="readiness-row"><span className="readiness-icon neutral"><UserRoundCheck size={19} /></span>
                  <span><strong>Human decision</strong><small>A compliance manager makes every final approval</small></span>
                  <span className="row-status neutral">{item.finalApproval ? item.finalApproval.decision : 'Pending'} <Clock size={17} /></span></div>
              </div>
            </section>
            <section className="content-card">
              <div className="card-heading compact"><div><span className="section-kicker">Document vault</span><h2>Required evidence</h2></div>
                <span className="secure-label"><ShieldCheck size={15} /> Encrypted</span></div>
              <div className="document-vault">{item.documents.map((doc) => <div className="vault-row" key={doc.id}>
                <span className={classNames('document-type-icon', doc.status)}><FileText size={18} /></span>
                <span><strong>{doc.name}</strong><small>{doc.fileName || 'No current file'}</small></span>
                <span className={classNames('document-status', doc.status)}>
                  {doc.status === 'verified' && <CheckCircle2 size={15} />}{doc.status === 'review' && <Clock size={15} />}
                  {doc.status === 'processing' && <ScanLine size={15} />}{doc.status === 'missing' && <AlertTriangle size={15} />}
                  {doc.status === 'verified' ? 'Received' : doc.status === 'review' ? 'In review' : doc.status === 'processing' ? 'Checking' : 'Replace'}
                </span>
                <button className="icon-button small" onClick={() => onUpload(doc)} aria-label={`Upload ${doc.name}`}>
                  {doc.status === 'missing' ? <UploadCloud size={17} /> : <MoreHorizontal size={17} />}</button>
              </div>)}</div>
            </section>
          </div>
          <aside className="supplier-side-column">
            <section className="content-card contact-card"><span className="section-kicker">Your onboarding team</span>
              <div className="contact-person"><span className="avatar">ER</span><span><strong>Elena Rostova</strong><small>Vendor onboarding executive</small></span></div>
              <p>Questions about a request? Reply inside the application to keep the audit trail complete.</p>
              <button className="button secondary full"><MessageSquare size={16} /> Message reviewer</button>
            </section>
            <section className="content-card"><div className="card-heading compact"><div><span className="section-kicker">Recent activity</span><h2>What changed</h2></div></div>
              <div className="compact-timeline">{latest.map((entry) => <div className="compact-event" key={entry.id}><span className="event-dot" />
                <div><strong>{entry.type}</strong><p>{entry.detail}</p><small>{entry.time}</small></div></div>)}</div>
              <button className="text-button" onClick={onViewActivity}>View full activity <ArrowRight size={15} /></button>
            </section>
            <section className="trust-note"><ShieldCheck size={18} /><p><strong>AI assists; people decide.</strong>
              Your documents are analyzed for review, but a human always makes the final onboarding decision.</p></section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReviewWorkspace({ item, activeDoc, activeIssue, activeDocId, setActiveDocId, setActiveIssueId,
  unresolvedIssues, missingDocuments, reviewPanel, setReviewPanel, canRecommend, onBack,
  onResolve, onRequest, onRecommend, onHistory }) {
  const status = STATUS_META[item.status];
  const verifiedCount = item.documents.filter((doc) => doc.status === 'verified').length;
  return (
    <div className="review-page">
      <section className="case-command-bar">
        <div className="case-command-left"><button className="icon-button" onClick={onBack} aria-label="Back to worklist"><ArrowLeft size={19} /></button>
          <span className="flag-avatar">{item.flag}</span><div><div className="case-title-line"><h1>{item.name}</h1>
            <span className={classNames('status-pill', status.tone)}>{status.label}</span></div>
            <p>{item.id} · {item.category} · {item.country}</p></div></div>
        <div className="case-command-right"><span className={classNames('sla-chip', item.slaHours <= 6 && 'urgent')}><Clock size={15} /> {item.slaHours}h SLA</span>
          <button className="button secondary" onClick={onHistory}><History size={16} /> Audit history</button>
          <button className="button primary" onClick={onRecommend} disabled={!canRecommend || item.status === 'awaiting_approval'}
            title={!canRecommend ? 'Resolve all mandatory checks first' : ''}><Send size={16} />
            {item.status === 'awaiting_approval' ? 'Recommendation sent' : 'Send recommendation'}</button></div>
      </section>
      <section className="review-progress-bar">
        <div className="review-progress-copy"><span><Sparkles size={15} /> AI assessment complete</span>
          <strong>{unresolvedIssues.length ? `${unresolvedIssues.length} findings need your judgement` : 'All findings resolved - ready to recommend'}</strong></div>
        <div className="review-gates"><span className="gate complete"><Check size={14} /> Profile</span>
          <span className={classNames('gate', missingDocuments.length === 0 && 'complete')}>
            {missingDocuments.length === 0 ? <Check size={14} /> : <Circle size={12} />} Evidence {verifiedCount}/{item.documents.length}</span>
          <span className={classNames('gate', unresolvedIssues.length === 0 && 'complete')}>
            {unresolvedIssues.length === 0 ? <Check size={14} /> : <Circle size={12} />} Findings</span>
          <span className="gate"><Circle size={12} /> Manager approval</span></div>
      </section>
      <div className="review-layout">
        <aside className="document-rail">
          <div className="rail-heading"><span>Evidence pack</span><strong>{verifiedCount}/{item.documents.length}</strong></div>
          <div className="document-list">{item.documents.map((doc) => <button key={doc.id}
            className={classNames('document-list-item', activeDocId === doc.id && 'active')} onClick={() => setActiveDocId(doc.id)}>
            <span className={classNames('doc-code', doc.status)}>{doc.code}</span><span><strong>{doc.name}</strong>
              <small>{doc.pages} pages · {doc.status === 'verified' ? 'Verified' : doc.status === 'review' ? 'Review' : 'Missing'}</small></span>
            {doc.status === 'verified' ? <CheckCircle2 className="doc-state verified" size={16} />
              : doc.status === 'review' ? <AlertTriangle className="doc-state warning" size={16} /> : <Circle className="doc-state" size={15} />}
          </button>)}</div>
          <button className="rail-request" onClick={() => onRequest(activeDoc)}><MessageSquare size={16} /> Request replacement</button>
        </aside>
        <section className="document-stage">
          <div className="document-stage-toolbar"><div><strong>{activeDoc.name}</strong><span>{activeDoc.fileName || 'No file'} · Page 1 of {activeDoc.pages}</span></div>
            <div><button className="toolbar-icon" aria-label="Open document"><ExternalLink size={16} /></button>
              <button className="toolbar-icon" aria-label="Download document"><Download size={16} /></button></div></div>
          <DocumentPreview document={activeDoc} issue={activeIssue?.docId === activeDoc.id ? activeIssue : null} />
          <div className="document-evidence-bar"><span><ShieldCheck size={15} /> Source: {activeDoc.source}</span>
            <span><ScanLine size={15} /> OCR confidence {activeDoc.confidence}%</span>
            <button>View AI evidence <ChevronRight size={15} /></button></div>
        </section>
        <aside className="decision-panel">
          <div className="decision-tabs" role="tablist">{[['issues', `Findings ${unresolvedIssues.length}`], ['profile', 'Profile'], ['checks', 'Checks']].map(([key, label]) =>
            <button key={key} className={reviewPanel === key ? 'active' : ''} onClick={() => setReviewPanel(key)}>{label}</button>)}</div>
          {reviewPanel === 'issues' && <div className="decision-panel-content">
            <div className="ai-summary-card"><div><Sparkles size={17} /><span>AI case summary</span></div><p>{item.aiSummary}</p>
              <button>How this was assessed <ChevronDown size={14} /></button></div>
            <div className="findings-heading"><span>Review findings</span><small>{unresolvedIssues.length} unresolved</small></div>
            <div className="finding-list">
              {item.issues.length === 0 && <div className="empty-findings"><CheckCircle2 size={28} /><strong>No material conflicts found</strong><p>This case is ready for your recommendation.</p></div>}
              {item.issues.map((issue) => <button key={issue.id}
                className={classNames('finding-card', activeIssue?.id === issue.id && 'active', issue.resolved && 'resolved')}
                onClick={() => { setActiveIssueId(issue.id); setActiveDocId(issue.docId); }}>
                <div className="finding-card-top"><span className={classNames('severity-dot', issue.severity)} /><strong>{issue.title}</strong>{issue.resolved && <CheckCircle2 size={17} />}</div>
                <p>{issue.detail}</p><span className="finding-meta">{issue.confidence}% confidence · {issue.field}</span>
              </button>)}
            </div>
            {activeIssue && !activeIssue.resolved && <div className="resolution-card">
              <div className="resolution-heading"><span>Decision required</span>
                <span className={classNames('confidence-chip', activeIssue.confidence < 75 && 'low')}>{activeIssue.confidence}% AI confidence</span></div>
              <div className="comparison"><div><span>AI extracted</span><strong>{activeIssue.extracted}</strong></div><ArrowRight size={16} />
                <div><span>Cross-check suggests</span><strong>{activeIssue.expected}</strong></div></div>
              <small className="source-note"><Eye size={14} /> {activeIssue.source}</small>
              <div className="resolution-actions"><button className="button secondary" onClick={() => onResolve(activeIssue, 'source')}>Accept source value</button>
                <button className="button primary" onClick={() => onResolve(activeIssue, 'override')}><Pencil size={15} /> Correct & log</button></div>
            </div>}
            {item.issues.length > 0 && unresolvedIssues.length === 0 && <div className="ready-banner"><CheckCircle2 size={19} />
              <div><strong>Review complete</strong><p>All mandatory evidence is verified. You can send your recommendation.</p></div></div>}
          </div>}
          {reviewPanel === 'profile' && <div className="decision-panel-content">
            <div className="profile-panel-heading"><span className="flag-avatar large">{item.flag}</span><div><h3>{item.name}</h3><p>{item.category}</p></div></div>
            <dl className="profile-facts"><div><dt>Registration no.</dt><dd>{item.profile.registrationNumber || 'Verified in source'}</dd></div>
              <div><dt>Tax identifier</dt><dd>{item.profile.taxId || 'Not provided'}</dd></div><div><dt>Import / export code</dt><dd>{item.profile.iec || 'Not required for market'}</dd></div>
              <div><dt>Registered address</dt><dd>{item.profile.address || `${item.region}, ${item.country}`}</dd></div><div><dt>Primary contact</dt><dd>{item.contact}</dd></div></dl>
          </div>}
          {reviewPanel === 'checks' && <div className="decision-panel-content"><h3 className="panel-title">Compliance controls</h3>
            <div className="control-list">{[
              ['Identity & registry', true, 'Entity exists and is active'], ['Tax & import eligibility', true, 'Registration records matched'],
              ['Bank account ownership', unresolvedIssues.every((issue) => issue.docId !== 'doc-bank'), 'Cross-document confirmation'],
              ['Policy attestations', true, 'Supplier code signed'], ['Labour & environmental', true, 'Factory audit within threshold'],
              ['Mandatory evidence', missingDocuments.length === 0, `${item.documents.length - missingDocuments.length}/${item.documents.length} present`],
            ].map(([label, passed, helper]) => <div className="control-row" key={label}>
              <span className={classNames('control-icon', passed ? 'passed' : 'open')}>{passed ? <Check size={15} /> : <AlertTriangle size={15} />}</span>
              <div><strong>{label}</strong><small>{helper}</small></div></div>)}</div>
          </div>}
        </aside>
      </div>
    </div>
  );
}

function DocumentPreview({ document, issue }) {
  const bank = document.code === 'BANK';
  const tax = document.code === 'TAX';
  return <div className="paper-wrap"><div className="paper">
    <div className="paper-watermark">{document.code}</div>
    <div className="paper-letterhead"><div className="paper-seal">{bank ? <Building2 size={28} /> : <Globe2 size={28} />}</div>
      <div><strong>{bank ? 'VIETCOMBANK' : tax ? 'TAX REGISTRATION AUTHORITY' : 'OFFICIAL RECORD'}</strong><span>{document.source}</span></div></div>
    <div className="paper-rule" /><h2>{document.name.toUpperCase()}</h2>
    <p className="paper-intro">This official record certifies the information listed below for the registered entity.</p>
    <div className="paper-fields">
      <div><span>LEGAL ENTITY</span><strong>SilkRoad Textiles Co., Ltd.</strong></div>
      <div className={issue?.field.includes('Account holder') ? 'highlight-field' : ''}><span>{bank ? 'ACCOUNT HOLDER' : 'REGISTRATION HOLDER'}</span>
        <strong>{bank ? 'SilkRoad Textiles Ltd.' : 'SilkRoad Textiles Co., Ltd.'}</strong>{issue?.field.includes('Account holder') && <i>AI finding</i>}</div>
      <div className={issue?.field.includes('SWIFT') ? 'highlight-field' : ''}><span>{bank ? 'SWIFT / ACCOUNT NUMBER' : 'REGISTRATION NUMBER'}</span>
        <strong>{bank ? 'BFTVVNVX-0041000889211' : 'VN-0318992014'}</strong>{issue?.field.includes('SWIFT') && <i>Low confidence</i>}</div>
      <div className={issue?.field.includes('expiry') ? 'highlight-field' : ''}><span>VALID THROUGH</span><strong>31 DECEMBER 2026</strong>
        {issue?.field.includes('expiry') && <i>Confirm date</i>}</div>
      <div><span>REGISTERED ADDRESS</span><strong>No. 88 Binh Duong Blvd, Thuan An, Binh Duong Province, Vietnam</strong></div>
    </div>
    <div className="paper-signature"><div><span>Authorized signature</span><strong>Nguyen T. Lan</strong></div><div className="stamp">VERIFIED<br />COPY</div></div>
    <div className="paper-footer"><span>Document reference: {document.id.toUpperCase()}</span><span>Page 1</span></div>
  </div></div>;
}

function ApprovalHistory({ item, role, audit, cases, onSelectCase, onBack, onExport, onApprove, onReject, onActivate }) {
  const events = audit.filter((entry) => entry.caseId === item.id);
  const status = STATUS_META[item.status];
  const checks = [
    { label: 'Mandatory evidence', passed: item.documents.every((doc) => doc.status === 'verified') },
    { label: 'Open compliance findings', passed: item.issues.every((issue) => issue.resolved) },
    { label: 'Executive recommendation', passed: Boolean(item.recommendation) },
    { label: 'Final human approval', passed: item.finalApproval?.decision === 'Approved' },
  ];
  const canApprove = role === 'manager' && item.status === 'awaiting_approval' && checks.slice(0, 3).every((check) => check.passed);
  return <div className="history-page">
    <section className="history-header"><div className="history-title"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={19} /></button>
      <span className="flag-avatar">{item.flag}</span><div><div className="case-title-line"><h1>{item.name}</h1>
        <span className={classNames('status-pill', status.tone)}>{status.label}</span></div><p>Immutable decision history · {item.id}</p></div></div>
      <div className="history-actions">{role !== 'supplier' && <label className="case-selector"><span>Case</span><select value={item.id} onChange={(event) => onSelectCase(event.target.value)}>
        {cases.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select></label>}
        <button className="button secondary" onClick={onExport}><Download size={16} /> Export CSV</button></div>
    </section>
    <div className="history-layout">
      <section className="audit-card"><div className="audit-card-header"><div><span className="section-kicker">Audit & approval history</span>
        <h2>Every machine finding and human decision</h2></div><span className="immutable-badge"><LockKeyhole size={14} /> Immutable log</span></div>
        <div className="audit-timeline">{events.length === 0 && <div className="empty-findings"><History size={30} /><strong>No activity yet</strong><p>Actions on this application will appear here.</p></div>}
          {events.map((event, index) => <article className="audit-event" key={event.id}><div className="audit-line">
            <span className={classNames('audit-dot', index === 0 && 'latest')}>{event.actor.includes('AI') ? <Sparkles size={14} /> : <UserRoundCheck size={14} />}</span></div>
            <div className="audit-event-card"><div className="audit-event-heading"><div><span>{event.type}</span><strong>{event.actor}</strong><small>{event.actorId}</small></div><time>{event.time}</time></div>
              <p>{event.detail}</p><div className="decision-diff"><div><span>AI recommendation</span><strong>{event.ai}</strong></div><ArrowRight size={15} />
                <div><span>Human decision</span><strong>{event.human}</strong></div></div>
              <div className="audit-reason"><MessageSquare size={14} /><span><strong>Reason:</strong> {event.reason}</span></div>
            </div></article>)}</div>
      </section>
      <aside className="approval-sidebar">
        <section className="approval-gate-card"><div className="approval-gate-icon"><ShieldCheck size={23} /></div><div><span className="section-kicker">Activation gate</span>
          <h2>{item.status === 'active' ? 'Vendor is active' : item.status === 'approved' ? 'Ready for ERP activation'
            : item.status === 'awaiting_approval' ? 'Final approval required' : 'Controls are still open'}</h2></div>
          <div className="gate-checklist">{checks.map((check) => <div className="gate-check-row" key={check.label}>
            <span className={check.passed ? 'passed' : ''}>{check.passed ? <Check size={14} /> : <Circle size={12} />}</span>
            <strong>{check.label}</strong><small>{check.passed ? 'Passed' : 'Required'}</small></div>)}</div>
          {item.status === 'active' ? <div className="erp-success"><Database size={20} /><div><span>ERP supplier ID</span><strong>{item.erpId}</strong></div></div>
            : item.status === 'approved' && role === 'manager' ? <button className="button primary full" onClick={onActivate}><Database size={16} /> Activate in ERP</button>
              : canApprove ? <div className="manager-actions"><button className="button primary full" onClick={onApprove}><CheckCircle2 size={16} /> Approve vendor</button>
                <button className="button danger-ghost full" onClick={onReject}><X size={16} /> Reject</button></div>
                : role === 'manager' && item.status === 'awaiting_approval' ? <button className="button primary full" disabled>Approval controls incomplete</button>
                  : <div className="approval-note">{role === 'supplier' ? <><Clock size={17} /><span>Your onboarding team will notify you when a decision is recorded.</span></>
                    : <><LockKeyhole size={17} /><span>{role === 'executive' ? 'Only the compliance manager can record final approval and activate ERP.' : 'A recommendation is required before final approval.'}</span></>}</div>}
        </section>
        <section className="control-note-card"><ShieldAlert size={19} /><div><strong>Human control is enforced</strong>
          <p>AI can classify, extract, compare, and recommend. It cannot approve or activate a vendor.</p></div></section>
      </aside>
    </div>
  </div>;
}

function Modal({ modal, item, onClose, onResolve, onRequest, onUpload, onRecommend, onDecision, onActivate, onUpdateProfile }) {
  const [value, setValue] = useState(modal.issue?.expected || '');
  const [reason, setReason] = useState('Cross-document verification');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const titleMap = {
    override: 'Correct AI finding', request: 'Request replacement evidence', upload: 'Upload document',
    recommend: 'Send approval recommendation', approve: 'Record final approval',
    reject: 'Reject vendor application', activate: 'Activate vendor in ERP', profile: 'Company record',
  };
  const submit = (event) => {
    event.preventDefault();
    if (modal.type === 'override') onResolve(modal.issue, 'override', value);
    if (modal.type === 'request') onRequest(modal.document, notes);
    if (modal.type === 'upload') onUpload(modal.document, file);
    if (modal.type === 'recommend') onRecommend(notes);
    if (modal.type === 'approve') onDecision('approve', notes);
    if (modal.type === 'reject') onDecision('reject', notes);
    if (modal.type === 'activate') onActivate();
    if (modal.type === 'profile') onUpdateProfile(new FormData(event.currentTarget));
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><div
    className={classNames('modal-card', modal.type === 'profile' && 'wide')} role="dialog"
    aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-header"><div><span className="section-kicker">{modal.type === 'profile' ? 'Supplier-maintained data' : item.id}</span>
      <h2 id="modal-title">{titleMap[modal.type]}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
    <form onSubmit={submit}><div className="modal-body">
      {modal.type === 'override' && <><div className="modal-context-card"><span>{modal.issue.field}</span><div><small>AI extracted</small><strong>{modal.issue.extracted}</strong></div><p>{modal.issue.detail}</p></div>
        <label className="form-field"><span>Verified value</span><input value={value} onChange={(event) => setValue(event.target.value)} autoFocus required /></label>
        <label className="form-field"><span>Reason taxonomy</span><select value={reason} onChange={(event) => setReason(event.target.value)}>
          <option>Cross-document verification</option><option>OCR or low-contrast error</option><option>Updated document supplied</option><option>Registry record verified</option><option>Approved policy exception</option>
        </select></label><label className="form-field"><span>Audit note</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)}
          placeholder="Describe the evidence you used to verify this value." required /></label>
        <div className="audit-preview"><LockKeyhole size={16} /> AI value, your correction, reason, timestamp, and user ID will be recorded.</div></>}
      {modal.type === 'request' && <><div className="modal-context-card horizontal"><span className="document-type-icon review"><FileText size={18} /></span>
        <div><strong>{modal.document.name}</strong><p>{modal.document.fileName || 'No file received'}</p></div></div>
        <label className="form-field"><span>What does the supplier need to provide?</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)}
          placeholder="Example: Upload a bank letter issued within the last 90 days showing the full legal entity name." required autoFocus /></label>
        <div className="supplier-preview-note"><Eye size={16} /> The supplier will see this instruction as their next best action.</div></>}
      {modal.type === 'upload' && <><div className="upload-requirement"><span className="document-type-icon missing"><FileText size={20} /></span>
        <div><span>Requested evidence</span><strong>{modal.document.name}</strong><p>PDF, JPG, or PNG · Maximum 20 MB · All pages visible</p></div></div>
        <label className={classNames('drop-zone', file && 'has-file')}><input type="file" accept=".pdf,.jpg,.jpeg,.png"
          onChange={(event) => setFile(event.target.files?.[0] || null)} required />
          {file ? <><FileCheck2 size={30} /><strong>{file.name}</strong><span>{Math.max(1, Math.round(file.size / 1024))} KB · Ready to upload</span></>
            : <><UploadCloud size={30} /><strong>Choose a file to upload</strong><span>or drag and drop it here</span></>}</label>
        <div className="audit-preview"><ShieldCheck size={16} /> Uploads are encrypted and automatically checked for completeness and expiry.</div></>}
      {modal.type === 'recommend' && <><div className="decision-summary success"><CheckCircle2 size={24} /><div><strong>All mandatory controls passed</strong>
        <p>Your recommendation will move this case to the compliance manager.</p></div></div>
        <label className="form-field"><span>Recommendation note</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)}
          placeholder="Summarize the evidence supporting your recommendation." required autoFocus /></label>
        <div className="approval-boundary"><ShieldAlert size={17} /> You are recommending approval, not approving the vendor. Final authority remains with the compliance manager.</div></>}
      {(modal.type === 'approve' || modal.type === 'reject') && <><div className={classNames('decision-summary', modal.type === 'reject' ? 'danger' : 'success')}>
        {modal.type === 'approve' ? <UserRoundCheck size={24} /> : <ShieldAlert size={24} />}<div>
          <strong>{modal.type === 'approve' ? 'Final human decision' : 'Return this application'}</strong>
          <p>{modal.type === 'approve' ? 'Approval unlocks ERP activation, but does not activate automatically.' : 'The supplier and onboarding executive will receive your reason.'}</p></div></div>
        <label className="form-field"><span>{modal.type === 'approve' ? 'Approval rationale' : 'Rejection reason'}</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record the basis for this decision." required autoFocus /></label></>}
      {modal.type === 'activate' && <><div className="erp-confirmation"><span className="erp-icon"><Database size={25} /></span>
        <div><span>Destination</span><strong>StyleSphere ERP · Supplier Master</strong><p>A new supplier ID will be created and synchronized after confirmation.</p></div></div>
        <div className="activation-checks">{['Mandatory evidence verified', 'Executive recommendation recorded', 'Final approval recorded'].map((label) =>
          <span key={label}><CheckCircle2 size={16} /> {label}</span>)}</div>
        <div className="approval-boundary"><LockKeyhole size={17} /> This activation is irreversible in this workflow and will be written to the audit history.</div></>}
      {modal.type === 'profile' && <div className="profile-form-grid">
        <label className="form-field span-2"><span>Legal entity name</span><input name="legalName" defaultValue={item.profile.legalName || item.name} required autoFocus /></label>
        <label className="form-field"><span>Country of registration</span><input name="country" defaultValue={item.country} required /></label>
        <label className="form-field"><span>Product category</span><input name="category" defaultValue={item.category} required /></label>
        <label className="form-field"><span>Tax identifier</span><input name="taxId" defaultValue={item.profile.taxId || ''} required /></label>
        <label className="form-field"><span>Import / export code</span><input name="iec" defaultValue={item.profile.iec || ''} /></label>
        <label className="form-field span-2"><span>Registered address</span><textarea name="address" defaultValue={item.profile.address || ''} required /></label>
        <div className="profile-verification-note span-2"><Sparkles size={17} /> We prefilled this record from your documents. Editing a verified field triggers a focused recheck.</div>
      </div>}
    </div><div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className={classNames('button', modal.type === 'reject' ? 'danger' : 'primary')}>
          {modal.type === 'override' && 'Save correction'}{modal.type === 'request' && 'Send request'}{modal.type === 'upload' && 'Upload & submit'}
          {modal.type === 'recommend' && 'Send recommendation'}{modal.type === 'approve' && 'Record approval'}{modal.type === 'reject' && 'Reject application'}
          {modal.type === 'activate' && 'Confirm ERP activation'}{modal.type === 'profile' && 'Save company record'}<ArrowRight size={16} />
        </button></div></form>
  </div></div>;
}

export default App;
