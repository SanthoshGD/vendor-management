import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(process.argv[2] || '/tmp/StyleSphere-Nexus.html', 'utf8');
const SAMPLES = process.argv[3] || '/tmp/samples';

let passed = 0;
const failures = [];
const check = (label, condition) => { if (condition) passed += 1; else failures.push(label); };

const sample = (needle) => {
  const name = readdirSync(SAMPLES).find((f) => f.includes(needle));
  if (!name) throw new Error(`no sample matching ${needle}`);
  return { name, bytes: readFileSync(`${SAMPLES}/${name}`) };
};

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true,
  url: 'https://example.test/',
});
const { window } = dom;
const { document } = window;
const tick = (ms = 60) => new Promise((r) => window.setTimeout(r, ms));
const buttons = () => [...document.querySelectorAll('button')];
const byText = (n) => buttons().find((b) => (b.textContent || '').toLowerCase().includes(n.toLowerCase()));
const click = async (el) => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await tick(); };
const setValue = (el, v) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};

await tick(); await tick();

await click(byText('Invite vendor'));
const fields = [...document.querySelectorAll('.modal-card input')];
setValue(fields[0], 'Kalyani Silks Private Limited');
setValue(fields[1], 'ravi@kalyanisilks.in');
await tick();
await click([...document.querySelectorAll('.modal-card footer button')].find((b) => /send|invite|create/i.test(b.textContent)));
await tick();

const linkInput = document.querySelector('.modal-card input[readonly]')
  || [...document.querySelectorAll('.modal-card input')].find((i) => (i.value || '').includes('#/invite/'));
check('an invite produces a shareable link', Boolean(linkInput && linkInput.value.includes('#/invite/')));

const inviteUrl = linkInput ? linkInput.value : null;

const vendorDom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true,
  url: inviteUrl ? inviteUrl.replace('https://example.test/', 'https://supplier.test/') : 'https://supplier.test/',
});
const vw = vendorDom.window;
const vdoc = vw.document;
const vtick = (ms = 60) => new Promise((r) => vw.setTimeout(r, ms));
const vtext = () => vdoc.body.textContent || '';
const vButtons = () => [...vdoc.querySelectorAll('button')];
const vByText = (n) => vButtons().find((b) => (b.textContent || '').toLowerCase().includes(n.toLowerCase()));
const vClick = async (el) => { el.dispatchEvent(new vw.MouseEvent('click', { bubbles: true })); await vtick(); };
const vSet = (el, v) => {
  const proto = el.tagName === 'SELECT' ? vw.HTMLSelectElement
    : el.tagName === 'TEXTAREA' ? vw.HTMLTextAreaElement : vw.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new vw.Event('input', { bubbles: true }));
  el.dispatchEvent(new vw.Event('change', { bubbles: true }));
};

await vtick(); await vtick(); await vtick();

check('the link opens in the invited company name', vtext().includes('Kalyani Silks'));
check('no sidebar navigation is offered before submission', vdoc.querySelectorAll('.sidebar-link').length === 0);
check('no global search is offered before submission', !vdoc.querySelector('.global-search'));
check('no notification bell is offered before submission', !vdoc.querySelector('.topbar-button.notification'));
check('the supplier gets the dedicated onboarding shell', Boolean(vdoc.querySelector('.onboarding-shell')));
check('the shell states which application this is', vtext().includes('Application VEN-'));

// --- Gate 1: the invitation email ----------------------------------------
check('a fresh visitor lands on the invitation email', vtext().includes("You've been invited to join StyleSphere Vendor Nexus"));
check('the email names the inviting company', vtext().includes('Kalyani Silks'));
check('the email states how many documents are required', vtext().includes('5 required compliance documents'));
check('the email frame is themed as an inbox, not the product', Boolean(vdoc.querySelector('.onboarding-shell.is-invite')));
check('no stepper is shown before the wizard starts', !vdoc.querySelector('.wizard-stepper'));
const acceptBtn = vByText('Accept invitation');
check('the email offers an accept action', Boolean(acceptBtn));
await vClick(acceptBtn);

