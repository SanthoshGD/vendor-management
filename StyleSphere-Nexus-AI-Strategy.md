# StyleSphere Nexus - What to Steal from Zip, and How to Build It

Research basis: zip.com homepage, `/capabilities/superagents`, `/capabilities/intake-management` (fetched 27 Jul 2026), read against your Product Brief and the current live tree (`RedesignedApp.jsx` + `AppContext.jsx` + `ReviewWorkspace` / `AuditTrail` / `DocumentCanvas` / `ExtractedForm`).

---

## 1. What Zip is actually doing (and why it's relevant to you)

Zip is not a procurement app. It is an **orchestration layer** that sits in front of procurement, and it sells three things:

| Zip's move | What it means | Your equivalent |
|---|---|---|
| **Intake as the single front door** | One entry point, adaptive workflow that branches on the requester's answers | Vendor Registration → Document Upload, but branching on category/country/risk |
| **Superagents = Skills + Actions + Context** | Agents aren't chat. They're configured units: instructions (Skills), permitted system calls (Actions), and policy/playbooks (Context) | Your IEC/GST/SCoC policy pack *is* the Context layer. You already have it - you just haven't named it |
| **Governance as the product** | Permission-aware agents, granular action controls, human-in-the-loop gates, deterministic execution for critical writes, full audit trail with reasoning | This is literally your Sealed Acceptance Criteria #2 and #3 |

**The key sentence from Zip's own FAQ:** copilots answer questions; agents *plan, coordinate, and execute multi-step work across systems and teams*. Your current AI is a copilot - it extracts and flags inside one screen. Everything below is about moving it to the second category **without breaking your 3-screen ceiling or your "AI never approves" rule**.

---

## 2. The reframe (the single most important idea in this doc)

Your brief contains the real problem in one quote:

> *"I spend more time finding missing documents than actually reviewing suppliers."*

Right now StyleSphere Nexus is a **review tool**. Elena opens a vendor, reads AI extractions, accepts/corrects, recommends. That is genuinely good - but it optimises the 20% of the 7 days that is actual reviewing. The other 80% is **waiting on and chasing vendors in Shenzhen, Dhaka and Istanbul across email and WhatsApp**.

**7 days → 2 days is not won in the Review Workspace. It's won in the gap between "document missing" and "document received."**

So the product should become a **completion engine**: something whose primary job is to drive an incomplete vendor file to a complete one, autonomously, in the vendor's language and channel - and *then* present a finished file to a human for judgment.

That reframe alone reorders your entire roadmap.

---

## 3. The agent architecture - steal Skills / Actions / Context verbatim

Don't build "an AI assistant." Build a small set of named agents, each defined by three configurable layers. This is the single most portable idea from Zip and it's what makes agents auditable instead of magical.

```
Agent
├── Skills   - task instructions ("how to redline a Supplier Code of Conduct")
├── Actions  - the finite list of things it may DO (send email, flag doc,
│              write draft field, request re-upload, escalate). Never "approve."
└── Context  - StyleSphere policy pack: IEC rules, GST format rules,
               Procurement Policy, SCoC, country risk matrix, past decisions
```

### The five agents to build

