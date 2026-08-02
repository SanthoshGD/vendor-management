import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bot, Building2, Check, Edit3, Eye, EyeOff, FileText,
  Lock, Mail, ShieldCheck, Sparkles, Trash2, Upload, X, Zap,
} from 'lucide-react';
import { useNexus, STEP_SUBMITTED, inspectUpload } from '../context/NexusContext';

const cx = (...items) => items.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// The supplier's onboarding journey, in one file.
//
//   invite email  ->  create account  ->  [ 0 welcome  ->  1 documents
//                                           ->  2 details  ->  3 review ]  ->  submitted
//
// The two screens before the wizard are gates, not steps: they are how someone
// arrives, so they carry no step number and no progress bar. `OnboardingExperience`
// in RedesignedApp.jsx owns which gate is showing and varies the shell chrome
// to match  -  the email screen is full-bleed dark, the account screen is a
// single centred card, and only the wizard proper gets the stepper.
//
// Two navigation rules hold across every wizard screen:
//   - Back is one arrow, left of that screen's own heading. Beside the title it
//     reads as "undo this step" rather than as browser chrome.
//   - Save draft sits with the forward button at the right edge, from the
//     documents step onward. Splitting them to opposite edges made one row look
//     like two unrelated toolbars.
//
// Forward buttons are single-function: Next / Continue / Submit.
// ---------------------------------------------------------------------------

const COUNTRIES = ['China', 'Vietnam', 'India', 'Bangladesh', 'Turkiye', 'Italy', 'Spain', 'Portugal', 'Morocco', 'Other'];

// Declared once: the details form reads this to know what to submit, and the
// AI-review meter reads it to know what it is counting. Two lists would drift.
const PROFILE_KEYS = [
  'legalName', 'tradingName', 'registrationNumber', 'taxId', 'country', 'address',
  'category', 'contactName', 'contactRole', 'contactEmail', 'contactPhone',
];

// One fashion product per entry. `checklistForCategory` in AppContext matches
// on keywords, so these words decide which evidence pack a supplier is asked
// for  -  "Handbags" routes to the leather-and-textiles checklist, "Shoes"
// falls through to the generic one. Check that mapping before renaming any.
const CATEGORIES = [
  'Handbags', 'Backpacks', 'Wallets', 'Luggage', 'Belts',
  'Shoes', 'Sneakers', 'Boots', 'Sandals',
  'T-shirts', 'Shirts', 'Blouses', 'Dresses', 'Skirts', 'Trousers', 'Denim',
  'Jackets', 'Coats', 'Knitwear', 'Activewear', 'Swimwear',
  'Lingerie', 'Socks', 'Hats', 'Scarves', 'Gloves',
  'Sunglasses', 'Watches', 'Jewellery',
];

const toneForStatus = (status) => {
  if (status === 'Verified') return 'green';
  if (status === 'Flagged' || status === 'Missing') return 'red';
  return 'blue';
};

// Inside the wizard nothing has been reviewed yet, so a supplied file is
// "Uploaded" and nothing more. Showing "Verified" here would be the prototype
// telling the supplier their document passed a check that has not run.
const draftStatusLabel = (status) => (status === 'Missing' ? 'Missing' : 'Uploaded');

// No real OCR here. Values are synthesised from what the invite already
// carries so choosing the AI path visibly saves typing. No confidence score is
// surfaced: a percentage invites the supplier to trust the high numbers and
// skim, when the point of that screen is that they confirm every field.
function synthesizeExtraction(vendor) {
  const isCustomVendor = vendor.name && vendor.name !== 'Your company' && vendor.name !== 'Guangzhou Artisan Leathers Co., Ltd.';
  const knownName = isCustomVendor ? vendor.name : 'Leather Kings Co., Ltd.';
  const knownEmail = isCustomVendor && vendor.email && vendor.email !== 'pending@vendor.com' ? vendor.email : 'anubhav@leatherkings.cn';
  const knownContact = isCustomVendor && vendor.contact && vendor.contact !== 'Pending assignment' ? vendor.contact : 'Anubhav Srivastav';
  const suffix = vendor.id ? vendor.id.replace(/\D/g, '').slice(-4).padStart(4, '0') : '9988';
  const country = vendor.country && vendor.country !== 'Not yet provided' ? vendor.country : 'China';

  return {
    legalName: knownName.includes('Co.') ? knownName : `${knownName} Co., Ltd.`,
    tradingName: vendor.shortName && vendor.shortName !== knownName ? vendor.shortName : 'Leather Kings',
    registrationNumber: isCustomVendor ? `${suffix}-CH` : '91440101LK998822CN',
    taxId: isCustomVendor ? `TIN-${suffix}882` : 'TIN-LK998822',
    country,
    address: isCustomVendor ? `Industrial Zone Block ${suffix.slice(0, 2) || '88'}, ${country}` : 'No. 88 Leather Industrial Avenue, Baiyun District, Guangzhou, Guangdong, China',
    category: vendor.category && vendor.category !== 'Uncategorized' ? vendor.category : 'Handbags',
    contactName: knownContact,
    contactRole: 'Founder & Export Director',
    contactEmail: knownEmail,
    contactPhone: '+86 20 8899 9988',
  };
}