// --- Gate 2: create the account ------------------------------------------
check('accepting the invitation opens account creation', vtext().includes('Create your account'));
check('no back arrow is shown on the account-creation gate', !vdoc.querySelector('.wizard-back'));
check('the account gate is a single centred card', Boolean(vdoc.querySelector('.auth-card')));

const authForm = vdoc.querySelector('.auth-card');
vSet(authForm.querySelectorAll('input')[0], 'Ravi Menon');
vSet(authForm.querySelectorAll('input[type="email"]')[0], 'ravi@kalyanisilks.in');
vSet(authForm.querySelectorAll('input[type="password"]')[0], 'a-strong-password');
authForm.dispatchEvent(new vw.Event('submit', { bubbles: true, cancelable: true }));
await vtick();
check('creating an account reveals the welcome/method-choice step', vtext().includes('How would you like to fill in your details?'));
check('the AI-assisted path is offered and marked recommended', vtext().includes('AI-assisted') && vtext().includes('Recommended'));
check('the manual path is offered', vtext().includes('Fill in manually'));

// --- Phase 4 step 1: choose AI-assisted -----------------------------------
const aiCard = [...vdoc.querySelectorAll('.method-card')].find((b) => /ai-assisted/i.test(b.textContent));
check('the AI-assisted method card is clickable', Boolean(aiCard));
await vClick(aiCard);
check('choosing a method advances straight to the documents step', vtext().toLowerCase().includes('upload required documents'));
check('a back arrow now sits beside the heading', Boolean(vdoc.querySelector('.step-head .wizard-back')));
check('the stepper now lives in the shell header', Boolean(vdoc.querySelector('.onboarding-header .wizard-stepper')));
check('the stepper marks the current step', Boolean(vdoc.querySelector('.wizard-stepper-step.current')));
check('no navigation controls remain in the shell header', !vdoc.querySelector('.onboarding-header .icon-button') && !vdoc.querySelector('.onboarding-header .button'));

// --- Phase 3: header controls ---------------------------------------------
const draftButton = vByText('Save draft');
check('"Save draft" sits in the step actions row', Boolean(draftButton) && Boolean(vdoc.querySelector('.step-actions .wizard-draft')));
check('Save draft and the forward button are grouped together on the right', Boolean(vdoc.querySelector('.step-actions-buttons .wizard-draft')) && Boolean(vdoc.querySelector('.step-actions-buttons .button.primary')));
await vClick(draftButton);
check('clicking save-as-draft raises a confirmation toast', vtext().includes('Draft saved'));

// Back arrow returns to the welcome/method step, then forward again.
const backArrow = vdoc.querySelector('.wizard-back');
await vClick(backArrow);
check('the back arrow returns to the welcome step', vtext().includes('How would you like to fill in your details?'));
await vClick([...vdoc.querySelectorAll('.method-card')].find((b) => /ai-assisted/i.test(b.textContent)));
check('re-choosing AI-assisted returns to the documents step', vtext().toLowerCase().includes('upload required documents'));

// --- Phase 4 step 2: documents ---------------------------------------------
const fileInputs = () => [...vdoc.querySelectorAll('.doc-row input[type="file"]')];
check('every required document has an upload control', fileInputs().length === 5);

const vUpload = async (input, file, waitMs = 500) => {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new vw.Event('change', { bubbles: true }));
  await vtick(waitMs);
};

const failingBank = sample('FAILS');
await vUpload(fileInputs()[1], new vw.File([new Uint8Array(failingBank.bytes)], failingBank.name, { type: 'application/pdf' }));

const suppliedCount = () => (vdoc.querySelector('.step-progress strong')?.textContent || '').replace(/\s+/g, ' ').trim();
check('the failing sample is accepted into the draft before submission', suppliedCount().startsWith('1/5'));
check('the vendor does not see a rejection before submission', !vtext().includes('Ask your bank to reissue'));

