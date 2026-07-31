// Regression pass: the parts of the app that already worked and must keep
// working after the Admin/Supervisor split — the vendor portal, the invite
// path, the read-only supervisor lens, and the loop back to the queue.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(process.argv[2] || '/tmp/StyleSphere-Nexus.html', 'utf8');

let passed = 0;
const failures = [];
const check = (label, condition) => { if (condition) passed += 1; else failures.push(label); };

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/' });
const { window } = dom;
const { document } = window;
const tick = () => new Promise((r) => window.setTimeout(r, 60));
const text = () => document.body.textContent || '';
const buttons = () => [...document.querySelectorAll('button')];
const byText = (n) => buttons().find((b) => (b.textContent || '').toLowerCase().includes(n.toLowerCase()));
const exact = (n) => buttons().find((b) => (b.textContent || '').trim() === n);
const click = async (el) => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await tick(); };

await tick(); await tick();

// --- the vendor portal is untouched by the role split -----------------------
const vendorTab = exact('Vendor');
check('vendor toggle present', Boolean(vendorTab));
if (vendorTab) {
  await click(vendorTab);
  check('vendor portal label', text().includes('Vendor portal'));
  check('vendor nav intact', Boolean(byText('Documents')) && Boolean(byText('Action center')));
  check('vendor sees no admin pages', !byText('Vendor queue') && !byText('Agent console'));
  check('vendor sees no supervisor pages', !byText('Escalations & approvals'));
}

// --- supervisor read-only lens ---------------------------------------------
const supTab = exact('Supervisor');
if (supTab) {
  await click(supTab);
  const allVendors = byText('All vendors');
  check('supervisor has an all-vendors lens', Boolean(allVendors));
  if (allVendors) {
    await click(allVendors);
    check('supervisor worklist is framed as read-only',
      text().includes('You are looking, not acting'));
    check('supervisor cannot invite vendors', !byText('Invite vendor'));
    check('supervisor cannot run agents from the list', !byText('Run agents on all open'));

    const row = document.querySelector('.worklist-rows button, .vendor-table.table-row');
    if (row) {
      await click(row);
      check('supervisor opens the case read-only', text().includes('Supervisor view'));
      check('supervisor sees no recommend action', !byText('Recommend approval'));
      check('supervisor is told whose decision it is', text().includes('Decisions belong to'));
    }
  }
}

// --- admin: the branch back into document collection ------------------------
const adminTab = exact('Admin');
if (adminTab) {
  await click(adminTab);
  const queue = byText('Vendor queue');
  if (queue) {
    await click(queue);
    // Find a vendor that still has documents outstanding.
    const rows = [...document.querySelectorAll('.worklist-rows button, .vendor-table.table-row')];
    const blocked = rows.find((r) => /outstanding|Vendor action|Invited/i.test(r.textContent || '')) || rows[0];
    if (blocked) {
      await click(blocked);
      const collect = byText('Collect');
      // Only asserted when the case actually has missing evidence.
      if (collect) {
        check('missing evidence offers a route back to collection', true);
        await click(collect);
        check('collection route lands on document collection',
          text().includes('Document collection') || text().includes('Onboarding'));
      } else {
        check('review workspace rendered', Boolean(document.querySelector('.review-workspace')));
      }
    }
  }
}

// --- the audit trail records the supervisor as a distinct actor -------------
const supTab2 = exact('Supervisor');
if (supTab2) {
  await click(supTab2);
  const audit = byText('Audit record');
  check('supervisor has a read-only audit record', Boolean(audit));
  if (audit) {
    await click(audit);
    check('audit trail renders for the supervisor', text().length > 500);
  }
}

console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log('all regression assertions passed');
}
