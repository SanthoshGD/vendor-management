# StyleSphere Nexus — Comprehensive Project State & Architecture Reference

> **Generated Date:** August 1, 2026  
> **Repository:** `vendor-management` (`SanthoshGD/vendor-management`)  
> **Tech Stack:** Next.js 15, React 19, TypeScript 5.7, Lucide React, Recharts, Vanilla CSS  
> **Purpose:** Enterprise Vendor Compliance & Management Dashboard with dual-portal experience (Vendor Portal & Admin Portal).

---

## 1. Executive Summary & Core Rules

StyleSphere Nexus is an enterprise vendor onboarding, compliance review, and management platform. It features AI-assisted automated document inspection, governance workflows, risk management, and audit trailing.

### Mandatory Architecture Rules (GEMINI Rules)
1. **Strict Portal Separation**:
   - **Vendor Portal**: Onboarding, document uploads, application wizard, vendor workspace, action center.
   - **Admin Portal**: Vendor directory, embedded document review, approval workflows, product catalog, AI compliance assistant, audit log, analytics.
   - *Never mix Vendor components inside Admin routes or vice versa.*

2. **Route & Layout Architecture**:
   - Target route structure: `/vendor` (dashboard, onboarding, documents, profile) and `/admin` (dashboard, vendors, vendor/:id, analytics, approvals, settings).
   - Document Review is **NOT** a standalone page. It is embedded inside `Admin -> Vendor Details -> Documents` tab (`VendorDetailView.tsx` -> `VendorDocuments.tsx`).

3. **Vendor Details as Single Source of Truth**:
   - All vendor management happens inside `VendorDetailView.tsx`.
   - Tabs: `Overview`, `Documents`, `Activity`, `Communication`, `Approval History`.

4. **UI & Naming Standards**:
   - Use **Vendor Executive** (formerly Supervisor).
   - Use **Status** (formerly Document Stage).
   - Use **Product Catalog** (formerly Products).
   - Display **Approval Rate** for **China** only.

5. **Approval Workflow**:
   - When an Admin approves a vendor, trigger `ApprovalToast.tsx` ("✅ Vendor Approved - Approval email and portal notification sent").
   - Update vendor status, timeline, notification center, and audit log synchronously.

---

## 2. Complete File & Directory Structure Tree

