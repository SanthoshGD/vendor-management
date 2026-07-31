import { useEffect, useMemo, useRef, useState } from 'react';
import { useNexus } from '../context/AppContext';
import { Send, Sparkles, FileSearch, ShieldQuestion } from 'lucide-react';

const cx = (...values) => values.filter(Boolean).join(' ');

const SUGGESTIONS = [
  'Summarize this vendor.',
  'Explain the supplier action required.',
  'Explain the selected document.',
  'Explain the selected field.',
  'Why is this not ready to approve?',
  'What requires supervisor approval?',
  'Accept the currently selected field.',
];

function answer(question, context) {
  const {
    vendor, assessment, auditLogs, selectedDoc, selectedField,
    pendingSupervisor, authorityCeiling,
  } = context;
  const q = question.toLowerCase();
  const fields = vendor.documents.flatMap((doc) => doc.fields.map((field) => ({ ...field, doc })));
  const cite = (doc) => doc ? [{ label: doc.title, fileName: doc.fileName || 'not yet received' }] : [];
  const missing = vendor.documents.filter((doc) => doc.status === 'Missing');
  const correction = vendor.documents.find((doc) => doc.rejection);

  if (/summarize|summarise|summary|overview/.test(q)) {
    return {
      text: `${vendor.name} supplies ${vendor.category || 'an uncategorised category'} from ${vendor.country || 'an unstated country'}. ${vendor.verifiedCount}/${vendor.documents.length} documents are verified, ${assessment.open.length} finding(s) are open, and the application is ${vendor.finalStatus ? vendor.finalStatus.toLowerCase() : vendor.stage.toLowerCase()}.`,
      citations: vendor.documents.filter((doc) => doc.status !== 'Missing').slice(0, 2).flatMap(cite),
    };
  }

  if (/supplier action|provide|re-?upload|correction|required action/.test(q)) {
    if (correction) return { text: `The supplier must replace ${correction.title}. ${correction.rejection.reason}. ${correction.rejection.detail}`, citations: cite(correction) };
    if (missing.length) return { text: `The supplier must provide ${missing.map((doc) => doc.title).join(', ')} before review can conclude under PROC-3.3.`, citations: missing.flatMap(cite) };
    return { text: 'No supplier action is currently required. The submitted pack remains with the review team.', citations: [] };
  }

  if (/selected document|this document|document explain/.test(q)) {
    if (!selectedDoc) return { text: 'No document is selected. Select evidence in the review queue and ask again.', citations: [], refused: true };
    return {
      text: `${selectedDoc.title} is ${selectedDoc.status.toLowerCase()}. It contains ${selectedDoc.fields.length} extracted field(s). ${selectedDoc.rejection ? `${selectedDoc.rejection.reason}. ${selectedDoc.rejection.detail}` : 'No document-level correction request is open.'}`,
      citations: cite(selectedDoc),
    };
  }

  if (/selected field|this field|field explain/.test(q)) {
    if (!selectedDoc || !selectedField) return { text: 'No extracted field is selected. Open a reviewed document and select a field first.', citations: [], refused: true };
    const attention = selectedField.crossDocMismatch || selectedField.confidence < 90;
    return {
      text: `${selectedField.label} reads "${selectedField.translatedValue || selectedField.value}" at ${selectedField.confidence}% confidence. ${attention ? selectedField.mismatchNote || selectedField.diagnostic || 'This needs human verification.' : 'This field is cleared.'}`,
      citations: cite(selectedDoc),
    };
  }

  if (/accept.*selected|accept.*field/.test(q)) {
    if (!selectedDoc || !selectedField) return { text: 'I cannot accept a field because none is selected.', citations: [], refused: true };
    return { text: `${selectedField.label} has been accepted against ${selectedDoc.title} and recorded in the audit trail.`, citations: cite(selectedDoc), acceptSelected: !selectedField.humanVerified };
  }

  if (/supervisor|authority|ceiling|who can approve/.test(q)) {
    if (pendingSupervisor) return { text: `${pendingSupervisor.title} is already awaiting the supervisor. A duplicate request will not be created.`, citations: [] };
    if (vendor.riskScore > authorityCeiling) return { text: `Residual risk ${vendor.riskScore} exceeds the reviewer ceiling of ${authorityCeiling}. The case must be routed to the supervisor; direct approval is unavailable.`, citations: [] };
    return { text: `Risk ${vendor.riskScore} is within the reviewer ceiling of ${authorityCeiling}. Supervisor approval is not required unless the reviewer escalates or requests formal risk acceptance.`, citations: [] };
  }

  if (/outstanding|missing|waiting|still need/.test(q)) {
    if (!missing.length) return { text: `No mandatory document is missing. All ${vendor.documents.length} items were received.`, citations: [] };
    return { text: `${missing.length} document(s) are outstanding: ${missing.map((doc) => doc.title).join(', ')}.`, citations: missing.flatMap(cite) };
  }

  if (/bank|account|payment|mismatch/.test(q)) {
    const holder = fields.find((field) => field.key === 'account_holder_name');
    const legal = fields.find((field) => field.key === 'legal_name');
    const finding = assessment.findings.find((item) => item.kind === 'cross_doc' && item.clause?.id === 'FIN-4.1');
    if (!holder) return { text: 'No bank account holder has been extracted, so I cannot compare it with the registered entity.', citations: [] };
    return {
      text: finding && !finding.resolved
        ? `The account holder "${holder.translatedValue || holder.value}" does not reconcile with "${legal?.translatedValue || legal?.value || 'the legal name was not extracted'}". FIN-4.1 remains open.`
        : `The extracted bank account holder reconciles with the registered legal entity; no FIN-4.1 mismatch is open.`,
      citations: [holder.doc, legal?.doc].filter(Boolean).flatMap(cite),
    };
  }

  if (/why|not ready|blocked|approve|readiness/.test(q)) {
    if (vendor.finalStatus) return { text: `The human decision is already recorded as ${vendor.finalStatus}. ERP activation is separate.`, citations: [] };
    if (pendingSupervisor) return { text: `The decision is with the supervisor: ${pendingSupervisor.title}.`, citations: [] };
    if (!assessment.blockers.length && !missing.length) return { text: 'The evidence gate is clear. The final decision still requires an authorised human under PROC-5.1.', citations: [] };
    return {
      text: `${assessment.blockers.length} blocking finding(s) and ${missing.length} missing document(s) prevent approval: ${assessment.blockers.map((item) => `${item.title} (${item.clause?.id || 'policy'})`).join('; ') || 'mandatory evidence is incomplete'}.`,
      citations: assessment.blockers.filter((item) => item.docId).flatMap((item) => cite(vendor.documents.find((doc) => doc.id === item.docId))),
    };
  }

  if (/expir|valid|renew|soon/.test(q)) {
    const expiring = assessment.findings.filter((item) => item.kind === 'recency');
    if (!expiring.length) return { text: 'No evidence is inside the PROC-6.2 renewal window.', citations: [] };
    return { text: expiring.map((item) => `${item.title} (${item.clause?.id})`).join('; '), citations: expiring.flatMap((item) => cite(vendor.documents.find((doc) => doc.id === item.docId))) };
  }

  if (/decision|history|who|override/.test(q)) {
    const history = auditLogs.filter((log) => log.vendorId === vendor.id).slice(0, 3);
    return history.length
      ? { text: history.map((log) => `${log.actorName}: ${log.fieldLabel} - ${log.reason}`).join('. '), citations: [] }
      : { text: 'No human decision or override has been recorded for this vendor.', citations: [] };
  }

  return {
    text: `I can answer only from ${vendor.name}'s ${vendor.documents.length} documents, extracted fields, current findings, supervisor route, and audit history. That question is outside this evidence context.`,
    citations: [], refused: true,
  };
}