// Generic checklist order: 0 tax, 1 bank (already uploaded above), 2 COI,
// 3 company registration, 4 quality/service declaration. Sample PDFs are
// named for the leather-textiles checklist, but inspectUpload() only looks
// for the SSX-CHECK marker, not a title match, so any PASS sample works as
// a stand-in for the two slots without a purpose-made fixture.
const uploads = [
  [0, '01 Tax'],
  [2, '03 Certificate'],
  [3, '02 Import'],
  [4, '04 REACH'],
];
for (const [index, needle] of uploads) {
  const f = sample(needle);
  await vUpload(fileInputs()[index], new vw.File([new Uint8Array(f.bytes)], f.name, { type: 'application/pdf' }));
}

check('all five documents can be supplied before submission', suppliedCount().startsWith('5/5'));

// --- delete / re-upload ----------------------------------------------------
check('an uploaded file is labelled Uploaded, not Verified', vtext().includes('Uploaded') && !vdoc.querySelector('.doc-row .status-pill.green'));
check('every supplied document offers a delete control', vdoc.querySelectorAll('.wizard-doc-delete').length === 5);
const firstDelete = vdoc.querySelector('.wizard-doc-delete');
await vClick(firstDelete);
check('deleting a document returns it to Missing', suppliedCount().startsWith('4/5'));
check('a missing document offers no delete control', vdoc.querySelectorAll('.wizard-doc-delete').length === 4);
check('the forward action is blocked again after a delete', !vButtons().find((b) => b.textContent.trim().startsWith('Next') && !b.disabled));
const reAdd = sample('01 Tax');
await vUpload(fileInputs()[0], new vw.File([new Uint8Array(reAdd.bytes)], reAdd.name, { type: 'application/pdf' }));
check('the deleted slot accepts a fresh upload', suppliedCount().startsWith('5/5'));

// --- auto-attach strip -----------------------------------------------------
check('the auto-attach strip is exhausted once every slot is filled', vdoc.querySelector('.doc-autofill-button')?.disabled === true);
// Clear two slots, then let the strip refill them in one click.
await vClick(vdoc.querySelectorAll('.wizard-doc-delete')[0]);
await vClick(vdoc.querySelectorAll('.wizard-doc-delete')[0]);
check('deleting two documents leaves three supplied', suppliedCount().startsWith('3/5'));
const autoBtn = vdoc.querySelector('.doc-autofill-button');
check('the auto-attach strip reactivates when something is outstanding', autoBtn && !autoBtn.disabled);
check('the strip says how many it will attach', (autoBtn.textContent || '').includes('2'));
await vClick(autoBtn);
await vtick(200);
check('one click attaches every outstanding document', suppliedCount().startsWith('5/5'));

// The strip filled every slot with a passing sample, including the bank
// letter this run deliberately fails on. Put the failing one back so the
// post-submission rejection loop below still has something to reject.
await vUpload(fileInputs()[1], new vw.File([new Uint8Array(failingBank.bytes)], failingBank.name, { type: 'application/pdf' }));
check('the failing bank letter can be restored over a sample', suppliedCount().startsWith('5/5'));
const continueBtn = () => vButtons().find((b) => b.textContent.trim().startsWith('Next') && !b.disabled);
check('company details becomes reachable once the full pack is supplied', Boolean(continueBtn()));