```
vendor-management/
├── .eslintrc.json                          # ESLint configuration (Next.js 15 rules)
├── .gitignore                              # Git ignore rules (.next, node_modules, build artifacts)
├── CONTENT-STRATEGY.md                     # Content strategy & UX copy guidelines
├── GEMINI.md                               # Project development rules & architecture constraints
├── NEXUS-integration-audit-checkpoint.md   # System audit & integration checkpoint notes
├── README.md                               # Brief project overview & run instructions
├── StyleSphere-Nexus-AI-Strategy.md        # Comprehensive AI strategy & governance documentation
├── StyleSphere-Nexus.html                  # Legacy standalone single-file prototype HTML
├── StyleSphere-Nexus-fixed.html            # Primary standalone production prototype HTML bundle
├── StyleSphere_Admin view.jsx              # Standalone Admin view prototype component
├── app/                                    # Next.js 15 App Router directory
│   ├── layout.tsx                          # Root HTML layout with CSS stylesheet imports
│   └── page.tsx                            # Root page rendering <RedesignedApp />
├── components/                             # Application React components
│   ├── AIProvenanceDrawer.jsx              # Drawer inspecting AI decision provenance & confidence
│   ├── AgentConsole.jsx                    # Admin AI agent configuration & governance console
│   ├── AuditTrail.jsx                      # Comprehensive system audit trail table component
│   ├── ChaserPanel.jsx                     # Automated vendor chasing thread management panel
│   ├── DiagnosticTooltip.jsx               # Tooltip displaying field extraction diagnostics
│   ├── DocumentCanvas.jsx                  # Document preview and field highlight overlay viewer
│   ├── ExtractedForm.jsx                   # Extracted metadata form editor for documents
│   ├── FindingDetail.jsx                   # Detailed view of a compliance finding/mismatch
│   ├── FindingsPanel.jsx                   # Side panel listing all findings for a vendor
│   ├── HeaderNav.jsx                       # Header navigation bar component (legacy prototype)
│   ├── InlineOverrideModal.jsx             # Modal for manual reviewer override of AI fields
│   ├── KeyboardShortcutsModal.jsx          # Modal listing active keyboard shortcuts
│   ├── OnboardingWizard.jsx                # Vendor multi-step onboarding wizard & account setup
│   ├── OutcomeDashboard.jsx                # Summary dashboard of review outcomes and SLA metrics
│   ├── RedesignedApp.tsx                   # Main Shell component managing routing, navigation, modals
│   ├── ReviewQueue.jsx                     # Reviewer queue component listing pending applications
│   ├── ReviewWorkspace.jsx                 # Legacy standalone review workspace component
│   ├── Screen1VendorQueue.jsx              # Vendor queue screen component (prototype)
│   ├── Screen2ReviewWorkspace.jsx          # Review workspace screen component (prototype)
│   ├── Screen3AuditLog.jsx                 # Audit log screen component (prototype)
│   ├── StrategyModal.jsx                   # AI strategy & policy configuration modal
│   ├── VendorChat.jsx                      # In-context messenger between Vendor and Vendor Executive
│   ├── admin/                              # Admin Portal Components
│   │   ├── AIAssistantChatbot.jsx          # Embedded AI assistant chatbot
│   │   ├── Activity/
│   │   │   └── ActivityView.tsx            # Global system activity feed & audit log view
│   │   ├── AI/
│   │   │   └── AIComplianceAssistant.tsx   # Slide-out AI Compliance Assistant panel
│   │   ├── Analytics/
│   │   │   └── AnalyticsView.tsx           # Enterprise analytics, approval trends, risk stats
│   │   ├── Dashboard/
│   │   │   ├── ApprovalRate.tsx            # Approval rate gauge card (China focus)
│   │   │   ├── Dashboard.tsx               # Main Enterprise Admin Dashboard container
│   │   │   ├── MetricsRow.tsx              # Top metric KPI cards (Total Vendors, Active, Risk)
│   │   │   ├── PendingVendorCard.tsx       # Quick action cards for pending vendor reviews
│   │   │   ├── PipelineFunnel.tsx          # Onboarding pipeline funnel chart
│   │   │   ├── PriorityQueue.tsx           # Prioritized vendor action queue widget
│   │   │   ├── RecentActivity.tsx          # Recent audit & approval activity feed
│   │   │   ├── RiskDistributionChart.tsx   # Recharts pie chart of Low/Medium/High risk
│   │   │   └── TrendChart.tsx              # Monthly approval trend line chart
│   │   ├── DocumentReview/
│   │   │   └── DocumentsView.tsx           # Embedded document review grid & extraction verification
│   │   ├── Product/
│   │   │   ├── ProductCard.tsx             # Individual product catalog item card
│   │   │   └── ProductCatalog.tsx          # Product catalog grid with vendor association & status
│   │   ├── Shared/
│   │   │   └── ApprovalToast.tsx           # Success toast displayed upon approving a vendor
│   │   └── Vendor/
│   │       ├── VendorActivity.tsx          # Vendor-specific timeline & audit log tab
│   │       ├── VendorApprovalHistory.tsx   # Vendor-specific approval history tab
│   │       ├── VendorCommunication.tsx     # Vendor-specific message/communication thread tab
│   │       ├── VendorDetailView.tsx        # Centralized Vendor Details view with 5 tab panes
│   │       ├── VendorDocuments.tsx         # Vendor-specific documents tab (integrates DocumentsView)
│   │       ├── VendorList.tsx              # Comprehensive vendor directory table with filters
│   │       ├── VendorOverview.tsx          # Vendor profile overview, metrics, & quick approve
│   │       └── VendorRiskCard.tsx          # Vendor risk score breakdown card
│   └── layout/                             # Shared Shell Layout Components
│       ├── Sidebar.tsx                     # Main navigation sidebar for Admin and Vendor
│       └── Topbar.tsx                      # Top app header with search, persona switcher, user profile
├── constants/                              # App constants & configurations
│   ├── nav.ts                              # Navigation links and icons mapping
│   ├── onboarding.ts                       # Onboarding wizard step constants & demo IDs
│   └── outcomes.ts                         # System outcomes, default settings, approval ceilings
├── context/                                # Application State & Business Logic Layer
│   └── NexusContext.tsx                    # Central React Context provider for state, storage, agents
├── data/                                   # Data models & initial mock datasets
│   └── mockData.ts                         # Initial seed vendors, requests, audit logs, users
├── hooks/                                  # Custom React Hooks
│   ├── useDialog.ts                        # Custom hook for managing modal dialog state
│   └── useNexus.ts                         # Custom hook for consuming NexusContext
├── lib/                                    # Utility libraries
│   ├── base64.ts                           # Base64 helper methods for invite token generation
│   ├── csv.ts                              # Utility for exporting tabular data to CSV
│   └── utils.ts                            # General helper functions (classNames, formatting)
├── next.config.ts                          # Next.js configuration file
├── package.json                            # Package dependencies and npm scripts
├── public/                                 # Static assets (favicons, icons, images)
│   ├── favicon.svg                         # App favicon
│   ├── icons.svg                           # SVG icon spritesheet
│   └── og.png                              # OpenGraph preview image
├── scripts/                                # Verification, build, and test scripts
│   ├── build-standalone.mjs                # Standalone HTML bundler script
│   ├── flow.test.mjs                       # End-to-end user flow test runner
│   ├── gates-operations.test.mjs           # Operational gate test runner
│   ├── gates.test.mjs                      # Compliance gate test runner
│   ├── layout.test.mjs                     # Layout & responsiveness test runner
│   ├── smoke-agents.mjs                    # AI agent smoke test suite
│   └── tests/                              # Sub-test suite modules (volume, modals, onboarding)
├── services/                               # Business Logic Services & AI Agent Engine
│   ├── agentCatalog.ts                     # AI agent registry definitions and default configs
│   ├── agentEngine.ts                      # Core AI agent evaluation & automated triage logic
│   ├── api.ts                              # Mock API abstraction service layer
│   └── policyPack.ts                       # Compliance clause rules & policy definitions
├── src/                                    # Legacy React/Vite source directory
│   ├── App.css                             # Global styles (legacy)
│   ├── App.jsx                             # Legacy App container
│   ├── RedesignedApp.css                   # Global redesigned theme stylesheet
│   ├── RedesignedApp.jsx                   # Legacy JSX version of RedesignedApp
│   ├── index.css                           # Base CSS & design tokens
│   └── main.jsx                            # Vite entry point (legacy)
├── styles/                                 # Active CSS Design System Stylesheets
│   ├── App.css                             # Layout and component styles
│   ├── RedesignedApp.css                   # Theme variables, glassmorphism, Dark mode
│   └── index.css                           # Core CSS reset, typography, utility classes
├── types/                                  # TypeScript Type Definitions
│   ├── agent.ts                            # Types for AgentConfig, AgentProposal, TriageAssessment
│   ├── audit.ts                            # Types for AuditLogEntry and action types
│   ├── request.ts                          # Types for SupervisorRequest, ProcurementRequest, RiskException
│   └── vendor.ts                           # Types for Vendor, VendorDocument, VendorField, VendorProfile
└── tsconfig.json                           # TypeScript configuration
```

