// Smoke test for the Admin / Supervisor split, run against the built
// standalone HTML in jsdom. It exercises the flow edges the original diagram
// was missing — the request round-trip, the return loops, the role boundary —
// and the governance rules the request types exist to enforce.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(process.argv[2] || '/tmp/StyleSphere-Nexus.html', 'utf8');

let passed = 0;
const failures = [];
const check = (label, condition) => {
  if (condition) { passed += 1; } else { failures.push(label); }
};

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.test/',
});
const { window } = dom;
const { document } = window;

const tick = () => new Promise((r) => window.setTimeout(r, 60));
const text = () => document.body.textContent || '';
const buttons = () => [...document.querySelectorAll('button')];
const byText = (needle) => buttons().find((b) => (b.textContent || '').toLowerCase().includes(needle.toLowerCase()));
const exact = (n) => buttons().find((b) => (b.textContent || '').trim() === n);
// Scoped to the open dialog. A page-wide search for "Confirm" will happily
// match a closed-request row whose rationale contains the word "confirmed" —
// which is exactly the false positive this helper exists to prevent.
const dialogButton = (needle) => [...document.querySelectorAll('.modal-card footer button')]
  .find((b) => (b.textContent || '').toLowerCase().includes(needle.toLowerCase()));
const click = async (el) => {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
};
const setValue = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};

await tick();
await tick();

// --- boots, and lands in the admin workspace --------------------------------
check('app renders', document.querySelector('#root').children.length > 0);
check('lands in the admin workspace', text().includes('Admin workspace'));
check('admin nav shows the vendor queue', Boolean(byText('Vendor queue')));
check('three-way role switcher present',
  Boolean(exact('Admin')) && Boolean(exact('Supervisor')) && Boolean(exact('Vendor')));
check('admin has no supervisor request queue', !byText('Requests to you'));

// --- supervisor: oversight is the landing page ------------------------------
const supervisorTab = exact('Supervisor');
check('supervisor toggle exists', Boolean(supervisorTab));
if (supervisorTab) {
  await click(supervisorTab);
  check('supervisor workspace label shows', text().includes('Supervisor workspace'));
  check('supervisor lands on oversight', text().includes('Oversight'));
  check('KPIs live inside oversight', text().includes('AI-assist rate'));
  check('oversight leads with what is waiting', text().includes('Waiting on you'));
  check('oversight surfaces exceptions as standing exposure', text().includes('Live exceptions'));
  check('requests nav appears for supervisor', Boolean(byText('Requests')));
  check('supervisor has no document collection page', !byText('Document collection'));
}

// --- the requests queue carries every type, with its evidence ---------------
const requestsNav = byText('Requests');
if (requestsNav) {
  await click(requestsNav);
  // The seeded queue (4) is above DENSITY_THRESHOLD (3), so the page opens
  // compact. These assertions are about what each request type carries and
  // offers, which lives in the expanded card — so ask for full cards first.
  const fullCards = byText('Full cards');
  if (fullCards) await click(fullCards);
  const cards = [...document.querySelectorAll('.request-card')];
  check('seeded requests render', cards.length >= 4);

  // Each type must be present AND must carry the evidence its decision needs.
  check('risk acceptance request present', text().includes('Risk acceptance'));
  check('risk acceptance names the control being waived', text().includes('Control being waived'));
  check('risk acceptance names a compensating control', text().includes('Compensating control'));

  check('authority request present', text().includes('Above approval authority'));
  check('authority request states the delegated limit', text().includes('Your delegated limit'));
  check('authority request states four-eyes', text().includes('Four-eyes'));

  check('monitoring alert present', text().includes('Monitoring alert'));
  check('monitoring alert states live exposure', text().includes('Live exposure'));

  check('policy change present', text().includes('Agent policy change'));
  check('policy change shows a before/after', text().includes('Current') && text().includes('Proposed'));

  // SLA breach must be visible, not merely stored.
  check('a breached request is called out', text().includes('past its'));

  // Outcomes are type-specific: a monitoring alert cannot be "handed back",
  // a policy change cannot "suspend the vendor".
  check('risk acceptance offers grant/refuse', Boolean(byText('Grant the exception')) && Boolean(byText('Refuse the exception')));
  check('monitoring alert offers suspend', Boolean(byText('Suspend the vendor')));
  check('policy change offers approve', Boolean(byText('Approve the change')));

  // --- granting an exception must be time-boxed -----------------------------
  const grant = byText('Grant the exception');
  if (grant) {
    await click(grant);
    const expiryInput = document.querySelector('.modal-card input[type="date"]');
    const noteBox = document.querySelector('.modal-card textarea');
    check('granting asks for an expiry date', Boolean(expiryInput));
    check('granting asks for a rationale', Boolean(noteBox));

    // The reviewer's proposed date is pre-filled, so the supervisor confirms or
    // changes it rather than retyping — but clearing it must block the grant.
    check('the reviewer’s proposed expiry is pre-filled', Boolean(expiryInput?.value));
    if (noteBox && expiryInput) {
      setValue(noteBox, 'Re-audit is booked and confirmed in writing.');
      setValue(expiryInput, '');
      await tick();
      // The whole point of the type: no expiry, no exception.
      check('an exception cannot be granted without an expiry',
        dialogButton('Confirm')?.disabled === true);
    }
    if (expiryInput) {
      setValue(expiryInput, '2026-09-24');
      await tick();
      check('with an expiry it can be granted', dialogButton('Confirm')?.disabled === false);
      const confirm = dialogButton('Confirm');
      if (confirm) {
        await click(confirm);
        check('exception recorded', !document.querySelector('.modal-card'));
        check('the granted exception appears on the supervisor’s book',
          text().includes('risk acceptance') && text().includes('left'));
      }
    }
  }
}