// --- Phase 4 step 3: AI-prefilled company details --------------------------
if (continueBtn()) {
  await vClick(continueBtn());
  check('step 3 covers company details', vtext().toLowerCase().includes('company details'));
  check('the AI path reframes the step as verification', vtext().includes('Verify your company details'));
check('the AI copy asks the supplier to check the values', vtext().includes('Check each field against your records'));
check('no AI confidence percentage is shown', !/AI\s*[\u00b7·]\s*\d+%/.test(vtext()) && vdoc.querySelectorAll('.confidence-pill').length === 0);

  const legalNameInput = vdoc.querySelector('[name="legalName"]');
  check('the legal name field is pre-filled from the invite', Boolean(legalNameInput) && legalNameInput.value === 'Kalyani Silks Private Limited');
  // The per-field "AI" pill is gone on purpose: eleven identical badges on one
  // form marked nothing. Extracted fields now carry a rail on the control and
  // the heading carries one meter, so both are what we assert on.
  check('no per-field AI badge is rendered', vdoc.querySelectorAll('.wizard-ai-tag').length === 0);
  check('extracted fields are marked on the control itself', vdoc.querySelectorAll('.field.is-ai').length > 0);
  check('every extracted field carries a gutter marker', vdoc.querySelectorAll('.field.is-ai .field-mark').length === vdoc.querySelectorAll('.field.is-ai').length);
  check('the heading states the marker once, as a count', Boolean(vdoc.querySelector('.review-meter')) && /\d+ of \d+ checked/.test(vtext()));
  check('nothing is pre-checked for the supplier', vdoc.querySelectorAll('.field.is-ai.is-checked').length === 0);

  // Touching a field is what confirms it  -  the panel should visibly drain of
  // violet as the supplier works down the column.
  // React 19 implements onBlur on the bubbling `focusout`, not on `blur`, so
  // that is what a real browser hands it and what the test must dispatch.
  const firstAiInput = vdoc.querySelector('.field.is-ai input');
  if (firstAiInput) {
    firstAiInput.dispatchEvent(new vw.FocusEvent('focusout', { bubbles: true }));
    await vtick();
    check('touching an extracted field confirms it', vdoc.querySelectorAll('.field.is-ai.is-checked').length === 1);
    check('the meter counts the confirmation', /1 of \d+ checked/.test(vtext()));
  }
const categorySelect = vdoc.querySelector('[name="category"]');
const categories = [...(categorySelect?.options || [])].map((o) => o.value);
check('categories are individual fashion products', categories.includes('Handbags') && categories.includes('Shoes') && categories.includes('Dresses'));
check('no grouped "&" category labels remain', !categories.some((c) => c.includes(' & ')));
  check('the contact email field is pre-filled', Boolean(vdoc.querySelector('[name="contactEmail"]')?.value));

  const form = vdoc.querySelector('form.step-panel');
  if (form) { form.dispatchEvent(new vw.Event('submit', { bubbles: true, cancelable: true })); await vtick(); }
  check('saving company details advances to review', vtext().toLowerCase().includes('review and submit'));

  check('review step explains that review starts after submission', vtext().includes('requested changes will appear here after review'));
  check('the failing bank letter is queued rather than rejected on the form', Boolean(vdoc.querySelector('.review-docs .status-pill')) && !vtext().includes('Ask your bank to reissue'));

  const declaration = vdoc.querySelector('.declaration input[type="checkbox"]');
  check('submission requires an explicit declaration', Boolean(declaration));
  if (declaration) {
    declaration.dispatchEvent(new vw.MouseEvent('click', { bubbles: true }));
    await vtick();
  }
  const submit = vButtons().find((b) => b.textContent.trim().startsWith('Submit') && !b.disabled);
  check('the review step offers Submit once declared', Boolean(submit));
  if (submit) {
    await vClick(submit);
    await vtick(200);
    check('submitting unlocks the vendor portal', vdoc.querySelectorAll('.sidebar-link').length > 0);
    check('the gated shell is gone after submission', !vdoc.querySelector('.onboarding-shell'));
    check('the supplier lands in their own workspace', vtext().includes('Vendor portal'));
    check('the supplier sees an under-review state immediately after submission', vtext().includes('Review in progress') || vtext().includes('being checked'));

    await vtick(1900);
    check('the failing sample is rejected only after submission', vtext().includes('Ask your bank to reissue'));
    check('the portal asks for a corrected file after review', Boolean(vByText('Upload requested file')) || Boolean(vByText('Upload file')));
  }
}

// --- resume guard ----------------------------------------------------------
// The reported bug, twice over: a persisted record whose `onboardingStep`
// points past screens the supplier never completed, so the method choice and
// the documents step both look skipped. The wizard must re-derive where you
// are allowed to be from the record itself, not trust the stored integer.
// NOTE: assert on `#root`, never on `document.body.textContent`. The standalone
// build inlines the whole bundle in a <script> in the body, so body text
// contains every string literal in the source  -  an earlier version of this
// block "passed" purely by matching the JSX it was meant to be testing.
const rootText = (w) => w.document.getElementById('root')?.textContent || '';