// ---------------------------------------------------------------------------
// Stepper  -  lives in the shell header, not above the card.
//
// It is a location indicator, so it belongs with the other persistent
// wayfinding (brand, company) rather than occupying the top of the content
// column, where it pushed the actual heading below the fold on a laptop.
// ---------------------------------------------------------------------------
export function WizardStepper({ step, method }) {
  // One word per step. The sub-labels underneath were restating the step's own
  // heading, which the screen shows three lines later at four times the size  -
  // so they cost a whole row of header height to say nothing new.
  const labels = ['Welcome', 'Documents', method === 'ai' ? 'AI review' : 'Details', 'Submit'];
  return (
    // Connectors are drawn by CSS as a pseudo-element on each step after the
    // first, and they all share the same flex basis, so they resolve to equal
    // widths whatever the labels say. The previous pass let them size to the
    // leftover space beside pills of different widths, which is why the header
    // read as a run of mismatched dashes.
    <ol className="wizard-stepper">
      {labels.map((title, index) => {
        const state = index < step ? 'done' : index === step ? 'current' : 'next';
        return (
          <li
            className={cx('wizard-stepper-step', state)}
            key={title}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {/* The pill lives on this inner span, not on the <li>. The
                connector is a pseudo-element of the <li>, so a background on
                the <li> painted the dash as part of the highlight  -  the
                current step read as "- Documents" rather than "Documents". */}
            <span className="wizard-stepper-pill">
              <span className="wizard-stepper-dot">
                <b className="wizard-stepper-num">{index + 1}</b>
                <b className="wizard-stepper-check"><Check size={13} /></b>
              </span>
              <span className="wizard-stepper-label">{title}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Gate 1  -  the invitation email.
//
// A supplier's first contact with StyleSphere is an email from a company they
// may not have heard of, asking them to hand over tax and banking documents.
// Showing that email as the opening frame makes the prototype honest about
// where the journey starts, and gives the reviewer something to point at when
// they ask "what does the supplier actually receive?".
// ---------------------------------------------------------------------------
export function InviteEmailStep({ vendor, onAccept }) {
  const highlights = [
    'Company details & registration',
    `${vendor.documents.length} required compliance documents`,
    'AI-powered verification  -  24-48 h',
  ];
  return (
    <div className="invite-mail-stage">
      <article className="invite-mail">
        <header className="invite-mail-chrome">
          <span className="invite-mail-lights"><i /><i /><i /></span>
          <span className="invite-mail-tab">Inbox  -  {vendor.shortName || vendor.name}</span>
        </header>

        <div className="invite-mail-body">
          <div className="invite-mail-from">
            <span className="company-avatar">SS</span>
            <span className="invite-mail-sender">
              <strong>StyleSphere Vendor Nexus</strong>
              <small>vendor-nexus@stylesphere.com &middot; to you</small>
            </span>
            <time>Today, 09:14</time>
          </div>

          <h1>You&apos;ve been invited to join StyleSphere Vendor Nexus</h1>
          <p className="invite-mail-lede">
            <strong>Elena Rostova</strong> at StyleSphere has invited{' '}
            <strong>{vendor.name}</strong> to complete vendor onboarding.
          </p>

          <ul className="invite-mail-list">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <button type="button" className="button primary large full" onClick={onAccept}>
            Accept invitation &amp; create account <ArrowRight size={15} />
          </button>

          {/* <p className="invite-mail-meta">Application {vendor.id} &middot; Expires in 14 days</p> */}
        </div>
      </article>
      {/* <p className="invite-mail-hint"><Mail size={13} /> Prototype: this is the email the supplier receives.</p> */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gate 2  -  create the account.
// ---------------------------------------------------------------------------
export function CreateAccountStep({ vendor, onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(vendor.email && vendor.email !== 'pending@vendor.com' ? vendor.email : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const steps = [
    ['Upload your documents', `${vendor.documents.length} files from your existing records`],
    ['Confirm your company details', 'Pre-filled for you, or typed in yourself'],
    ['Submit for review', 'A compliance reviewer decides within 24-48 h'],
  ];

  // Password rules validation
  const rules = [
    { label: 'At least 8 characters long', valid: password.length >= 8 },
    { label: 'Contains at least one uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'Contains at least one lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'Contains at least one number (0-9)', valid: /[0-9]/.test(password) },
    { label: 'Contains at least one special character (!@#$%^&*)', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const allRulesPassed = rules.every((r) => r.valid);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const showPasswordError = confirmTouched && confirmPassword.length > 0 && !passwordsMatch;

  const isFormValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    allRulesPassed &&
    passwordsMatch;

  return (
    <div className="auth-stage">
      <aside className="auth-aside">
        <span className="wizard-badge"><ShieldCheck size={14} /> Secure onboarding link</span>
        <h2 className="auth-aside-title">Onboarding for<br /><strong>{vendor.name}</strong></h2>
        <p className="auth-aside-lede">
          Set up your account to start the application. Everything you enter is saved as you go.
        </p>
        <ol className="auth-steps">
          {steps.map(([title, note], index) => (
            <li key={title}>
              <span className="auth-step-num">{index + 1}</span>
              <span className="auth-step-text"><strong>{title}</strong><small>{note}</small></span>
            </li>
          ))}
        </ol>
        <p className="auth-assurance">
          <Lock size={13} /> Your documents are visible only to the StyleSphere compliance team.
        </p>
      </aside>

      <div className="auth-panel">
        <h1>Create your account</h1>
        {/* <p className="auth-for">Application {vendor.id}</p> */}

        <form className="auth-card" onSubmit={(event) => { event.preventDefault(); if (isFormValid) onDone(); }}>
          <label className="form-field">
            <span>Full name <em className="req" style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zhang Fang" required />
          </label>
          <label className="form-field">
            <span>Work email <em className="req" style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </label>
          <label className="form-field">
            <span>Password <em className="req" style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'grid',
                  placeItems: 'center',
                  padding: '4px'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {/* Password Requirements Box */}
          {password.length > 0 && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <strong style={{ color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password requirements:
              </strong>
              {rules.map((rule) => (
                <div key={rule.label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: rule.valid ? '#16a34a' : '#64748b'
                }}>
                  <span style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: rule.valid ? '#dcfce7' : '#f1f5f9',
                    color: rule.valid ? '#16a34a' : '#94a3b8',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {rule.valid ? '✓' : '•'}
                  </span>
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          )}

          <label className="form-field">
            <span>Re-enter password <em className="req" style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmTouched(true);
                }}
                onBlur={() => setConfirmTouched(true)}
                placeholder="Re-enter your password"
                required
                style={{
                  paddingRight: '40px',
                  borderColor: showPasswordError ? '#ef4444' : undefined,
                  boxShadow: showPasswordError ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'grid',
                  placeItems: 'center',
                  padding: '4px'
                }}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {/* Password mismatch error feedback */}
          {showPasswordError && (
            <div style={{
              color: '#dc2626',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '-8px'
            }}>
              <X size={14} /> Passwords do not match
            </div>
          )}

          {confirmPassword.length > 0 && passwordsMatch && (
            <div style={{
              color: '#16a34a',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '-8px'
            }}>
              <Check size={14} /> Passwords match
            </div>
          )}

          <button
            type="submit"
            className="button primary large full"
            disabled={!isFormValid}
            style={{
              opacity: isFormValid ? 1 : 0.5,
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              pointerEvents: isFormValid ? 'auto' : 'none',
            }}
          >
            Create account <ArrowRight size={15} />
          </button>
        </form>

        <p className="auth-terms">By continuing you agree to StyleSphere&apos;s supplier terms.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The wizard proper.
// ---------------------------------------------------------------------------
// The single definition of "which step is this supplier allowed to be on".
//
// Exported because the shell header renders the stepper and the wizard renders
// the body, and they were reading `vendor.onboardingStep` independently  -  so
// the header could say "step 3 of 4" while the body showed step 1. One
// function, both callers, no drift.
//
//   step 1 (documents) requires a chosen method
//   step 2 (details)   requires every document supplied
//
// A submitted application is past the wizard and is deliberately not re-gated:
// its pack is evidence a reviewer is working from, not a form to re-walk.
export function allowedStep(vendor) {
  if (!vendor) return 0;
  const stored = vendor.onboardingStep ?? 0;
  if (stored >= STEP_SUBMITTED) return stored;
  const methodChosen = Boolean(vendor.onboardingMethod);
  const allSupplied = (vendor.documents || []).every((doc) => doc.status !== 'Missing');
  const furthest = !methodChosen ? 0 : !allSupplied ? 1 : STEP_SUBMITTED;
  return Math.min(stored, furthest);
}

function AiExtractionLoader({ docsCount, onComplete }) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(20);

  const stages = [
    'Scanning 7 uploaded compliance documents...',
    'Running AI OCR text extraction on legal entity & registration...',
    'Extracting tax identification, address & contact information...',
    'Verifying cross-document consistency & auto-filling fields...',
  ];

  useEffect(() => {
    const t1 = setTimeout(() => { setStage(1); setProgress(50); }, 750);
    const t2 = setTimeout(() => { setStage(2); setProgress(80); }, 1500);
    const t3 = setTimeout(() => { setStage(3); setProgress(100); }, 2250);
    const t4 = setTimeout(() => { onComplete(); }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#0F172A', color: '#F8FAFC', padding: '36px 40px', borderRadius: '24px', maxWidth: '460px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 20px auto', display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(93, 210, 165, 0.3)' }} />
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'grid', placeItems: 'center', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
            <Sparkles size={28} color="#FFFFFF" />
          </div>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#F8FAFC' }}>
          AI Document Analysis &amp; Extraction
        </h3>

        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: 1.5, minHeight: '38px' }}>
          {stages[stage]}
        </p>

        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', transition: 'width 0.5s ease', borderRadius: '999px' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
          <span>{docsCount} files scanned</span>
          <span>{progress}% complete</span>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingWizard({ vendor: propVendor = null, onFinish = () => { } }) {
  const nexus = useNexus();
  const [isExtracting, setIsExtracting] = useState(false);
  const activeVendor = propVendor || (nexus?.getVendor ? nexus.getVendor(nexus.activeVendorId) : null);

  const {
    setOnboardingStep, setOnboardingMethod, saveVendorProfile,
    uploadDocument, deleteDocument, submitApplication, notify,
  } = nexus || {};

  const vendor = activeVendor || { id: 'fallback', onboardingStep: 0, documents: [] };
  const storedStep = vendor?.onboardingStep ?? 0;
  const step = allowedStep(vendor);

  useEffect(() => {
    if (vendor.id !== 'fallback' && step !== storedStep && setOnboardingStep) {
      setOnboardingStep(vendor.id, step);
    }
  }, [step, storedStep, vendor?.id, setOnboardingStep]);

  if (!activeVendor) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold">Loading Vendor Onboarding Workspace...</p>
      </div>
    );
  }

  const go = (next) => setOnboardingStep(vendor.id, next);
  const back = () => go(Math.max(0, step - 1));
  const saveDraft = () => notify('Draft saved.');

  if (step >= STEP_SUBMITTED) return null;

  return (
    <div className="wizard-page">
      {isExtracting && (
        <AiExtractionLoader
          docsCount={vendor.documents.length}
          onComplete={() => {
            setIsExtracting(false);
            go(2);
          }}
        />
      )}
      {step === 0 && (
        <WelcomeStep
          vendor={vendor}
          onChoose={(method) => {
            setOnboardingMethod(vendor.id, method);
            vendor.documents.forEach((doc) => {
              if (doc.status !== 'Missing') deleteDocument(vendor.id, doc.id);
            });
            go(1);
          }}
        />
      )}
      {step === 1 && (
        <DocumentsStep
          vendor={vendor}
          onBack={back}
          onDraft={saveDraft}
          onUpload={(docId, fileName, verdict, meta) => uploadDocument(vendor.id, docId, fileName, verdict, meta)}
          onDelete={(docId) => deleteDocument(vendor.id, docId)}
          onNext={() => {
            if (vendor.onboardingMethod === 'ai' || !vendor.onboardingMethod) {
              setIsExtracting(true);
            } else {
              go(2);
            }
          }}
        />
      )}
      {step === 2 && (
        <DetailsStep
          vendor={vendor}
          method={vendor.onboardingMethod || 'manual'}
          onBack={back}
          onDraft={saveDraft}
          onSave={(profile) => { saveVendorProfile(vendor.id, profile); go(3); }}
        />
      )}
      {step === 3 && (
        <ReviewStep
          vendor={vendor}
          onBack={back}
          onDraft={saveDraft}
          onSubmit={() => {
            if (submitApplication) submitApplication(vendor.id);
            if (notify) notify('Application submitted successfully!');
            if (onFinish) onFinish();
          }}
        />
      )}
    </div>
  );
}

// The heading block every wizard screen shares: back arrow, kicker, title.
// One component so the arrow cannot drift out of alignment between screens.
function StepHead({ onBack, kicker, title, blurb, aside }) {
  return (
    <header className="step-head">
      {onBack && (
        <button type="button" className="icon-button wizard-back" aria-label="Go back a step" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
      )}
      <div className="step-head-text">
        {kicker && <span className="section-kicker">{kicker}</span>}
        <h2>{title}</h2>
        {blurb && <p>{blurb}</p>}
      </div>
      {aside}
    </header>
  );
}

// The action row. Draft and the forward button are grouped at the right edge:
// they are the same decision ("leave, or go on"), so they belong together.
// Any status note stays left, where it reads as context rather than a control.
function StepActions({ note, onDraft, children }) {
  return (
    <footer className="step-actions">
      {note && <span className="step-actions-note">{note}</span>}
      <span className="step-actions-buttons">
        {onDraft && (
          <button type="button" className="button secondary large wizard-draft" onClick={onDraft}>
            Save draft
          </button>
        )}
        {children}
      </span>
    </footer>
  );
}

function WelcomeStep({ vendor, onChoose }) {
  const total = vendor.documents.length;
  const needs = vendor.documents.slice(0, 4);
  const more = total - needs.length;
  return (
    <section className="step-panel welcome-panel">
      <div className="welcome-head">
        <div className="welcome-head-text">
          {/* <span className="wizard-badge"><ShieldCheck size={14} /></span> */}
          <h1>Start your application</h1>
          <p className="welcome-lede">
            Add your company details and {total} required documents.
            Submit once to begin compliance review.
          </p>
        </div>
      </div>

      {/* <section className="welcome-block">
        <h3 className="block-label">What you&apos;ll need</h3>
        <div className="need-grid">
          {needs.map((doc) => (
            <article className="need-card" key={doc.id}>
              <span className="need-icon"><FileText size={16} /></span>
              <span className="need-text">
                <strong>{doc.title}</strong>
                <small>{doc.code}</small>
              </span>
            </article>
          ))}
        </div>
        {more > 0 && <p className="need-more">and {more} more in the {vendor.checklistLabel || 'supplier'} checklist</p>}
      </section> */}

      <section className="welcome-block">
        <h3 className="block-label">How would you like to fill in your details?</h3>
        <div className="method-grid">
          <MethodCard
            icon={Bot}
            tone="violet"
            title="AI-assisted"
            tag="Recommended"
            body="Upload your documents first. AI reads them and fills in your company details for you to check."
            cta="Get started"
            onClick={() => onChoose('ai')}
          />
          <MethodCard
            icon={Edit3}
            title="Fill in manually"
            body="Upload your documents and type your company details yourself."
            cta="Get started"
            onClick={() => onChoose('manual')}
          />
        </div>
      </section>
    </section>
  );
}

// A card that is entirely one button. The visible "Get started ->" row is the
// affordance  -  without it the card reads as a panel and testers hovered the
// title looking for a link.
function MethodCard({ icon: Icon, tone, title, tag, body, cta, onClick }) {
  return (
    <button type="button" className={cx('method-card', tag && 'is-recommended')} onClick={onClick}>
      <span className={cx('method-icon', tone)}><Icon size={17} /></span>
      <span className="method-title">
        <strong>{title}</strong>
        {tag && <em className="method-tag">{tag}</em>}
      </span>
      <span className="method-body">{body}</span>
      <span className="method-cta">{cta} <ArrowRight size={14} /></span>
    </button>
  );
}

function DocumentsStep({ vendor, onBack, onDraft, onUpload, onDelete, onNext }) {
  const [pending, setPending] = useState(null);
  const total = vendor.documents.length;

  const validSupplied = vendor.documents.filter((d) => {
    const isMissing = d.status === 'Missing';
    const isWrong = d.status === 'Flagged' || d.pendingVerdict?.pass === false || d.verdict?.pass === false || d.rejection != null;
    return !isMissing && !isWrong;
  }).length;

  const allValidSupplied = total > 0 && validSupplied === total;
  const outstanding = total - validSupplied;

  // Attaches a stand-in file to every outstanding requirement at once.
  const autoFill = () => {
    vendor.documents
      .filter((doc) => doc.status === 'Missing' || doc.status === 'Flagged' || doc.pendingVerdict?.pass === false || doc.verdict?.pass === false || doc.rejection != null)
      .forEach((doc) => onUpload(doc.id, `${doc.code.toLowerCase()}_sample.pdf`, { pass: true }, { fileType: 'PDF', fileSize: '2.4 MB' }));
  };

  return (
    <section className="step-panel">
      <StepHead
        onBack={onBack}
        kicker="Step 2 of 4"
        title="Upload required documents"
        blurb={<>Every file in the <strong>{vendor.checklistLabel || 'supplier'}</strong> checklist. Review starts after you submit.</>}
        aside={(
          <span className="step-progress">
            <strong>{validSupplied}<small>/{total}</small></strong>
            <span className="step-progress-bar"><i style={{ width: `${(validSupplied / total) * 100}%` }} /></span>
          </span>
        )}
      />

      <ul className="doc-list">
        {vendor.documents.map((doc) => {
          const isMissing = doc.status === 'Missing';
          const isWrong = doc.status === 'Flagged' || doc.pendingVerdict?.pass === false || doc.verdict?.pass === false || doc.rejection != null;
          const isValid = !isMissing && !isWrong;

          const fileTypeStr = doc.fileType || (doc.fileName ? doc.fileName.split('.').pop()?.toUpperCase() : 'PDF');
          const fileSizeStr = doc.fileSize || '2.4 MB';
          const defaultMetaStr = 'PDF, PNG, JPG • Max 10 MB';
          const subtitleText = isMissing ? defaultMetaStr : `${doc.fileName} • ${fileTypeStr} • ${fileSizeStr}`;

          const rowClass = cx(
            'doc-row',
            isMissing ? 'is-missing' : isValid ? 'is-valid' : 'is-wrong'
          );

          return (
            <li className={rowClass} key={doc.id}>
              <span className={cx('doc-icon', isWrong ? 'red' : 'brand-green')}><FileText size={16} /></span>
              <span className="doc-text">
                <strong>{doc.title} <em className="req" style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></strong>
                <small>{subtitleText}</small>
                {isWrong && (
                  <small style={{ color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                    {doc.rejection?.reason || doc.pendingVerdict?.reason || 'Invalid file uploaded.'}
                  </small>
                )}
              </span>
              <span className="doc-status-slot">
                {!isMissing && (
                  <span className={cx('status-pill', isValid ? 'green' : 'red')}>
                    {isValid ? 'Uploaded' : 'Invalid file'}
                  </span>
                )}
              </span>
              {/* Only show upload button when file is missing */}
              <span className="doc-action-slot">
                {isMissing && (
                  <label className="button secondary compact doc-upload">
                    <Upload size={14} /> {pending === doc.id ? 'Uploading' : 'Choose file'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setPending(doc.id);
                        const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
                        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
                        const fileSizeFormatted = `${sizeMb > 0 ? sizeMb : '0.1'} MB`;
                        const verdict = await inspectUpload(file);
                        onUpload(doc.id, file.name || `${doc.code.toLowerCase()}_certificate.pdf`, verdict, { fileType: ext, fileSize: fileSizeFormatted });
                        window.setTimeout(() => setPending(null), 400);
                        event.target.value = '';
                      }}
                    />
                  </label>
                )}
              </span>
              {/* Delete appears once there is a file to delete */}
              <span className="doc-trash-slot">
                {!isMissing && (
                  <button
                    type="button"
                    className="icon-button wizard-doc-delete"
                    aria-label={`Remove ${doc.title}`}
                    title="Remove this file"
                    onClick={() => onDelete(doc.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="doc-autofill">
        <span className="doc-autofill-icon"><Zap size={15} /></span>
        <span className="doc-autofill-text">
          <strong>Attach sample documents</strong>
          <small>Fills every outstanding requirement with a sample file so you can walk the rest of the flow.</small>
        </span>
        <button type="button" className="button secondary compact doc-autofill-button" disabled={allValidSupplied} onClick={autoFill}>
          {allValidSupplied ? 'All attached' : `Attach ${outstanding}`}
        </button>
      </div>

      <StepActions
        note={allValidSupplied ? 'All required documents validly supplied.' : `${outstanding} still needed`}
        onDraft={onDraft}
      >
        <button type="button" className="button primary large" disabled={!allValidSupplied} onClick={onNext}>
          Next <ArrowRight size={15} />
        </button>
      </StepActions>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Step 3  -  details.
//
// AI-FILLED FIELDS CARRY NO BADGE. An earlier pass tagged every extracted field
// with an "AI" pill, which put eleven identical violet chips on one screen: the
// marker repeated so often it stopped marking anything, and it competed with
// the labels it sat beside. The signal is now positional and temporal instead:
//
//   - an unchecked extracted field carries a violet rail down its left edge;
//   - touching it (focus, then leave) or editing it turns that rail green and
//     drops a tick in the gutter  -  the supplier has taken ownership;
//   - one meter in the heading counts what is left.
//
// So the panel visibly drains of violet as the supplier works down it, and
// "which of these did a machine write, and which have I actually looked at?"
// is answerable without reading a word. Still no confidence percentage: a
// score invites skim-and-trust, and this screen exists to prevent exactly that.
// ---------------------------------------------------------------------------
function DetailsStep({ vendor, method, onBack, onDraft, onSave }) {
  const existing = vendor.profile || {};
  const isAi = method === 'ai';
  const ai = isAi ? synthesizeExtraction(vendor) : null;

  const valueFor = (key) => existing[key] || ai?.[key] || '';
  const filledByAi = (key) => Boolean(isAi && !existing[key] && ai?.[key]);

  const aiKeys = PROFILE_KEYS.filter(filledByAi);
  const [checked, setChecked] = useState(() => new Set(['legalName', 'country', 'contactName', 'contactEmail']));
  // Idempotent on purpose: fired from both blur and change, and a field can
  // only be confirmed once.
  const confirm = (key) => setChecked((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

  const done = aiKeys.filter((key) => checked.has(key)).length;
  const marks = (key) => (filledByAi(key)
    ? { ai: true, checked: checked.has(key), onConfirm: () => confirm(key) }
    : {});

  const submit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawData = Object.fromEntries(
      PROFILE_KEYS.map((key) => [key, (form.get(key) || '').toString().trim()]),
    );
    const mergedProfile = {
      ...ai,
      ...existing,
      ...rawData,
    };
    if (!mergedProfile.legalName || mergedProfile.legalName === 'Your company') {
      mergedProfile.legalName = 'Leather Kings Co., Ltd.';
    }
    if (!mergedProfile.tradingName || mergedProfile.tradingName === 'Your company') {
      mergedProfile.tradingName = 'Leather Kings';
    }
    if (!mergedProfile.contactName) {
      mergedProfile.contactName = 'Anubhav Srivastav';
    }
    if (!mergedProfile.contactEmail) {
      mergedProfile.contactEmail = 'anubhav@leatherkings.cn';
    }
    onSave(mergedProfile);
  };

  return (
    <form className={cx('step-panel', isAi && 'is-ai-review')} onSubmit={submit}>
      <StepHead
        onBack={onBack}
        kicker="Step 3 of 4"
        title={isAi ? 'Verify your company details' : 'Enter company details'}
        blurb={isAi
          ? 'Read from the documents you uploaded. Check each field against your records and correct anything wrong.'
          : 'Use the exact details shown on your official documents.'}
      />

      <fieldset className="field-group">
        <legend className="block-label">Legal entity</legend>
        <div className="field-grid">
          <Field name="legalName" label="Registered legal name" placeholder="e.g. Aurora Wearables Limited" required span2 defaultValue={valueFor('legalName')} {...marks('legalName')} />
          <Field name="tradingName" label="Trading name" placeholder="The name you are known by" defaultValue={valueFor('tradingName')} {...marks('tradingName')} />
          <Field name="registrationNumber" label="Company registration number" placeholder="e.g. 0312345678" required defaultValue={valueFor('registrationNumber')} {...marks('registrationNumber')} />
          <Field name="taxId" label="Tax identification number" placeholder="VAT / GST / TIN" required defaultValue={valueFor('taxId')} {...marks('taxId')} />
          <Select name="country" label="Country of registration" options={COUNTRIES} exclude="Not yet provided" required defaultValue={valueFor('country') || vendor.country} {...marks('country')} />
          <Field name="address" label="Registered address" placeholder="Street, city, postal code" required span2 defaultValue={valueFor('address')} {...marks('address')} />
          <Select name="category" label="Primary product" options={CATEGORIES} exclude="Uncategorized" required defaultValue={valueFor('category') || vendor.category} {...marks('category')} />
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend className="block-label">Primary contact</legend>
        <div className="field-grid">
          <Field name="contactName" label="Full name" placeholder="e.g. Lin Wei" required defaultValue={valueFor('contactName')} {...marks('contactName')} />
          <Field name="contactRole" label="Role" placeholder="e.g. Export Manager" required defaultValue={valueFor('contactRole')} {...marks('contactRole')} />
          <Field name="contactEmail" label="Email" type="email" placeholder="you@company.com" required defaultValue={valueFor('contactEmail')} {...marks('contactEmail')} />
          <Field name="contactPhone" label="Phone" placeholder="+86 ..." required defaultValue={valueFor('contactPhone')} {...marks('contactPhone')} />
        </div>
      </fieldset>

      <StepActions
        note={isAi && aiKeys.length
          ? (done === aiKeys.length
            ? <strong>Every extracted field has been checked.</strong>
            : <strong>{aiKeys.length - done} extracted {aiKeys.length - done === 1 ? 'field is' : 'fields are'} still unchecked. The colored left border indicates which fields still need your review.</strong>)
          : null}
        onDraft={onDraft}
      >
        <button type="submit" className="button primary large">Continue <ArrowRight size={15} /></button>
      </StepActions>
    </form>
  );
}

// A field is one of three things, and the class says which: plain, extracted
// and unchecked (`is-ai`), extracted and confirmed (`is-ai is-checked`). The
// rail and the gutter tick are drawn in CSS off those classes  -  no badge
// element is rendered at all.
function Field({ label, name, placeholder, type = 'text', required, defaultValue, span2, ai, checked, onConfirm }) {
  return (
    <label className={cx('field', span2 && 'span-2', ai && 'is-ai', ai && checked && 'is-checked')}>
      <span className="field-label">
        {label}{required && <em className="req">*</em>}
      </span>
      <span className="field-control">
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue || ''}
          onBlur={onConfirm}
          onChange={onConfirm}
        />
      </span>
    </label>
  );
}

function Select({ label, name, options, exclude, defaultValue, span2, ai, checked, onConfirm, required }) {
  const chosen = defaultValue && defaultValue !== exclude ? defaultValue : '';
  const list = [chosen, ...options].filter((c, i, all) => c && c !== exclude && all.indexOf(c) === i);
  return (
    <label className={cx('field', span2 && 'span-2', ai && 'is-ai', ai && checked && 'is-checked')}>
      <span className="field-label">{label}{required && <em className="req">*</em>}</span>
      <span className="field-control">
        <select name={name} defaultValue={chosen || list[0]} onBlur={onConfirm} onChange={onConfirm} required={required}>
          {list.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </span>
    </label>
  );
}

function ReviewStep({ vendor, onBack, onDraft, onSubmit }) {
  const profile = vendor.profile || {};
  const [declared, setDeclared] = useState(false);
  const rows = [
    ['Registered legal name', profile.legalName],
    ['Trading name', profile.tradingName],
    ['Registration number', profile.registrationNumber],
    ['Tax identification number', profile.taxId],
    ['Country of registration', profile.country],
    ['Registered address', profile.address],
    ['Primary product', profile.category],
    ['Primary contact', [profile.contactName, profile.contactRole].filter(Boolean).join('  -  ')],
    ['Contact email', profile.contactEmail],
    ['Contact phone', profile.contactPhone],
  ].filter(([, value]) => value);

  return (
    <section className="step-panel">
      <StepHead
        onBack={onBack}
        kicker="Step 4 of 4"
        title="Review and submit"
        blurb="Check your details and files. Any requested changes will appear here after review."
      />

      <div className="review-grid">
        <article className="review-block">
          <h3 className="block-label"><Building2 size={14} /> Company profile</h3>
          <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </article>
        <article className="review-block">
          <h3 className="block-label"><FileText size={14} /> Evidence pack</h3>
          <ul className="review-docs">
            {vendor.documents.map((doc) => (
              <li key={doc.id}>
                <span className={cx('status-dot', toneForStatus(doc.status))} />
                <span className="review-doc-text">
                  <strong>{doc.title}</strong>
                  <small>{doc.fileName || 'Not supplied'}</small>
                </span>
                <span className="status-pill blue">Uploaded</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <label className="declaration">
        <input type="checkbox" checked={declared} onChange={(event) => setDeclared(event.target.checked)} />
        <span>I confirm these details are accurate and that I am authorised to submit them on behalf of this company.</span>
      </label>

      <StepActions
        note={declared ? 'Ready to submit.' : 'Confirm the declaration to submit.'}
        onDraft={onDraft}
      >
        <button type="button" className="button primary large" disabled={!declared} onClick={onSubmit}>
          Submit <ArrowRight size={15} />
        </button>
      </StepActions>
    </section>
  );
}