---

## 3. Core Architecture & Component Map

### 3.1 App Entry & Layout Shell
- **Entry Point**: `app/page.tsx` renders `components/RedesignedApp.tsx`.
- **State Provider**: `RedesignedApp.tsx` wraps `NexusShell` inside `NexusProvider` (`context/NexusContext.tsx`).
- **Layout Shell**:
  - `Sidebar.tsx`: Handles navigation for Admin Portal (`overview`, `vendors`, `review-queue`, `compliance`, `products`, `ai-assistant`, `activity`, `analytics`, `settings`) and Vendor Portal (`overview`, `onboarding`, `actions`, `documents`).
  - `Topbar.tsx`: Features quick search, persona switcher (`Admin Portal` vs `Vendor Portal`), active page title, help menu, and user identity avatar.

### 3.2 Admin Portal Views (`components/admin/`)
1. **Admin Dashboard (`components/admin/Dashboard/Dashboard.tsx`)**:
   - `MetricsRow.tsx`: Displays key operational KPIs.
   - `ApprovalRate.tsx`: Highlights China approval metrics.
   - `TrendChart.tsx`: Visualizes monthly approval velocity.
   - `RiskDistributionChart.tsx`: Breakdown of vendor risk tiers.
   - `PriorityQueue.tsx`: Urgently flagged vendors requiring human intervention.
   - `RecentActivity.tsx`: Global activity feed.
   - `PipelineFunnel.tsx`: Onboarding stage distribution.
