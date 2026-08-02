// The supervisor queue under load.
//
// The point of this suite is that the page has to behave differently when it
// is full than when it is empty, and that is exactly the property a fixed
// fixture cannot demonstrate. So it drives the generator, then asserts the
// things that only matter at volume: automatic density, grouping, expansion,
// bulk selection, and the governance rules that must survive bulk.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(process.argv[2] || '/tmp/StyleSphere-Nexus.html', 'utf8');

let passed = 0;
const failures = [];
const check = (label, condition) => { if (condition) passed += 1; else failures.push(label); };

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/' });
const { window } = dom;
const { document } = window;
const tick = () => new Promise((r) => window.setTimeout(r, 50));
const text = () => document.body.textContent || '';
const buttons = () => [...document.querySelectorAll('button')];
const byText = (n) => buttons().find((b) => (b.textContent || '').toLowerCase().includes(n.toLowerCase()));
const exact = (n) => buttons().find((b) => (b.textContent || '').trim() === n);
const chip = (n) => [...document.querySelectorAll('.queue-controls .chip')].find((b) => (b.textContent || '').trim() === n);
const click = async (el) => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await tick(); };
const setValue = (el, v) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const cards = () => document.querySelectorAll('.request-card').length;
const rows = () => document.querySelectorAll('.request-row').length;

await tick(); await tick();

// --- get to the supervisor's queue ------------------------------------------
await click(exact('Supervisor'));
await click(byText('Requests'));
check('queue opens', cards() + rows() > 0);
// DENSITY_THRESHOLD is 3, and the seeded queue carries four requests, so the
// page is already compact on arrival - that is the auto-density rule doing its
// job, not a regression. What has to hold is that the density control still
// works in both directions.
check('auto-density collapses the seeded queue', rows() > 0 && cards() === 0);
await click(byText('Full cards'));
check('"Full cards" restores full cards', cards() > 0 && rows() === 0);
await click(byText('Compact'));
check('"Compact" collapses them again', rows() > 0 && cards() === 0);

// --- the generator produces real, varied work -------------------------------
const generate = byText('Simulate an incoming request');
check('the queue can be loaded on demand', Boolean(generate));

const before = cards() + rows();
if (generate) {
  await click(generate);
  check('generating adds a request', cards() + rows() === before + 1);

  // Push it well past the density threshold.
  for (let i = 0; i < 12; i += 1) await click(byText('Simulate an incoming request'));
}

const total = cards() + rows();
check('the queue holds a realistic backlog', total >= 14);

// --- density flips automatically -------------------------------------------
check('at volume the queue collapses to rows', rows() > 0);
check('it does not leave a wall of open cards', cards() === 0);

// Generated work is back-dated, so a real backlog contains breaches.
check('a loaded queue contains breached work', text().includes('over') || text().includes('past its'));

// --- expanding one row shows its evidence without expanding the rest --------
const firstRow = document.querySelector('.request-row .request-row-main');
if (firstRow) {
  await click(firstRow);
  check('expanding a row reveals its full evidence', cards() === 1);
  check('the rest of the queue stays compact', rows() === total - 1);
  await click(document.querySelector('.request-card .icon-button'));
  check('it collapses again', cards() === 0);
}

// --- grouping is a lens over the same set ----------------------------------
const byType = chip('Type');
if (byType) {
  await click(byType);
  const heads = [...document.querySelectorAll('.queue-group-head')];
  check('grouping by type produces headed groups', heads.length >= 2);
  check('grouping does not drop any request', rows() + cards() === total);
}
const byVendor = chip('Vendor');
if (byVendor) {
  await click(byVendor);
  check('grouping by vendor produces headed groups',
    document.querySelectorAll('.queue-group-head').length >= 2);
  check('grouping by vendor keeps every request', rows() + cards() === total);
}
const byDeadline = chip('Deadline');
if (byDeadline) {
  await click(byDeadline);
  check('returning to deadline order removes group heads',
    document.querySelectorAll('.queue-group-head').length === 0);
}