// The invite URL puts us in the supplier's context for the vendor it names,
// which is the only way to reach the wizard; the payload is seeded first so the
// app boots from an already-persisted record, exactly as a returning tester's
// browser does.
const stateKey = Object.keys(window.localStorage).find((k) => k.startsWith('stylesphere-nexus-state'));
const resumeAt = async (mutate) => {
  if (!stateKey || !inviteUrl) return null;
  const payload = JSON.parse(window.localStorage.getItem(stateKey));
  const target = payload.vendors.find((v) => v.name === 'Kalyani Silks Private Limited');
  if (!target) return null;
  mutate(target);
  const resumed = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: inviteUrl.replace('https://example.test/', 'https://supplier.test/'),
    beforeParse(w) { w.localStorage.setItem(stateKey, JSON.stringify(payload)); },
  });
  const rw = resumed.window;
  const rdoc = rw.document;
  const rtick = (ms = 60) => new Promise((r) => rw.setTimeout(r, ms));
  await rtick(200);

  // The two gates are session state, not persisted, so every reload starts at
  // the invitation email regardless of how far the record has got. Walk them,
  // then look at which wizard step the resumed record actually lands on.
  const rBtn = (n) => [...rdoc.querySelectorAll('button')]
    .find((b) => (b.textContent || '').toLowerCase().includes(n.toLowerCase()));
  const accept = rBtn('Accept invitation');
  if (accept) { accept.dispatchEvent(new rw.MouseEvent('click', { bubbles: true })); await rtick(); }
  const authForm2 = rdoc.querySelector('.auth-card');
  if (authForm2) {
    const set = (el, v) => {
      const proto = el.type === 'password' || el.type === 'email' || el.tagName === 'INPUT'
        ? rw.HTMLInputElement : rw.HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new rw.Event('input', { bubbles: true }));
    };
    set(authForm2.querySelectorAll('input')[0], 'Ravi Menon');
    set(authForm2.querySelector('input[type="email"]'), 'ravi@kalyanisilks.in');
    set(authForm2.querySelector('input[type="password"]'), 'a-strong-password');
    authForm2.dispatchEvent(new rw.Event('submit', { bubbles: true, cancelable: true }));
    await rtick(120);
  }
  return { text: rootText(rw), doc: rdoc };
};

// Stored at "company details" with nothing chosen and nothing uploaded.
const stranded = await resumeAt((v) => {
  v.onboardingStep = 2;
  v.onboardingMethod = null;
  v.profile = null;
  v.documents = v.documents.map((d) => ({ ...d, status: 'Missing', fileName: null }));
});
if (stranded !== null) {
  check('a resumed record reaches the supplier wizard at all',
    Boolean(stranded.doc.querySelector('.onboarding-shell')));
  check('a record stored past the method choice is returned to it',
    stranded.text.includes('How would you like to fill in your details?'));
  check('the stranded record is not dropped on company details',
    !stranded.text.includes('Verify your company details') && !stranded.text.includes('Enter company details'));
}

// Method chosen, but the evidence pack is incomplete: documents, not details.
const halfway = await resumeAt((v) => {
  v.onboardingStep = 3;
  v.onboardingMethod = 'ai';
  v.documents = v.documents.map((d, i) => (i === 0 ? d : { ...d, status: 'Missing', fileName: null }));
});
// NEW CONTRACT: finishing the account form begins the application from the top.
// A persisted `onboardingStep` used to drop a returning supplier onto Documents
// (or Details) with a full pack and no method choice on this run. The gates
// replay on every load, so sign-in is the start-of-run boundary, and nothing
// real is lost - "Save draft" is a toast, not persistence.
if (halfway !== null) {
  check('a record stored mid-flow still begins at the welcome step',
    halfway.text.includes('How would you like to fill in your details?'));
  check('an incomplete pack cannot resume on review',
    !halfway.text.includes('Review and submit'));
  check('a resumed record is not dropped onto documents',
    !halfway.text.toLowerCase().includes('upload required documents'));
}

console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log('all onboarding assertions passed');
}