2. **Vendor Directory (`components/admin/Vendor/VendorList.tsx`)**:
   - Filterable, searchable directory of all registered vendors.
   - Supports filtering by status (`All`, `Onboarding`, `Active`, `At risk`).
   - Clicking a vendor opens `VendorDetailView.tsx`.
3. **Vendor Details View (`components/admin/Vendor/VendorDetailView.tsx`)**:
   - **Central hub for single vendor management**.
   - Header with status badges, risk score, ERP status, and primary action buttons (`Approve Vendor`, `Request Documents`, `Escalate`).
   - **Tabs**:
     - `Overview` (`VendorOverview.tsx`): Profile metadata, key metrics, risk score card (`VendorRiskCard.tsx`), quick approval panel.
     - `Documents` (`VendorDocuments.tsx`): Integrates `DocumentsView.tsx` for viewing document cards, confidence scores, field extraction status, and inline field verification/overrides.
     - `Activity` (`VendorActivity.tsx`): Complete chronological audit log of all actions taken for this vendor.
     - `Communication` (`VendorCommunication.tsx`): Chat thread with the vendor contact.
     - `Approval History` (`VendorApprovalHistory.tsx`): Historical log of approval/rejection decisions and supervisor requests.
4. **Product Catalog (`components/admin/Product/ProductCatalog.tsx`)**:
   - Displays product items produced by vendors.
   - Each `ProductCard.tsx` shows: Product Name, Vendor Name, Country, Category, and Status.
5. **AI Compliance Assistant (`components/admin/AI/AIComplianceAssistant.tsx`)**:
   - Global floating slide-out drawer accessible via the sparkle button on bottom-right.
   - Answers compliance queries, suggests vendor risk assessments, and assists in document verification.
6. **Approval Toast (`components/admin/Shared/ApprovalToast.tsx`)**:
   - Auto-dismissing toast triggered when a vendor is approved.
   - Displays "✅ Vendor Approved" message and provides a "View Vendor" action link.

---

## 4. State Management & Data Layer (`context/NexusContext.tsx`)

The entire app state is managed in `NexusContext.tsx` and accessed via `useNexus()`.

### Key State Objects & Functions
- `vendors`: Derived view array of all `Vendor` objects, enriched with calculated risk scores, document completion progress, and operational stage.
- `getVendor(id)`: Returns the specific vendor object by ID.
- `activeVendorId`: Currently focused vendor ID.
- `settings`: App preferences (UI density: `compact` | `comfortable`, notification toggles).
- `agentConfig`: Configuration object for AI agents (governance rules, auto-clearing thresholds, required approvals).
- `agentApprovals`: Proposals created by AI agents requiring human confirmation.
- `dispatchAgentAction(agentId, actionId, options)`: Dispatches action through governance engine.
- `resolveApproval(approvalId, outcome, note)`: Approves or declines an agent proposal.
- `inspectUpload(file)`: Simulates document verification check on file uploads (file format, size limits, simulated optical extraction).
- `acceptField(vendorId, docId, fieldKey)`: Accepts an AI-extracted field value.
- `correctField(vendorId, docId, fieldKey, newValue, reason)`: Overrides an AI field value and appends an audit log entry.
- `runDocumentReview(vendorId, docId, verdict, options)`: Triggers automated document verification pipeline.
- `appendAudit(entry)`: Appends an item to the immutable global audit log.