// --- density can be overridden ---------------------------------------------
const full = chip('Full cards');
if (full) {
  await click(full);
  check('the supervisor can force full cards', cards() === total && rows() === 0);
  await click(chip('Compact'));
  check('and force compact again', rows() === total && cards() === 0);
}

// --- bulk selection ---------------------------------------------------------
const selectAll = [...document.querySelectorAll('.queue-controls .chip')]
  .find((b) => (b.textContent || '').includes('Select all'));
if (selectAll) {
  await click(selectAll);
  check('select-all selects the whole visible queue',
    document.querySelectorAll('.request-row input:checked, .request-card input:checked').length === total);
  check('a bulk action bar appears', Boolean(document.querySelector('.bulk-bar')));

  // With every type selected there is no outcome common to all of them, so the
  // bar must offer nothing rather than something dangerous.
  const bar = document.querySelector('.bulk-bar');
  const barActions = bar ? [...bar.querySelectorAll('.button')].filter((b) => !/cancel/i.test(b.textContent)) : [];
  check('a mixed selection offers no shared outcome', barActions.length === 0);
  check('and explains why', (bar?.textContent || '').includes('share no common outcome'));

  await click(byText('Cancel'));
  check('selection can be cleared', !document.querySelector('.bulk-bar'));
}

// --- narrow to one type, then bulk-act -------------------------------------
// Monitoring alerts share REASSESS / ACCEPT / SUSPEND, so a same-type
// selection must offer exactly those.
const typeChip = [...document.querySelectorAll('.filter-strip button')]
  .find((b) => (b.textContent || '').includes('Monitoring alert'));
if (typeChip) {
  await click(typeChip);
  const narrowed = cards() + rows();
  const sel = [...document.querySelectorAll('.queue-controls .chip')].find((b) => (b.textContent || '').includes('Select all'));
  if (sel && narrowed > 1) {
    await click(sel);
    const bar = document.querySelector('.bulk-bar');
    const labels = bar ? [...bar.querySelectorAll('.button')].map((b) => b.textContent.trim()) : [];
    check('a same-type selection offers that type’s outcomes',
      labels.some((l) => /Re-run diligence/i.test(l)));
    // The governance rule: bulk must never offer to grant an exception,
    // because each one needs its own expiry and compensating control.
    check('bulk never offers to grant an exception',
      !labels.some((l) => /Grant the exception/i.test(l)));

    const act = bar && [...bar.querySelectorAll('.button')].find((b) => /Accept, keep active/i.test(b.textContent));
    if (act) {
      await click(act);
      const manifest = document.querySelectorAll('.bulk-manifest li').length;
      check('the bulk dialog lists exactly what will be decided', manifest === narrowed);
      const box = document.querySelector('.modal-card textarea');
      check('bulk still requires one written rationale', Boolean(box));
      const confirmBtn = () => [...document.querySelectorAll('.modal-card footer button')]
        .find((b) => /Accept, keep active/i.test(b.textContent));
      check('bulk cannot be confirmed without it', confirmBtn()?.disabled === true);
      if (box) {
        setValue(box, 'Reviewed together; all three are partial-name matches on the same watchlist.');
        await tick();
        check('with a rationale it can be confirmed', confirmBtn()?.disabled === false);
        await click(confirmBtn());
        check('the bulk action clears those requests from the queue',
          cards() + rows() === 0 || cards() + rows() < narrowed);
      }
    }
  }
}

// --- the six notification groups -------------------------------------------
const bell = document.querySelector('.topbar-button.notification');
if (bell) {
  await click(bell);
  const groupHeads = [...document.querySelectorAll('.pop-group')].map((e) => e.textContent.trim());
  check('notifications are grouped', groupHeads.length >= 3);
  check('overdue is split from pending', groupHeads.includes('Overdue'));
  check('“waiting on you” still exists', groupHeads.includes('Waiting on you'));
  check('the bell scrolls rather than overflowing',
    window.getComputedStyle(document.querySelector('.notification-pop')).overflowY === 'auto');
}

console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log('all volume assertions passed');
}