// --- admin raises a risk acceptance from a blocking finding -----------------
const adminTab = exact('Admin');
if (adminTab) {
  await click(adminTab);
  const queue = byText('Vendor queue');
  if (queue) {
    await click(queue);
    // Deliberately a vendor with NO seeded request in flight — Pearl River has
    // a blocking duplicate-applicant finding, so it should offer the
    // risk-acceptance route rather than "already with your supervisor".
    const rows = [...document.querySelectorAll('.worklist-rows button, .vendor-table.table-row')];
    const fresh = rows.find((r) => (r.textContent || '').includes('Pearl River')) || rows[0];
    if (fresh) {
      await click(fresh);
      const ask = byText('Request risk acceptance');
      const sendUp = byText('Send for approval');
      // One or the other must be offered: a blocking finding gives the
      // acceptance route, a clean pack over the ceiling gives the authority one.
      check('the workspace offers a route up', Boolean(ask) || Boolean(sendUp));

      if (ask) {
        await click(ask);
        const boxes = [...document.querySelectorAll('.modal-card textarea')];
        const date = document.querySelector('.modal-card input[type="date"]');
        check('acceptance request asks why the control cannot be met', boxes.length >= 1);
        check('acceptance request asks what mitigates it', boxes.length >= 2);
        check('acceptance request asks for an end date', Boolean(date));
        if (boxes.length >= 2 && date) {
          setValue(boxes[0], 'Certificate lapsed; re-audit booked for 18 August.');
          setValue(boxes[1], 'Pre-shipment inspection on every lot.');
          setValue(date, '2026-09-30');
          await tick();
          const send = dialogButton('Send to');
          check('the request can be sent once complete', Boolean(send) && send.disabled === false);
          if (send) {
            await click(send);
            // A pending exception is a notice, not a takeover: the reviewer is
            // told it is with the supervisor, but the verdict band stays live
            // so they can keep working the rest of the evidence pack.
            check('the workspace says the request is with the supervisor',
              Boolean(document.querySelector('.rw-notice')) && text().includes('Arun Mehta'));
            check('the reviewer can still work the rest of the pack',
              Boolean(document.querySelector('.rw-verdict-actions')));
            check('the same request cannot be raised twice',
              !byText('Request risk acceptance'));
          }
        }
      }
    }
  }
}

// --- and the supervisor can hand it back, which returns it to the admin -----
const supTab2 = exact('Supervisor');
if (supTab2) {
  await click(supTab2);
  const nav = byText('Requests');
  if (nav) {
    await click(nav);
    const expand = byText('Full cards');
    if (expand) await click(expand);
    // Scope to an open request card — "Hand back" must not be picked up from
    // the closed list or the exception book.
    const handBack = [...document.querySelectorAll('.request-card button')]
      .find((b) => (b.textContent || '').includes('Hand back'));
    check('supervisor can hand a request back', Boolean(handBack));
    if (handBack) {
      await click(handBack);
      const box = document.querySelector('.modal-card textarea');
      check('handing back asks what the reviewer must do', Boolean(box));
      if (box) {
        setValue(box, 'Get the notarised entity certificate first.');
        await tick();
        const confirm = dialogButton('Confirm');
        if (confirm) {
          await click(confirm);
          check('handing back returns to the admin workspace', text().includes('Admin workspace'));
          check('the instruction is shown to the admin',
            text().includes('Get the notarised entity certificate first'));
          check('the instruction names who sent it back', text().includes('Arun Mehta'));
        }
      }
    }
  }
}

console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log('all assertions passed');
}