---

## 5. Primary Data Models & TypeScript Types

### `Vendor` (`types/vendor.ts`)
```typescript
export interface Vendor {
  id: string;
  initials: string;
  name: string;
  shortName?: string;
  country: string;
  category: string;
  contact: string;
  email: string;
  owner: string;
  baseRiskScore: number;
  slaHours: number;
  sla: string;
  finalStatus?: 'Active' | 'Approved' | 'Rejected' | null;
  aiSummary: string;
  documents: VendorDocument[];
  hasSubmittedApplication?: boolean;
  onboardingStep?: number;
  onboardingMethod?: string;
  profile?: VendorProfile;
  supervisorNote?: VendorSupervisorNote;
  checklistId?: string;
  erpId?: string;
  // Computed runtime fields
  progress?: number;
  docs?: string;
  verifiedCount?: number;
  missingCount?: number;
  openFindings?: number;
  risk?: 'Low' | 'Medium' | 'High';
  riskScore?: number;
  stage?: string;
  status?: string;
  submittedAt?: string;
}
```

### `VendorDocument` & `VendorField` (`types/vendor.ts`)
```typescript
export interface VendorField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  resolved: boolean;
  humanVerified: boolean;
  crossDocMismatch?: boolean;
  mismatchNote?: string;
  diagnostic?: string;
  translatedValue?: string;
  originalValue?: string;
}

export interface VendorDocument {
  id: string;
  code: string;
  title: string;
  fileName?: string;
  pageCount?: number;
  docTemplate?: string;
  language?: string | null;
  status: 'Verified' | 'Needs Review' | 'Flagged' | 'Missing' | 'Processing' | 'Uploaded';
  fields: VendorField[];
  rejection?: RejectionInfo;
}
```

### `AuditLogEntry` (`types/audit.ts`)
```typescript
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  vendorId: string;
  vendorName: string;
  actorName: string;
  actorId: string;
  actionType:
    | 'FIELD_ACCEPT'
    | 'FIELD_OVERRIDE'
    | 'DOCUMENT_UPLOAD'
    | 'DOCUMENT_VERIFIED'
    | 'DECISION'
    | 'VENDOR_INVITED'
    | 'AI_REVIEW'
    | 'AGENT_ACTION'
    | 'AGENT_BLOCKED'
    | 'AGENT_PENDING'
    | 'AGENT_APPROVAL'
    | 'AGENT_CONFIG'
    | 'SETTINGS_UPDATED';
  documentName: string;
  fieldLabel?: string;
  originalValue?: string | null;
  humanValue?: string | null;
  reason?: string;
  clauseRef?: string | null;
}
```

---

## 6. How to Extend / Build New Features (Instructions for Claude & Developers)

1. **Development Server**:
   ```bash
   npm run dev
   ```
   Runs Next.js 15 dev server on `http://localhost:3000`.

2. **Making UI & Component Changes**:
   - Place modular admin components in `components/admin/<Feature>/`.
   - Ensure all sub-views utilize existing design tokens from `styles/RedesignedApp.css` and `styles/index.css`.
   - Use Lucide icons consistently (`import { IconName } from 'lucide-react'`).

3. **Modifying Vendor State or Document Workflows**:
   - Access state via `const { vendors, acceptField, correctField, dispatchAgentAction } = useNexus();`.
   - Never mutate state directly in local components; invoke context methods to ensure audit logs and localStorage updates trigger automatically.

4. **Testing Suite**:
   - Run end-to-end flow checks using node test scripts:
   ```bash
   node scripts/flow.test.mjs
   node scripts/smoke-agents.mjs
   ```

---

*This document serves as the complete, authoritative source of truth for the project structure, state management, and design rules for StyleSphere Nexus.*