**1. Intake Agent** - *front door, replaces the form*
- Reads the vendor's uploaded bundle **before** asking anything, extracts what it can, and only asks for what's genuinely missing. Zip calls this "AI intake automation: extract order form data and pre-fill request details."
- Branches the required-document checklist dynamically by category × country × contract value. A ₹2L accessories vendor in Turkey should not face the same 12-document wall as a ₹5Cr apparel manufacturer in Bangladesh.
- **Duplicate/preferred-vendor detection on entry** (Zip's "preferred vendor routing"): fuzzy-match on name, GST/IEC, address, bank account, director names. Catches the same factory re-applying under a new trading name - a real compliance risk in your sourcing markets, and it's pure margin: 12,000 applications/year with even 6% duplicates is 700 reviews you never have to do.

**2. Chaser Agent** - *the 7→2 day agent. Build this one first after Intake.*
- Owns every open document request end-to-end. Sends the first request, follows up on a schedule, escalates to the vendor's manager contact, and stops the moment the doc lands.
- **Works where the vendor already is**: email + WhatsApp, not your portal. Zip's version of this is Slack/Teams/email; yours is WhatsApp, because that's what a Tiruppur or Dhaka supplier office actually runs on.
- **Writes in the vendor's language** - Mandarin, Vietnamese, Bengali, Turkish. You already built a bilingual toggle; this is the same capability pointed outward instead of inward. A follow-up in Bengali that says *"your Form-C is expired, here's the exact page we need"* converts vastly better than a portal notification in English.
- Accepts reply-with-attachment: vendor replies to the WhatsApp/email thread with a photo of the doc, agent OCRs it, files it, updates the checklist. **Zero portal logins.** Portal login is your single biggest vendor-side friction point and it is removable.

**3. Verification Agent** - *upgrade of what you have*
- Beyond extract-and-flag: **cross-document consistency**. Does the entity name on the GST certificate match the IEC, the bank letter, the SCoC signatory, and the ISO cert? Mismatch across documents is where real fraud lives, and it's invisible when you review documents one at a time.
- **Recency & validity**: licence expiry vs. proposed contract term, audit reports older than 18 months, insurance lapsing mid-contract.
- **Confidence-tiered output**: green (auto-accepted, collapsed by default), amber (needs a glance), red (needs a decision). Elena should only see amber and red on open. Today she reviews everything at the same visual weight - that's the friction.
- External corroboration where a source exists (GST portal status, IEC directory, sanctions/denied-party lists). This turns "the vendor told us" into "we verified."

**4. Compliance Agent** - *policy-as-context*
- Runs the file against the actual policy text (IEC, GST, Procurement Policy, SCoC) and produces a **readiness recommendation with citations** - every finding links to both the source clause and the source document page.
- Recommendation only. Hard-blocked from any approve action. This is the ceiling your brief sets and it's also, unusually, your best marketing line: *"AI does the work. Humans keep the authority."*

**5. Config Agent** - *the one nobody builds, and the one that compounds*
- Zip's Config Superagent "identifies process inefficiencies and adapts workflows over time." For you: watch the audit trail and surface patterns to the Compliance Manager.
  - *"Elena overrode the AI's bank-detail extraction 31 times this month - always on Vietnamese bank letters. The extraction prompt needs work."*
  - *"Turkish vendors take 4.2 days at the SCoC step vs. 1.1 days elsewhere. The Turkish translation of the SCoC is probably unclear."*
- **This is the feature that makes your audit log an asset instead of a compliance tax.** You are already logging AI recommendation + human decision + reason + timestamp + user ID. That dataset is a goldmine and right now it's write-only.

---

## 4. Fitting all this into 3 screens (your brief's fixed ceiling)

You cannot add pages. You don't need to - every agent surfaces inside an existing screen.

**Screen 1 - Vendor Queue** becomes an *agent activity feed*, not a table.
- Sort by **"what needs a human"**, not by date. Three bands: `Ready for your decision` / `Agents working - nothing needed from you` / `Blocked, needs your intervention`.
- Each row shows what the agent last did and what it's waiting on: *"Chaser sent 2nd follow-up in Bengali, 4h ago · waiting on Factory Audit Report."*
- The win: on Monday morning Elena sees 6 vendors that need her instead of 47 vendors that need triage. **The queue does the triage; that's the AI feature.**

**Screen 2 - Review Workspace** gets an *agent panel* alongside the document canvas.
- Confidence-tiered findings (green collapsed / amber / red) so the page opens on what matters.
- Every finding is click-through: finding → policy clause → document page highlight. Provenance without a separate drawer.
- **Chat-with-the-file** as a sidebar, scoped to this vendor's documents only: *"has this supplier ever failed an audit?" "what's their capacity in units/month?"* - grounded, cited, no hallucination surface. This is your Zip "Concierge" equivalent and it's cheap to add.
- Elena's corrections feed straight back as training signal (surfaced by the Config Agent).

**Screen 3 - Audit & Approval History** becomes an *outcome dashboard*.
- Keep the immutable log - it's your acceptance criterion.
- Add on top: cycle time by stage, agent-vs-human agreement rate, override reasons clustered, time-to-document by country. **Instrument the 7→2 days claim inside the product** so it's demonstrable, not asserted. Zip puts "55% faster purchasing cycles" and a 386% ROI study on the homepage; that number came from somewhere, and the somewhere is the product's own telemetry.

---

## 5. Friction inventory - specific removals

| Friction | Fix |
|---|---|
| **Vendor must log into a portal** | Reply-to-email / WhatsApp-with-attachment ingestion. Portal optional, never required. Biggest single win. |
| **Vendor doesn't know what's wrong** | Rejection messages that say *"page 2 of your GST cert is cut off - resend that page only,"* not "document rejected." Per-document, in their language, with a picture. |
| **Elena reviews every field at equal weight** | Confidence tiers. Auto-collapse green. Her attention is the scarce resource. |
| **"Where is this vendor?" is unanswerable** | One status line per vendor written by the agent in plain language, visible to both sides. Vendors should see it too - most "status chase" emails disappear the moment the vendor can self-serve the answer. |
| **The Manager is a bottleneck** | Batch-approve for files where the AI and Elena fully agree and nothing is flagged - one screen, N vendors, one signature, still fully logged. Reserve the deep review for disagreement cases. |
| **Re-onboarding a known vendor from scratch** | Vendor record persists. Annual re-verification = only the expired documents, not all 12. |
| **Same document uploaded to 3 places** | Single document store per vendor entity, referenced across applications. |
| **No sense of progress for the vendor** | Vendor-side view: "3 of 8 done, typically 2 days remaining." Removes a whole class of inbound email. |

---

## 6. Governance - treat it as the feature, not the constraint

Zip devotes an entire homepage section to this, and it's the reason enterprises buy them over a cheaper copilot. Copy the whole list; you already half-have it:

- **Permission-aware agents** - the agent acts with Elena's permissions, so it structurally cannot do what she can't do. This is a much stronger guarantee than "we told the prompt not to approve."
- **Granular action controls** - an explicit allowlist per agent. The Compliance Agent has no `approve` action in its action list at all.
- **Deterministic where it matters** - ERP writes, status transitions, and the mandatory-document gate are plain code with hard checks, never model output. The LLM proposes; deterministic code disposes.
- **Human-in-the-loop gates** - configurable per action, per risk tier.
- **Audit trail with reasoning** - you log the decision; also log *why the AI recommended what it did*, including which policy clause and which document page. Auditable AI is the whole point.
- **Versioning & drafts of agent config** - when the Compliance Manager edits a policy prompt, that's a versioned change with a revert. Otherwise nobody will ever dare touch it.

---

## 7. Build order

**Phase 1 - 2 weeks · make the existing thing sharper**
Confidence tiers in ReviewWorkspace · queue re-sorted by "needs a human" · cross-document consistency checks · finding → policy clause → page provenance. *No new screens, no new infra.*

**Phase 2 - 4–6 weeks · the completion engine**
Chaser Agent with email + WhatsApp, multilingual, reply-with-attachment ingestion · dynamic document checklist by category × country × value · duplicate vendor detection on intake. *This is the phase that moves the 7→2 metric.*

**Phase 3 - 8 weeks · agent platform**
Formalise Skills / Actions / Context · permission-aware execution · action allowlists · agent config versioning · chat-with-the-file.

**Phase 4 - ongoing · compounding**
Config Agent over the audit trail · outcome dashboard · override clustering feeding back into extraction quality.

---

## 8. What NOT to build

- **A general chatbot.** Zip explicitly positions *against* copilots. Scope every AI surface to a task and a document set.
- **Anything outside onboarding + compliance.** Your brief rules out POs, inventory, payments, logistics. Zip's breadth there is a decade of enterprise scaling - don't imitate the surface area, imitate the architecture.
- **Autonomous approval, in any form, ever.** Not even for low-value vendors. It's your acceptance criterion, and it's your differentiator.
- **More screens.** The ceiling is a gift. It forces the AI to make existing screens smarter rather than adding places to hide.

---

## 9. Two positioning notes

- Zip's category name - **"procurement orchestration"** - did a lot of work for them; it's the only such platform in the 2026 Gartner MQ for Source-to-Pay Suites. Yours is **"vendor onboarding orchestration"** or **"compliance orchestration."** Not "AI document review." The orchestration framing is what turns a screen into a platform.
- Zip leads every page with a measurable outcome (55% faster cycles, 2x compliant purchases, 3.6% savings, 386% ROI). Your equivalent is sitting right in the brief: **7 days → 2 days.** Instrument it in Screen 3 so the number is a product output, not a claim.

---

## Sources

- [Zip - AI for Procurement (homepage)](https://zip.com/)
- [Zip - Superagents](https://zip.com/capabilities/superagents)
- [Zip - Intake management](https://zip.com/capabilities/intake-management)
- StyleSphere Product Brief (`Reference/Product-Brief.docx`)
