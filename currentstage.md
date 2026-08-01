# StyleSphere Nexus — Current Stage & Complete File Map

> **File:** `currentstage.md`  
> **Repository:** `vendor-management` (`SanthoshGD/vendor-management`)  
> **Framework:** Next.js 15 (React 19, TypeScript 5.7)  

This file contains the complete repository state, active architecture, file tree, component mapping, and instructions for continuing development with Claude.

---

## 1. Project Overview & Key Rules

StyleSphere Nexus is an enterprise vendor management and compliance automation platform. It features dual independent portals:
1. **Vendor Portal**: Vendor onboarding wizard, document upload, status tracking, action center.
2. **Admin Portal**: Centralized vendor directory, single-page Vendor Details view with 5 embedded tabs, product catalog, AI compliance assistant chatbot, activity audit trail, analytics dashboard.

### Core Architectural Rules
- **No Direct Replacement**: Preserve existing working components until migration is complete.
- **Embedded Document Review**: Document review is NOT a standalone page. It lives in `Admin -> Vendor Details -> Documents` tab (`VendorDetailView.tsx`).
- **Vendor Details Single Source of Truth**: Vendor management is centralized in `VendorDetailView.tsx` with 5 tabs: `Overview`, `Documents`, `Activity`, `Communication`, `Approval History`.
- **Labels & Terminology**:
  - `Vendor Executive` (formerly Supervisor)
  - `Status` (formerly Document Stage)
  - `Product Catalog` (formerly Products)
  - `Approval Rate` (displays China metric)
- **Success Toast**: Approving a vendor triggers `ApprovalToast.tsx` ("✅ Vendor Approved") and updates vendor status, activity, and audit logs.

---

## 2. Complete File Directory Structure

```
vendor-management/
├── .eslintrc.json                          # ESLint config
├── .gitignore                              # Git ignore config
├── CONTENT-STRATEGY.md                     # UX content strategy
├── GEMINI.md                               # Project development guidelines
├── NEXUS-integration-audit-checkpoint.md   # Integration checkpoint notes
├── PROJECT_STATE_AND_STRUCTURE.md          # Comprehensive architecture & state doc
├── README.md                               # Project readme
├── StyleSphere-Nexus-AI-Strategy.md        # AI strategy doc
├── StyleSphere-Nexus-fixed.html            # Production standalone prototype HTML
├── StyleSphere_Admin view.jsx              # Standalone Admin view prototype
├── currentstage.md                         # This file - stage & structure map
├── app/
│   ├── layout.tsx                          # App layout & stylesheet imports
│   └── page.tsx                            # Root page rendering RedesignedApp
├── components/
│   ├── AIProvenanceDrawer.jsx              # AI confidence drawer
│   ├── AgentConsole.jsx                    # AI agent console
│   ├── AuditTrail.jsx                      # Audit trail component
│   ├── ChaserPanel.jsx                     # Automated document chaser
│   ├── DiagnosticTooltip.jsx               # Diagnostic tooltip
│   ├── DocumentCanvas.jsx                  # Document viewer & highlight overlay
│   ├── ExtractedForm.jsx                   # Document extraction editor
│   ├── FindingDetail.jsx                   # Finding detail modal
│   ├── FindingsPanel.jsx                   # Findings side panel
│   ├── HeaderNav.jsx                       # Header navigation
│   ├── InlineOverrideModal.jsx             # Manual override modal
│   ├── KeyboardShortcutsModal.jsx          # Keyboard shortcuts modal
│   ├── OnboardingWizard.jsx                # Multi-step vendor onboarding wizard
│   ├── OutcomeDashboard.jsx                # Review outcome dashboard
│   ├── RedesignedApp.tsx                   # Main layout & router shell
│   ├── ReviewQueue.jsx                     # Review queue table
│   ├── ReviewWorkspace.jsx                 # Workspace view
│   ├── StrategyModal.jsx                   # AI strategy modal
│   ├── VendorChat.jsx                      # Messenger thread
│   ├── admin/
│   │   ├── AIAssistantChatbot.jsx          # Embedded AI assistant chatbot
│   │   ├── Activity/
│   │   │   └── ActivityView.tsx            # Audit feed view
│   │   ├── AI/
│   │   │   └── AIComplianceAssistant.tsx   # Global slide-out AI Compliance Assistant
│   │   ├── Analytics/
│   │   │   └── AnalyticsView.tsx           # Analytics dashboard view
│   │   ├── Dashboard/
│   │   │   ├── ApprovalRate.tsx            # Approval rate gauge card (China)
│   │   │   ├── Dashboard.tsx               # Enterprise Admin Dashboard container
│   │   │   ├── MetricsRow.tsx              # Top KPI summary cards
│   │   │   ├── PendingVendorCard.tsx       # Pending vendor review cards
│   │   │   ├── PipelineFunnel.tsx          # Onboarding pipeline funnel chart
│   │   │   ├── PriorityQueue.tsx           # Priority action queue widget
│   │   │   ├── RecentActivity.tsx          # Recent activity feed widget
│   │   │   ├── RiskDistributionChart.tsx   # Risk distribution chart (Recharts)
│   │   │   └── TrendChart.tsx              # Monthly approval trend chart
│   │   ├── DocumentReview/
│   │   │   └── DocumentsView.tsx           # Document verification & extraction grid
│   │   ├── Product/
│   │   │   ├── ProductCard.tsx             # Product catalog card
│   │   │   └── ProductCatalog.tsx          # Product catalog grid view
│   │   ├── Shared/
│   │   │   └── ApprovalToast.tsx           # Vendor approval success toast
│   │   └── Vendor/
│   │       ├── VendorActivity.tsx          # Vendor activity timeline tab
│   │       ├── VendorApprovalHistory.tsx   # Vendor approval history tab
│   │       ├── VendorCommunication.tsx     # Vendor messenger tab
│   │       ├── VendorDetailView.tsx        # Centralized Vendor Details page (5 tabs)
│   │       ├── VendorDocuments.tsx         # Vendor documents tab (embeds DocumentsView)
│   │       ├── VendorList.tsx              # Filterable vendor directory list
│   │       ├── VendorOverview.tsx          # Vendor profile overview & quick approve
│   │       └── VendorRiskCard.tsx          # Vendor risk score breakdown card
│   └── layout/
│       ├── Sidebar.tsx                     # Navigation sidebar
│       └── Topbar.tsx                      # Topbar header with search & persona switch
├── constants/
│   ├── nav.ts                              # Navigation links
│   ├── onboarding.ts                       # Onboarding constants
│   └── outcomes.ts                         # Outcomes & default settings
├── context/
│   └── NexusContext.tsx                    # Central state, storage & business logic provider
├── data/
│   └── mockData.ts                         # Initial seed vendors, requests, users
├── hooks/
│   ├── useDialog.ts                        # Modal state hook
│   └── useNexus.ts                         # NexusContext hook
├── lib/
│   ├── base64.ts                           # Base64 invite token utilities
│   ├── csv.ts                              # CSV export helper
│   └── utils.ts                            # Classnames & formatting helpers
├── next.config.ts                          # Next.js 15 config
├── package.json                            # Package dependencies
├── services/
│   ├── agentCatalog.ts                     # AI agent catalog & configs
│   ├── agentEngine.ts                      # AI evaluation & triage engine
│   ├── api.ts                              # Mock API service
│   └── policyPack.ts                       # Compliance clause rules
├── styles/
│   ├── App.css                             # Layout styles
│   ├── RedesignedApp.css                   # Theme variables & glassmorphism
│   └── index.css                           # Base CSS reset & tokens
└── types/
    ├── agent.ts                            # AI agent types
    ├── audit.ts                            # Audit log types
    ├── request.ts                          # Request & exception types
    └── vendor.ts                           # Vendor, Document & Field types
```