export default function VendorChat({ vendorId, selectedDocId, selectedFieldKey, authorityCeiling = 70 }) {
  const { getVendor, getAssessment, auditLogs, supervisorRequests, acceptField } = useNexus();
  const vendor = getVendor(vendorId);
  const assessment = getAssessment(vendorId);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const timerRef = useRef(null);
  const selectedDoc = vendor?.documents.find((doc) => doc.id === selectedDocId) || null;
  const selectedField = selectedDoc?.fields.find((field) => field.key === selectedFieldKey) || null;
  const pendingSupervisor = supervisorRequests.find((request) => request.vendorId === vendorId && request.status === 'open' && ['AUTHORITY', 'ESCALATION'].includes(request.type));
  const scope = useMemo(() => ({
    docs: vendor?.documents.length || 0,
    fields: vendor?.documents.flatMap((doc) => doc.fields).length || 0,
  }), [vendor]);

  useEffect(() => { setMessages([]); setTyping(false); }, [vendorId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, typing]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  if (!vendor) return null;

  const ask = (question) => {
    const text = question.trim();
    if (!text || typing) return;
    setMessages((current) => [...current, { role: 'me', text }]);
    setDraft('');
    setTyping(true);
    timerRef.current = window.setTimeout(() => {
      const reply = answer(text, {
        vendor, assessment, auditLogs, selectedDoc, selectedField,
        pendingSupervisor, authorityCeiling,
      });
      if (reply.acceptSelected && selectedDoc && selectedField) {
        acceptField(vendor.id, selectedDoc.id, selectedField.key, 'Accepted from the evidence-pack chat after explicit reviewer instruction.');
      }
      setMessages((current) => [...current, { role: 'ai', ...reply }]);
      setTyping(false);
    }, 650);
  };

  return (
    <aside className="vendor-chat">
      <header className="vendor-chat-head">
        <span className="ai-orb small"><Sparkles size={15} /></span>
        <div><strong>Ask this evidence pack</strong><small>{scope.docs} documents · {scope.fields} fields · current selection included</small></div>
      </header>
      <div className="vendor-chat-body">
        {messages.length === 0 && <div className="vendor-chat-empty"><ShieldQuestion size={18} /><p>Grounded in this vendor, current selection, findings, policy citations, decision history, and supervisor route.</p></div>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={cx('chat-bubble', message.role, message.refused && 'refused')}><p>{message.text}</p>{message.citations?.length > 0 && <div className="chat-citations">{message.citations.map((citation, citationIndex) => <span key={`${citation.label}-${citationIndex}`}><FileSearch size={11} /> {citation.label}</span>)}</div>}</div>)}
        {typing && <div className="chat-bubble ai typing"><span /><span /><span /><small>Reading current evidence…</small></div>}
        <div ref={endRef} />
      </div>
      <div className="vendor-chat-suggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion} disabled={typing} onClick={() => ask(suggestion)}>{suggestion}</button>)}</div>
      <form className="vendor-chat-composer" onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
        <input value={draft} disabled={typing} onChange={(event) => setDraft(event.target.value)} placeholder={`Ask about ${vendor.shortName || vendor.name}…`} />
        <button type="submit" disabled={typing || !draft.trim()} aria-label="Ask"><Send size={15} /></button>
      </form>
    </aside>
  );
}