---

## 3. Key Component Dependencies & Exports

- `RedesignedApp.tsx` imports:
  - `NexusProvider`, `useNexus` from `../context/NexusContext`
  - `Sidebar` from `./layout/Sidebar`
  - `Topbar` from `./layout/Topbar`
  - `Dashboard` from `./admin/Dashboard/Dashboard`
  - `VendorList` from `./admin/Vendor/VendorList`
  - `VendorDetailView` from `./admin/Vendor/VendorDetailView`
  - `ProductCatalog` from `./admin/Product/ProductCatalog`
  - `DocumentsView` from `./admin/DocumentReview/DocumentsView`
  - `AIComplianceAssistant` from `./admin/AI/AIComplianceAssistant`
  - `ApprovalToast` from `./admin/Shared/ApprovalToast`
  - `AnalyticsView` from `./admin/Analytics/AnalyticsView`
  - `ActivityView` from `./admin/Activity/ActivityView`

- `NexusContext.tsx` exports:
  - `NexusProvider`, `useNexus`, `inspectUpload`, `checklistForCategory`

---

## 4. Instructions for Continuing with Claude

When using Claude to build new features or modify components in this repository:
1. Refer to [PROJECT_STATE_AND_STRUCTURE.md](file:///Users/anubhav/Downloads/vendor-management/PROJECT_STATE_AND_STRUCTURE.md) or [currentstage.md](file:///Users/anubhav/Downloads/vendor-management/currentstage.md) as the full system reference.
2. Keep Vendor and Admin components separated under `components/admin/` and `components/OnboardingWizard.jsx`.
3. Use state and actions from `useNexus()` rather than creating local duplicate state.
4. Ensure approval flow invokes `ApprovalToast` and logs to audit via `appendAudit`.
