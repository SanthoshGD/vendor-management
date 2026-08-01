import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  LayoutDashboard, Users, FileText, Package, UserCog, Activity,
  ChevronLeft, ChevronRight, Search, Bell, Settings, ChevronDown,
  ArrowUp, ArrowDown, ArrowUpDown, Filter, Download, CheckCircle2, XCircle,
  Eye, AlertTriangle, Sparkles, Clock, TrendingUp, TrendingDown, MoreVertical,
  Check, X, SlidersHorizontal, Calendar, MapPin, Zap, ShieldAlert,
  ChevronsUpDown, LogOut, Kanban as KanbanIcon, List as ListIcon,
  ArrowLeft, KeyRound, CircleDot, Send, Loader2, ArrowRight, RotateCcw, PanelLeft, Mail, Phone, ShieldCheck
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

/* ------------------------------------------------------------------ */
/* MOCK DATA                                                           */
/* ------------------------------------------------------------------ */

const REGIONS = ["East Asia", "South Asia", "West Africa", "Europe", "Americas"];

const VENDORS = [
  { id: "v1", name: "Wei Mingzhi", company: "Jinpeng Leather Goods Co.", category: "Bags", stage: "Verified", status: "Approved", docs: "6/6", supervisor: "Liu Yanbo", submitted: "Today, 10:42 AM", region: "East Asia", daysInStage: 0, risk: "low" },
  { id: "v2", name: "Chen Lihua", company: "Dongfang Footwear Export", category: "Shoes", stage: "Doc Review", status: "In Review", docs: "4/6", supervisor: "Liu Yanbo", submitted: "Today, 9:15 AM", region: "East Asia", daysInStage: 2, risk: "low" },
  { id: "v3", name: "Zhang Weilong", company: "Hualong Garment Factory", category: "Apparels", stage: "Profile Submitted", status: "Pending", docs: "0/6", supervisor: "Liu Yanbo", submitted: "Yesterday, 4:30 PM", region: "East Asia", daysInStage: 1, risk: "medium" },
  { id: "v4", name: "Sun Fang", company: "Bolin Accessories Ltd.", category: "Accessories", stage: "Doc Review", status: "Rejected", docs: "3/6", supervisor: "Elena R.", submitted: "2 hrs ago", region: "Europe", daysInStage: 3, risk: "medium" },
  { id: "v5", name: "Liu Hao", company: "Mingde Watch Trading Co.", category: "Watches", stage: "Profile Submitted", status: "Rejected", docs: "0/6", supervisor: "Marco B.", submitted: "2 days ago", region: "Americas", daysInStage: 2, risk: "high" },
  { id: "v6", name: "Meera Nair", company: "Nair Global Exports Pvt. Ltd.", category: "Bags", stage: "Doc Review", status: "In Review", docs: "5/6", supervisor: "Elena R.", submitted: "Today, 8:00 AM", region: "South Asia", daysInStage: 6, risk: "medium" },
  { id: "v7", name: "Priya Sharma", company: "Delhi Craft Circle", category: "Jewelry", stage: "Products Pending", status: "Approved", docs: "6/6", supervisor: "Priya N.", submitted: "3 days ago", region: "South Asia", daysInStage: 3, risk: "low" },
  { id: "v8", name: "Mehmet Yilmaz", company: "Anatolian Leather Works", category: "Bags", stage: "Profile Approved", status: "Approved", docs: "6/6", supervisor: "Marco B.", submitted: "5 days ago", region: "West Africa", daysInStage: 5, risk: "low" },
  { id: "v9", name: "Fatima Zahra", company: "Casa Textile SARL", category: "Apparels", stage: "Invited", status: "Invited", docs: "0/6", supervisor: "Elena R.", submitted: "—", region: "West Africa", daysInStage: 0, risk: "low" },
  { id: "v10", name: "Nguyen Thi Lan", company: "Hanoi Fashion Studio", category: "Apparels", stage: "Invited", status: "Invited", docs: "0/6", supervisor: "Marco B.", submitted: "—", region: "East Asia", daysInStage: 0, risk: "low" },
  { id: "v11", name: "Arjun Mehta", company: "Mumbai Garment House", category: "Apparels", stage: "Profile Submitted", status: "Pending", docs: "0/6", supervisor: "Priya N.", submitted: "1 day ago", region: "South Asia", daysInStage: 1, risk: "low" },
  { id: "v12", name: "Carlos Reyes", company: "Bogotá Shoes Factory", category: "Shoes", stage: "Verified", status: "Verified", docs: "6/6", supervisor: "Marco B.", submitted: "10 days ago", region: "Americas", daysInStage: 0, risk: "low" },
];

const DOCUMENTS = [
  { id: "d1", title: "Company Registration Certificate", vendor: "Zhang Weilong", company: "Hualong Garment Factory", pages: 5, submitted: "Yesterday", ageDays: 1, confidence: 41, flag: "Certificate number format doesn't match the issuing authority's known pattern.", risk: "high" },
  { id: "d2", title: "GST / VAT Certificate", vendor: "Meera Nair", company: "Nair Global Exports Pvt. Ltd.", pages: 2, submitted: "4h ago", ageDays: 0.2, confidence: 62, flag: "Registered business name differs slightly from the certificate holder name.", risk: "medium" },
  { id: "d3", title: "Supplier Code of Conduct Sign-off", vendor: "Chen Lihua", company: "Dongfang Footwear Export", pages: 4, submitted: "5h ago", ageDays: 0.2, confidence: 99, flag: null, risk: "low" },
  { id: "d4", title: "Bank Account Verification Letter", vendor: "Meera Nair", company: "Nair Global Exports Pvt. Ltd.", pages: 1, submitted: "4h ago", ageDays: 0.2, confidence: 88, flag: null, risk: "low" },
  { id: "d5", title: "ISO Quality Certificate", vendor: "Chen Lihua", company: "Dongfang Footwear Export", pages: 3, submitted: "2h ago", ageDays: 0.1, confidence: 96, flag: null, risk: "low" },
];

const PRODUCTS = [
  { id: "p1", name: "Handcrafted Silver Necklace Set", vendor: "Priya Sharma", company: "Delhi Craft Circle", category: "Jewelry", submitted: "2 days ago", photos: 3, flag: "Two images appear reused from a prior listing (98% visual match).", risk: "medium", images: [
    "https://images.unsplash.com/photo-1620135104013-1abdff4b1ca7",
    "https://images.unsplash.com/photo-1589128777073-263566ae5e4d",
    "https://images.unsplash.com/photo-1635767798638-3e25273a8236",
  ] },
  { id: "p2", name: "Gold-plated Bangles (Set of 6)", vendor: "Priya Sharma", company: "Delhi Craft Circle", category: "Jewelry", submitted: "2 days ago", photos: 3, flag: null, risk: "low", images: [
    "https://images.unsplash.com/photo-1741071520895-47d81779c11e",
    "https://images.unsplash.com/photo-1679156271456-d6068c543ee7",
    "https://images.unsplash.com/photo-1690175867343-2af70ea57537",
  ] },
  { id: "p3", name: "Woven Leather Loafers", vendor: "Mehmet Yilmaz", company: "Anatolian Leather Works", category: "Bags", submitted: "3 days ago", photos: 3, flag: null, risk: "low", images: [
    "https://images.unsplash.com/photo-1616406432452-07bc5938759d",
    "https://images.unsplash.com/photo-1662541089338-c7d53b88be70",
    "https://images.unsplash.com/photo-1615979474401-8a6a344de5bd",
  ] },
  { id: "p4", name: "Canvas Slip-on Sneakers", vendor: "Mehmet Yilmaz", company: "Anatolian Leather Works", category: "Bags", submitted: "3 days ago", photos: 3, flag: "Listed material doesn't match category norms for 'Bags' — possible miscategorization.", risk: "low", images: [
    "https://images.unsplash.com/photo-1676379827610-c380c52db0c6",
    "https://images.unsplash.com/photo-1641997465126-c73cc4070337",
    "https://images.unsplash.com/photo-1650320079970-b4ee8f0dae33",
  ] },
];

const TEAM = [
  { id: "t1", name: "Sarah Chen", role: "Super Admin", region: "HQ — Shanghai", approved: 18, rejected: 3, rate: 86 },
  { id: "t2", name: "James Okafor", role: "Admin", region: "West Africa", approved: 11, rejected: 4, rate: 73 },
  { id: "t3", name: "Aisha Patel", role: "Admin", region: "South Asia", approved: 9, rejected: 2, rate: 81 },
  { id: "t4", name: "Thomas Müller", role: "Admin", region: "Europe", approved: 14, rejected: 5, rate: 73 },
];

const VENDOR_EXECS = [
  { id: "e1", name: "Wei Mingzhi", title: "Export Director", company: "Jinpeng Leather Goods Co.", region: "East Asia", email: "wei.mingzhi@jinpengleather.com", phone: "+86 21 5555 0142" },
  { id: "e2", name: "Chen Lihua", title: "Operations Manager", company: "Dongfang Footwear Export", region: "East Asia", email: "l.chen@dongfangfootwear.com", phone: "+86 10 5555 0198" },
  { id: "e3", name: "Mehmet Yilmaz", title: "Founder & CEO", company: "Anatolian Leather Works", region: "West Africa", email: "mehmet@anatolianleather.com", phone: "+90 212 555 0110" },
  { id: "e4", name: "Priya Sharma", title: "Founder", company: "Delhi Craft Circle", region: "South Asia", email: "priya@delhicraftcircle.in", phone: "+91 98 5555 0173" },
  { id: "e5", name: "Fatima Zahra", title: "Managing Director", company: "Casa Textile SARL", region: "West Africa", email: "f.zahra@casatextile.ma", phone: "+212 522 55 0141" },
  { id: "e6", name: "Carlos Reyes", title: "General Manager", company: "Bogotá Shoes Factory", region: "Americas", email: "carlos.reyes@bogotashoes.co", phone: "+57 1 555 0187" },
  { id: "e7", name: "Li Wei", title: "Compliance Officer", company: "Jinpeng Leather Goods Co.", region: "East Asia", email: "li.wei@jinpengleather.com", phone: "+86 21 5555 0156" },
  { id: "e8", name: "Ana Torres", title: "Compliance Lead", company: "Bogotá Shoes Factory", region: "Americas", email: "ana.torres@bogotashoes.co", phone: "+57 1 555 0192" },
];

const ACTIVITY = [
  { id: "a1", actor: "Wei Mingzhi", target: "Jinpeng Leather Goods Co.", action: "Approved", type: "Approvals", reason: null, by: "Admin Sarah", time: "10 min ago" },
  { id: "a2", actor: "Sun Fang", target: "Bolin Accessories Ltd.", action: "Rejected", type: "Rejections", reason: "Incomplete product images", by: "Admin Sarah", time: "2 hrs ago" },
  { id: "a3", actor: "Chen Lihua", target: "Dongfang Footwear Export", action: "Submitted", type: "Submissions", reason: "4 of 6 documents uploaded", by: "Liu Yanbo", time: "3 hrs ago" },
  { id: "a4", actor: "Fatima Zahra", target: "Casa Textile SARL", action: "Invited", type: "Submissions", reason: null, by: "Elena Rostova", time: "5 hrs ago" },
  { id: "a5", actor: "Chen Lihua", target: "Dongfang Footwear Export", action: "Approved", type: "Approvals", reason: null, by: "Admin James", time: "Yesterday" },
  { id: "a6", actor: "Liu Hao", target: "Mingde Watch Trading Co.", action: "Rejected", type: "Rejections", reason: "Duplicate vendor entry", by: "Admin James", time: "2 days ago" },
  { id: "a7", actor: "Carlos Reyes", target: "Bogotá Shoes Factory", action: "Verified", type: "Approvals", reason: "5 products verified", by: "Super Admin", time: "3 days ago" },
];

const WEEKLY = [
  { week: "W1", approvals: 5 }, { week: "W2", approvals: 6 }, { week: "W3", approvals: 5 },
  { week: "W4", approvals: 8 }, { week: "W5", approvals: 7 }, { week: "W6", approvals: 9 },
  { week: "W7", approvals: 9 }, { week: "W8", approvals: 12 },
];
const WEEKLY_30 = [
  { week: "Wk 1", approvals: 22 }, { week: "Wk 2", approvals: 27 }, { week: "Wk 3", approvals: 31 }, { week: "Wk 4", approvals: 38 },
];
const WEEKLY_90 = [
  { week: "M1", approvals: 64 }, { week: "M2", approvals: 79 }, { week: "M3", approvals: 96 },
];

const FUNNEL = [
  { stage: "Invited", count: 12, pct: 100 },
  { stage: "Profile Submitted", count: 9, pct: 75 },
  { stage: "Doc Review", count: 7, pct: 58 },
  { stage: "Profile Approved", count: 5, pct: 42 },
  { stage: "Products Pending", count: 3, pct: 25 },
  { stage: "Verified", count: 2, pct: 17 },
];

/* ------------------------------------------------------------------ */
/* THEME HELPERS — muted, enterprise-toned status/category colors      */
/* ------------------------------------------------------------------ */

const STATUS_STYLE = {
  Approved: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  Verified: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
  Rejected: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  "In Review": "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  Pending: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  Invited: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
};

const CATEGORY_STYLE = {
  Bags: "bg-indigo-50 text-indigo-700",
  Shoes: "bg-orange-50 text-orange-700",
  Apparels: "bg-sky-50 text-sky-700",
  Accessories: "bg-teal-50 text-teal-700",
  Watches: "bg-amber-50 text-amber-700",
  Jewelry: "bg-rose-50 text-rose-700",
};

const RISK_STYLE = {
  high: "text-rose-600 bg-rose-50 ring-1 ring-inset ring-rose-200",
  medium: "text-amber-600 bg-amber-50 ring-1 ring-inset ring-amber-200",
  low: "text-slate-500 bg-slate-100 ring-1 ring-inset ring-slate-200",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}`}>
      <CircleDot size={10} strokeWidth={3} />
      {status}
    </span>
  );
}

function CategoryTag({ category }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${CATEGORY_STYLE[category] || "bg-slate-100 text-slate-600"}`}>
      {category}
    </span>
  );
}

function ConfidenceBadge({ confidence, risk }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${RISK_STYLE[risk]}`}>
      <Sparkles size={11} />
      {confidence}%
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* SIDEBAR                                                             */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "vendors", label: "Vendors", icon: Users, count: 12 },
  { id: "documents", label: "Documents", icon: FileText, count: 5 },
  { id: "products", label: "Products", icon: Package, count: 4 },
  { id: "team", label: "Team", icon: UserCog },
  { id: "activity", label: "Activity", icon: Activity },
];

const SB = {
  bg: "#101E18",
  border: "#1E332A",
  activeBg: "#1D3128",
  hoverBg: "#182A22",
  textMuted: "#8CA79A",
  textHover: "#C9DBD1",
  textFaint: "#6F8B7D",
  labelMuted: "#5C7568",
  accent: "#4FCB99",
  accentSoft: "#4C9A79",
  badgeActiveBg: "#2A4235",
  badgeActiveText: "#B7E4CC",
  cardBg: "#16261F",
  cardBorder: "#22392D",
  cardBorderHover: "#2E4A3B",
  iconBoxBg: "#1E3A2C",
  nameText: "#DCE7E0",
  white: "#FFFFFF",
};

function SidebarNavButton({ item, active, collapsed, onClick }) {
  const [hover, setHover] = useState(false);
  const Icon = item.icon;
  const textColor = active ? SB.white : hover ? SB.textHover : SB.textMuted;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? item.label : undefined}
      style={{ backgroundColor: active ? SB.activeBg : hover ? SB.hoverBg : "transparent", color: textColor }}
      className={`relative w-full flex items-center gap-3 rounded-lg text-sm transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"} ${active ? "font-medium" : ""}`}
    >
      {active && <span style={{ backgroundColor: SB.accent }} className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full" />}
      <Icon size={17} strokeWidth={2} className="shrink-0" style={{ color: textColor }} />
      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
      {!collapsed && item.count != null && (
        <span
          style={{ backgroundColor: active ? SB.badgeActiveBg : "transparent", color: active ? SB.badgeActiveText : SB.textFaint }}
          className="text-xs px-1.5 py-0.5 rounded-full"
        >
          {item.count}
        </span>
      )}
    </button>
  );
}

function SidebarActionButton({ icon: Icon, label, collapsed, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? label : undefined}
      style={{ color: hover ? SB.textHover : SB.textMuted, backgroundColor: hover ? SB.hoverBg : "transparent" }}
      className={`w-full flex items-center gap-3 rounded-lg text-sm transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}`}
    >
      <Icon size={17} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function SmartQueueCard({ pendingDocs, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ backgroundColor: SB.cardBg, borderColor: hover ? SB.cardBorderHover : SB.cardBorder }}
      className="w-full text-left mt-5 rounded-xl border p-4 transition-colors"
    >
      <div style={{ backgroundColor: SB.iconBoxBg, color: SB.accent }} className="w-8 h-8 rounded-lg flex items-center justify-center mb-3">
        <Sparkles size={15} />
      </div>
      <div style={{ color: SB.white }} className="text-sm font-semibold leading-tight">{pendingDocs} documents pending</div>
      <div style={{ color: SB.textFaint }} className="text-xs mt-1 leading-snug">AI-prioritized review queue</div>
      <div style={{ color: SB.accent }} className="text-xs font-medium mt-2.5 inline-flex items-center gap-1">Open review <ArrowRight size={12} /></div>
    </button>
  );
}

function Sidebar({ collapsed, setCollapsed, view, setView, onReset, setDocPriority }) {
  const pendingDocs = DOCUMENTS.length;
  return (
    <aside
      style={{ width: collapsed ? 68 : 240, backgroundColor: SB.bg }}
      className="shrink-0 flex flex-col transition-all duration-200 relative"
    >
      <div style={{ borderColor: SB.border }} className={`flex items-center gap-2.5 px-4 h-16 border-b ${collapsed ? "px-0 justify-center" : ""}`}>
        <div style={{ backgroundColor: SB.accentSoft, color: SB.white }} className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0">S</div>
        {!collapsed && (
          <div className="min-w-0">
            <div style={{ color: SB.white }} className="text-sm font-semibold leading-tight truncate">StyleSphere</div>
            <div style={{ color: SB.textFaint }} className="text-xs tracking-wide leading-tight">ADMIN PORTAL</div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        {!collapsed && <div style={{ color: SB.labelMuted }} className="px-2.5 text-xs font-semibold tracking-wider uppercase mb-2">Manage</div>}
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarNavButton key={item.id} item={item} active={view === item.id} collapsed={collapsed} onClick={() => setView(item.id)} />
          ))}
        </nav>

        {!collapsed && (
          <SmartQueueCard pendingDocs={pendingDocs} onClick={() => { setDocPriority(true); setView("documents"); }} />
        )}
      </div>

      <div style={{ borderColor: SB.border }} className="px-2.5 py-3 border-t space-y-0.5">
        <SidebarActionButton icon={Settings} label="Settings" collapsed={collapsed} />
        <SidebarActionButton icon={RotateCcw} label="Reset demo data" collapsed={collapsed} onClick={onReset} />
        <div style={{ borderColor: SB.border }} className="pt-1.5 mt-1 border-t">
          <SidebarActionButton icon={PanelLeft} label="Collapse sidebar" collapsed={collapsed} onClick={() => setCollapsed(!collapsed)} />
        </div>
        <div className={`flex items-center gap-2.5 mt-2 pt-2 ${collapsed ? "justify-center" : "px-3"}`}>
          <div style={{ backgroundColor: SB.accentSoft, color: SB.white }} className="w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center shrink-0">SC</div>
          {!collapsed && (
            <div className="min-w-0">
              <div style={{ color: SB.nameText }} className="text-xs font-medium truncate">Sarah Chen</div>
              <div style={{ color: SB.textFaint }} className="text-xs truncate">Super Admin</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* TOPBAR                                                              */
/* ------------------------------------------------------------------ */

function Topbar({ title, portal, setPortal, onSearch }) {
  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-6 gap-4">
      <h1 className="text-base font-semibold text-slate-900 whitespace-nowrap">{title}</h1>
      <div className="flex-1 max-w-md relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          onChange={(e) => onSearch && onSearch(e.target.value)}
          placeholder="Search vendors, documents…"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-100 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:bg-white border border-transparent focus:border-emerald-300 transition"
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
          {["Admin", "Supervisor", "Vendor"].map((p) => (
            <button
              key={p}
              onClick={() => setPortal(p)}
              className={`px-3 py-1.5 rounded-md transition-colors ${portal === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <button className="relative w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
        </button>
        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">SC</div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* SHARED: KPI CARD                                                    */
/* ------------------------------------------------------------------ */

function KpiCard({ icon: Icon, value, label, sub, trend, trendDir = "up", tone = "slate", onClick }) {
  const toneMap = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
          <Icon size={17} strokeWidth={2} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendDir === "up" ? "text-emerald-600" : "text-rose-600"}`}>
            {trendDir === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      <div className="mt-3 h-0 group-hover:h-4 overflow-hidden transition-all">
        <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-0.5">View detail <ChevronRight size={11} /></span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* DASHBOARD — chart card w/ filter                                    */
/* ------------------------------------------------------------------ */

function ChartCard({ title, eyebrow, range, setRange, children, right }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{eyebrow}</div>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {right}
          {setRange && (
            <div className="flex bg-slate-100 rounded-md p-0.5 text-xs font-medium">
              {["7d", "30d", "90d"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2 py-1 rounded ${range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function ApprovalTrendChart({ onDrill }) {
  const [range, setRange] = useState("7d");
  const data = range === "7d" ? WEEKLY : range === "30d" ? WEEKLY_30 : WEEKLY_90;
  const deltaLabel = range === "7d" ? "+57% vs prev. 8 weeks" : range === "30d" ? "+18% vs prev. 30 days" : "+22% vs prev. 90 days";
  return (
    <ChartCard
      eyebrow="Approval trend"
      title={`Weekly approvals — last ${range === "7d" ? "8 weeks" : range === "30d" ? "30 days" : "90 days"}`}
      range={range}
      setRange={setRange}
      right={<span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full whitespace-nowrap">↑ {deltaLabel.replace("+"," ").trim()}</span>}
    >
      <div className="h-52 mt-2 -ml-2" onClick={onDrill}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} label={{ value: "Period", position: "insideBottom", offset: -2, fontSize: 10, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={28} label={{ value: "Approvals", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94A3B8" }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
            <Legend verticalAlign="top" height={20} formatter={() => <span style={{ fontSize: 11, color: "#64748B" }}>Vendor approvals</span>} />
            <Line type="monotone" dataKey="approvals" name="Approvals" stroke="#059669" strokeWidth={2.25} dot={{ r: 3, fill: "#059669" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-slate-400 mt-1 cursor-pointer hover:text-emerald-600" onClick={onDrill}>Click chart to view full approvals report →</div>
    </ChartCard>
  );
}

const PIE_COLORS = { Approved: "#059669", Rejected: "#E11D48", Pending: "#D97706" };

function DecisionBreakdownChart({ onDrill }) {
  const [scope, setScope] = useState("All regions");
  const data = [
    { name: "Approved", value: 4 },
    { name: "Rejected", value: 2 },
    { name: "Pending", value: 4 },
  ];
  return (
    <ChartCard
      eyebrow="Approval rate"
      title="Decision breakdown"
      right={
        <div className="relative">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-slate-100 rounded-md pl-2 pr-6 py-1.5 outline-none appearance-none cursor-pointer"
          >
            <option>All regions</option>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      }
    >
      <div className="h-52 mt-2 flex items-center cursor-pointer" onClick={onDrill}>
        <ResponsiveContainer width="60%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
              {data.map((d) => <Cell key={d.name} fill={PIE_COLORS[d.name]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[d.name] }} />
              <span className="text-slate-500 flex-1">{d.name}</span>
              <span className="font-semibold text-slate-800 tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

function CompactFunnel({ onDrill }) {
  const max = FUNNEL[0].count;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Pipeline funnel</div>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">Vendors across onboarding stages</div>
        </div>
        <button onClick={onDrill} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 shrink-0">
          Full pipeline <ChevronRight size={12} />
        </button>
      </div>
      <div className="space-y-2">
        {FUNNEL.map((f) => (
          <button key={f.stage} onClick={onDrill} className="w-full flex items-center gap-3 group">
            <span className="text-xs text-slate-500 text-left truncate" style={{ width: 110 }}>{f.stage}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full group-hover:bg-emerald-600 transition-colors"
                style={{ width: `${(f.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 w-6 text-right tabular-nums">{f.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI INSIGHTS PANEL                                                    */
/* ------------------------------------------------------------------ */

function parseNLQuery(q) {
  const query = q.toLowerCase();
  let stage = null;
  if (query.includes("doc review") || query.includes("document review")) stage = "Doc Review";
  else if (query.includes("profile submitted")) stage = "Profile Submitted";
  else if (query.includes("invited")) stage = "Invited";
  else if (query.includes("verified")) stage = "Verified";

  let minDays = null;
  const m = query.match(/over (\d+)\s*days?/) || query.match(/more than (\d+)\s*days?/);
  if (m) minDays = parseInt(m[1], 10);

  let region = null;
  for (const r of REGIONS) {
    const key = r.toLowerCase();
    if (query.includes(key) || query.includes(key.split(" ")[0])) { region = r; break; }
  }

  const results = VENDORS.filter((v) => {
    if (stage && v.stage !== stage) return false;
    if (minDays != null && v.daysInStage <= minDays) return false;
    if (region && v.region !== region) return false;
    return true;
  });

  return { stage, minDays, region, results };
}

const NL_SUGGESTIONS = [
  { label: "Stuck in doc review, South Asia", query: "vendors stuck in document review over 5 days in south asia" },
  { label: "Invited, West Africa", query: "vendors invited in west africa" },
  { label: "All verified vendors", query: "verified vendors" },
];

function NLSearchPanel({ onOpenVendor }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = (q) => {
    setQuery(q);
    setLoading(true);
    setSubmitted(null);
    setTimeout(() => {
      setSubmitted(parseNLQuery(q));
      setLoading(false);
    }, 500);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <Sparkles size={15} />
        </div>
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">AI natural-language search</div>
          <div className="text-sm font-semibold text-slate-900">Ask about your vendor pipeline</div>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) run(query); }} className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask in plain English — e.g. vendors stuck in document review over 5 days"
          className="w-full h-11 pl-10 pr-24 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="absolute right-1.5 top-1.5 h-8 px-3 rounded-md bg-violet-600 text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Ask
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <span className="text-xs text-slate-400 mr-0.5">Try:</span>
        {NL_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => run(s.query)}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {submitted && !loading && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-xs text-slate-400">AI understood:</span>
            {submitted.stage && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">stage: {submitted.stage}</span>}
            {submitted.minDays != null && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">over {submitted.minDays} days in stage</span>}
            {submitted.region && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">region: {submitted.region}</span>}
            {!submitted.stage && submitted.minDays == null && !submitted.region && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">no specific filters detected</span>}
          </div>

          {submitted.results.length > 0 ? (
            <div className="space-y-1.5">
              {submitted.results.map((v) => (
                <button key={v.id} onClick={() => onOpenVendor(v)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-left transition-colors">
                  <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold flex items-center justify-center shrink-0">{v.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-800 truncate">{v.name} <span className="text-slate-400 font-normal">— {v.company}</span></div>
                    <div className="text-xs text-slate-400 mt-0.5">{v.stage} · {v.region}</div>
                  </div>
                  <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5 shrink-0">{v.daysInStage}d</span>
                  <ChevronRight size={14} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 px-4 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500">No vendors match that combination — try broadening the region or timeframe.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnomalyPanel({ onOpenVendor }) {
  const flagged = VENDORS.filter((v) => v.risk !== "low");
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={14} className="text-rose-600" />
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Anomaly &amp; fraud detection</div>
      </div>
      <div className="space-y-2">
        {flagged.map((v) => (
          <button key={v.id} onClick={() => onOpenVendor(v)} className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 text-left">
            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${v.risk === "high" ? "bg-rose-500" : "bg-amber-500"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-800 truncate">{v.name} · {v.company}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {v.risk === "high" ? "Multiple risk signals detected — recommend priority review." : "Minor inconsistency flagged for review."}
              </div>
            </div>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${v.risk === "high" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>{v.risk}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DASHBOARD VIEW                                                       */
/* ------------------------------------------------------------------ */

function SmartQueueWidget({ setView, setDocPriority }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Smart queue</div>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">Today's review queue — prioritized by AI risk &amp; SLA, not FIFO</div>
        </div>
        <button
          onClick={() => { setDocPriority(true); setView("documents"); }}
          className="text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 inline-flex items-center gap-1.5 shrink-0"
        >
          <Zap size={13} /> Start review
        </button>
      </div>
      <div className="mt-3 divide-y divide-slate-100">
        {[...DOCUMENTS].sort((a, b) => (b.risk === "high") - (a.risk === "high") || b.ageDays - a.ageDays).slice(0, 4).map((d) => (
          <div key={d.id} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={15} className="text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-slate-800 truncate">{d.title}</div>
                <div className="text-xs text-slate-400 truncate">{d.vendor} · {d.company}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ConfidenceBadge confidence={d.confidence} risk={d.risk} />
              <kbd className="hidden md:inline text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">A / R</kbd>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-400 mt-2">Tip: split-pane review supports keyboard shortcuts (A approve, R reject, ↓ next) for high-volume days.</div>
    </div>
  );
}

function DashboardView({ setView, openVendor, setDocPriority }) {
  return (
    <div className="p-6 space-y-6">
      {/* Primary KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={Users} value="12" label="Total vendors" sub="+3 this week" trend="+3" tone="slate" onClick={() => setView("vendors")} />
        <KpiCard icon={Clock} value="4" label="Pending review" sub="5 docs queued" trend="On track" tone="amber" onClick={() => setView("documents")} />
        <KpiCard icon={CheckCircle2} value="4" label="Approved this month" sub="33% approval rate" trend="+12%" tone="emerald" onClick={() => setView("vendors")} />
        <KpiCard icon={Zap} value="2.4d" label="Avg. turnaround" sub="↓ 0.6d vs last month" trend="-0.6d" trendDir="up" tone="sky" onClick={() => setView("vendors")} />
      </div>

      {/* Daily work: speed-oriented queue + at-a-glance decision mix */}
      <div className="grid grid-cols-3 gap-4 items-stretch">
        <div className="col-span-2"><SmartQueueWidget setView={setView} setDocPriority={setDocPriority} /></div>
        <DecisionBreakdownChart onDrill={() => setView("activity")} />
      </div>

      {/* Trends & pipeline oversight */}
      <div className="grid grid-cols-3 gap-4 items-stretch">
        <div className="col-span-2"><ApprovalTrendChart onDrill={() => setView("activity")} /></div>
        <CompactFunnel onDrill={() => setView("vendors")} />
      </div>

      {/* AI-assisted oversight */}
      <div className="grid grid-cols-3 gap-4 items-stretch">
        <div className="col-span-2"><NLSearchPanel onOpenVendor={openVendor} /></div>
        <AnomalyPanel onOpenVendor={openVendor} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GENERIC DATA TABLE (sort, filter, multiselect, bulk actions, pages) */
/* ------------------------------------------------------------------ */

function useSortedFilteredPaged(data, { sortKey, sortDir, filters, search, searchKeys, pageSize, page }) {
  return useMemo(() => {
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => searchKeys.some((k) => String(r[k]).toLowerCase().includes(q)));
    }
    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== "All") rows = rows.filter((r) => String(r[key]) === val);
    });
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    return { pageRows, total };
  }, [data, sortKey, sortDir, filters, search, searchKeys, pageSize, page]);
}

function SortHeader({ label, sortKey, active, dir, onSort }) {
  return (
    <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 hover:text-slate-700">
      {label}
      {active ? (dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ChevronsUpDown size={11} className="text-slate-300" />}
    </button>
  );
}

function VendorsListView({ openVendor }) {
  const [sortKey, setSortKey] = useState("submitted");
  const [sortDir, setSortDir] = useState("desc");
  const [filters, setFilters] = useState({ stage: "All", category: "All", status: "All" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [decided, setDecided] = useState({});
  const pageSize = 6;

  const decide = (id, action) => setDecided({ ...decided, [id]: action });
  const effectiveStatus = (v) => (decided[v.id] === "approve" ? "Approved" : decided[v.id] === "reject" ? "Rejected" : v.status);
  const isActionable = (v) => !decided[v.id] && (v.status === "In Review" || v.status === "Pending");

  const onSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const { pageRows, total } = useSortedFilteredPaged(VENDORS, {
    sortKey, sortDir, filters, search, searchKeys: ["name", "company"], pageSize, page,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPageSelected) pageRows.forEach((r) => next.delete(r.id));
    else pageRows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const [toast, setToast] = useState(null);
  const bulk = (action) => {
    setToast(`${action} applied to ${selected.size} vendor${selected.size !== 1 ? "s" : ""}.`);
    setSelected(new Set());
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Filter by name or company" className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 w-56" />
        </div>
        {[
          { key: "stage", options: ["All", "Invited", "Profile Submitted", "Doc Review", "Profile Approved", "Products Pending", "Verified"] },
          { key: "category", options: ["All", "Bags", "Shoes", "Apparels", "Accessories", "Watches", "Jewelry"] },
          { key: "status", options: ["All", "Approved", "Rejected", "In Review", "Pending", "Invited", "Verified"] },
        ].map((f) => (
          <div key={f.key} className="relative">
            <select
              value={filters[f.key]}
              onChange={(e) => { setFilters({ ...filters, [f.key]: e.target.value }); setPage(1); }}
              className="h-8 pl-2.5 pr-6 rounded-lg border border-slate-200 text-xs text-slate-600 outline-none appearance-none cursor-pointer capitalize bg-white"
            >
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        ))}
        <button
          onClick={() => { setFilters({ stage: "All", category: "All", status: "All" }); setSearch(""); setPage(1); }}
          className="h-8 px-2.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1"
        >
          <SlidersHorizontal size={12} /> Reset
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button className="h-8 px-2.5 rounded-lg text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-xs">
          <span className="font-medium">{selected.size} selected</span>
          <div className="h-4 w-px bg-slate-700" />
          <button onClick={() => bulk("Approve")} className="inline-flex items-center gap-1 hover:text-emerald-400"><Check size={12} /> Bulk approve</button>
          <button onClick={() => bulk("Reject")} className="inline-flex items-center gap-1 hover:text-rose-400"><X size={12} /> Bulk reject</button>
          <button onClick={() => bulk("Assign")} className="inline-flex items-center gap-1 hover:text-sky-400"><UserCog size={12} /> Assign</button>
          <button onClick={() => bulk("Export")} className="inline-flex items-center gap-1 hover:text-slate-300"><Download size={12} /> Export</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-white">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="w-10 py-2.5 pl-4"><input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="rounded border-slate-300" /></th>
              <th className="text-left py-2.5 px-2"><SortHeader label="Vendor" sortKey="name" active={sortKey === "name"} dir={sortDir} onSort={onSort} /></th>
              <th className="text-left py-2.5 px-2"><SortHeader label="Company" sortKey="company" active={sortKey === "company"} dir={sortDir} onSort={onSort} /></th>
              <th className="text-left py-2.5 px-2">Category</th>
              <th className="text-left py-2.5 px-2"><SortHeader label="Stage" sortKey="stage" active={sortKey === "stage"} dir={sortDir} onSort={onSort} /></th>
              <th className="text-left py-2.5 px-2">Status</th>
              <th className="text-left py-2.5 px-2"><SortHeader label="Docs" sortKey="docs" active={sortKey === "docs"} dir={sortDir} onSort={onSort} /></th>
              <th className="text-left py-2.5 px-2">Supervisor</th>
              <th className="text-left py-2.5 px-2"><SortHeader label="Submitted" sortKey="submitted" active={sortKey === "submitted"} dir={sortDir} onSort={onSort} /></th>
              <th className="text-left py-2.5 px-2">Actions</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((v) => (
              <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 group">
                <td className="pl-4 py-2.5"><input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleOne(v.id)} className="rounded border-slate-300" /></td>
                <td className="px-2 py-2.5">
                  <button onClick={() => openVendor(v)} className="flex items-center gap-2 text-left">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center shrink-0">{v.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</span>
                    <span className="font-medium text-slate-800 group-hover:text-emerald-700">{v.name}</span>
                    {v.risk !== "low" && <AlertTriangle size={12} className={v.risk === "high" ? "text-rose-500" : "text-amber-500"} />}
                  </button>
                </td>
                <td className="px-2 py-2.5 text-slate-500">{v.company}</td>
                <td className="px-2 py-2.5"><CategoryTag category={v.category} /></td>
                <td className="px-2 py-2.5 text-slate-600">{v.stage}</td>
                <td className="px-2 py-2.5"><StatusBadge status={effectiveStatus(v)} /></td>
                <td className="px-2 py-2.5 text-slate-500 tabular-nums">{v.docs}</td>
                <td className="px-2 py-2.5 text-slate-500">{v.supervisor}</td>
                <td className="px-2 py-2.5 text-slate-400 text-xs">{v.submitted}</td>
                <td className="px-2 py-2.5">
                  {isActionable(v) ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); decide(v.id, "approve"); }}
                        title="Approve"
                        className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 flex items-center justify-center"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); decide(v.id, "reject"); }}
                        title="Reject"
                        className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="pr-3 text-right">
                  <button onClick={() => openVendor(v)} className="text-slate-300 group-hover:text-slate-500"><ChevronRight size={15} /></button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={11} className="text-center py-10 text-sm text-slate-400">No vendors match the current filters.</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="w-7 h-7 rounded-md border border-slate-200 disabled:opacity-40 flex items-center justify-center hover:bg-slate-50"><ChevronLeft size={13} /></button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-md text-xs font-medium ${page === i + 1 ? "bg-slate-900 text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}>{i + 1}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="w-7 h-7 rounded-md border border-slate-200 disabled:opacity-40 flex items-center justify-center hover:bg-slate-50"><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

const KANBAN_STAGES = ["Invited", "Profile Submitted", "Doc Review", "Profile Approved", "Products Pending", "Verified"];

function VendorsKanbanView({ openVendor }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {KANBAN_STAGES.map((stage) => {
        const items = VENDORS.filter((v) => v.stage === stage);
        return (
          <div key={stage} className="w-64 shrink-0">
            <div className="flex items-center gap-2 mb-2.5 px-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">{stage}</span>
              <span className="text-xs text-slate-400 ml-auto">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((v) => (
                <button key={v.id} onClick={() => openVendor(v)} className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">{v.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{v.name}</div>
                      <div className="text-xs text-slate-400 truncate">{v.company}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <CategoryTag category={v.category} />
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(parseInt(v.docs) / 6) * 100}%` }} />
                  </div>
                </button>
              ))}
              {items.length === 0 && <div className="text-xs text-slate-300 text-center py-4 border border-dashed border-slate-200 rounded-lg">Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VendorsView({ openVendor }) {
  const [mode, setMode] = useState("list");
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Vendor pipeline</h2>
          <p className="text-sm text-slate-500">12 vendors across 6 stages</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
          <button onClick={() => setMode("kanban")} className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${mode === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}><KanbanIcon size={13} /> Kanban</button>
          <button onClick={() => setMode("list")} className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${mode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}><ListIcon size={13} /> List</button>
        </div>
      </div>
      {mode === "kanban" ? <VendorsKanbanView openVendor={openVendor} /> : <VendorsListView openVendor={openVendor} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DOCUMENTS VIEW — AI confidence, smart priority, split-pane review    */
/* ------------------------------------------------------------------ */

function DocumentMock({ doc }) {
  const flagged = !!doc.flag;
  const ringColor = doc.risk === "high" ? "ring-rose-300" : "ring-amber-300";
  const dotColor = doc.risk === "high" ? "bg-rose-500" : "bg-amber-500";
  const fields = [
    { label: "Registration No.", isFlagged: true },
    { label: "Issuing Authority", isFlagged: false },
    { label: "Issue Date", isFlagged: false },
    { label: "Valid Until", isFlagged: false },
  ];
  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col" style={{ aspectRatio: "3 / 4" }}>
      <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
          <ShieldCheck size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-400">Official document</div>
          <div className="text-sm font-semibold text-slate-700 leading-snug truncate">{doc.title}</div>
        </div>
      </div>
      <div className="space-y-1.5 mb-4">
        {[95, 88, 100, 70, 92, 55].map((w, i) => (
          <div key={i} className="h-2 rounded bg-slate-100" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields.map((f, i) => (
          <div key={i} className={`relative ${flagged && f.isFlagged ? `ring-2 ${ringColor} ring-offset-2 rounded-md p-1 -m-1` : ""}`}>
            {flagged && f.isFlagged && (
              <span className={`absolute -top-2 -right-2 w-4 h-4 rounded-full ${dotColor} text-white flex items-center justify-center`}>
                <AlertTriangle size={10} />
              </span>
            )}
            <div className="text-xs text-slate-400">{f.label}</div>
            <div className="h-2 rounded bg-slate-100 mt-1" style={{ width: "75%" }} />
          </div>
        ))}
      </div>
      <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-100">
        <div>
          <svg width="70" height="24" viewBox="0 0 70 24" className="text-slate-300">
            <path d="M2 18 Q10 4 18 16 T34 12 T50 18 T66 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div className="text-xs text-slate-400 mt-1">Authorized signatory</div>
        </div>
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300" style={{ transform: "rotate(-8deg)" }}>
          <CheckCircle2 size={20} />
        </div>
      </div>
    </div>
  );
}

function DocumentsView({ docPriority, setDocPriority }) {
  const [activeId, setActiveId] = useState(DOCUMENTS[0].id);
  const [decided, setDecided] = useState({});

  const ordered = useMemo(() => {
    if (!docPriority) return DOCUMENTS;
    return [...DOCUMENTS].sort((a, b) => {
      const riskRank = { high: 0, medium: 1, low: 2 };
      if (riskRank[a.risk] !== riskRank[b.risk]) return riskRank[a.risk] - riskRank[b.risk];
      return b.ageDays - a.ageDays;
    });
  }, [docPriority]);

  const active = DOCUMENTS.find((d) => d.id === activeId) || ordered[0];
  const decide = (id, action) => setDecided({ ...decided, [id]: action });
  const pendingCount = DOCUMENTS.filter((d) => !decided[d.id]).length;

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Document queue</h2>
          <p className="text-sm text-slate-500">{pendingCount} documents awaiting review</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
          <input type="checkbox" checked={docPriority} onChange={(e) => setDocPriority(e.target.checked)} className="rounded border-slate-300" />
          <Sparkles size={13} className="text-violet-600" /> AI-prioritized (risk &amp; SLA)
        </label>
      </div>

      <div className="flex-1 grid grid-cols-5 gap-4 min-h-0">
        {/* Queue list */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="divide-y divide-slate-100 overflow-y-auto">
            {ordered.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setActiveId(d.id)}
                className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors ${active?.id === d.id ? "bg-emerald-50/60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText size={15} className="text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate flex items-center gap-1.5">
                        {docPriority && i === 0 && <span className="text-xs font-semibold bg-slate-900 text-white px-1.5 py-0.5 rounded">TOP PRIORITY</span>}
                        {d.title}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{d.vendor} · {d.company}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{d.pages} pages · submitted {d.submitted}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ConfidenceBadge confidence={d.confidence} risk={d.risk} />
                    {decided[d.id] && <StatusBadge status={decided[d.id] === "approve" ? "Approved" : "Rejected"} />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Split-pane preview & AI panel */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          {active && (
            <>
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{active.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{active.vendor} · {active.company}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => decide(active.id, "reject")} className="w-9 h-9 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center"><X size={16} /></button>
                  <button onClick={() => decide(active.id, "approve")} className="w-9 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center"><Check size={16} /></button>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 min-h-0">
                <div className="bg-slate-50 flex flex-col items-center justify-center border-r border-slate-100 p-6 gap-3">
                  <DocumentMock doc={active} />
                  {active.pages > 1 && (
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: active.pages }).map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-slate-600" : "bg-slate-300"}`} />
                      ))}
                      <span className="text-xs text-slate-400 ml-1">Page 1 of {active.pages}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 overflow-y-auto space-y-4">
                  <div className={`rounded-lg p-3.5 ${active.flag ? RISK_STYLE[active.risk] : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"}`}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
                      <Sparkles size={13} /> AI verification — {active.confidence}% confidence
                    </div>
                    <p className="text-xs leading-relaxed">
                      {active.flag ? active.flag : "No inconsistencies detected. Document format, issuer details, and metadata are consistent with prior verified submissions from this region."}
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Checklist</div>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      <li className="flex items-center gap-2"><Check size={12} className="text-emerald-600" /> Issuer signature detected</li>
                      <li className="flex items-center gap-2"><Check size={12} className="text-emerald-600" /> Expiry date within range</li>
                      <li className="flex items-center gap-2">{active.confidence > 80 ? <Check size={12} className="text-emerald-600" /> : <AlertTriangle size={12} className="text-amber-500" />} Name matches vendor profile</li>
                    </ul>
                  </div>
                  <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">Keyboard: <kbd className="border border-slate-200 rounded px-1">A</kbd> approve · <kbd className="border border-slate-200 rounded px-1">R</kbd> reject · <kbd className="border border-slate-200 rounded px-1">↓</kbd> next document</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PRODUCTS VIEW                                                        */
/* ------------------------------------------------------------------ */

function ImageCarousel({ images, alt }) {
  const scrollRef = useRef(null);
  const scrollByAmount = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 260, behavior: "smooth" });
    }
  };
  return (
    <div className="relative group/carousel mb-3">
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2.5 overflow-x-auto scroll-smooth rounded-lg"
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="shrink-0 rounded-lg overflow-hidden bg-slate-100"
            style={{ flex: "0 0 32%", aspectRatio: "1 / 1" }}
          >
            <img
              src={`${src}?w=500&h=500&fit=crop&auto=format&q=80`}
              alt={`${alt} — photo ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            onClick={() => scrollByAmount(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronLeft size={15} className="text-slate-600" />
          </button>
          <button
            onClick={() => scrollByAmount(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronRight size={15} className="text-slate-600" />
          </button>
        </>
      )}
      <span className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">{images.length} photos</span>
    </div>
  );
}

function ProductsView() {
  const [decided, setDecided] = useState({});
  const decide = (id, action) => setDecided({ ...decided, [id]: action });
  return (
    <div className="p-6 space-y-4">
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Product verification</h2>
        <p className="text-sm text-slate-500">{PRODUCTS.filter(p=>!decided[p.id]).length} products submitted for review</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <ImageCarousel images={p.images} alt={p.name} />
            {p.flag && (
              <div className={`flex items-start gap-2 rounded-lg p-2.5 mb-3 text-xs ${RISK_STYLE[p.risk]}`}>
                <Sparkles size={13} className="mt-0.5 shrink-0" />
                <span>{p.flag}</span>
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.vendor} · {p.company}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <CategoryTag category={p.category} />
                  <span className="text-xs text-slate-400">{p.submitted} · {p.photos} photos</span>
                </div>
              </div>
            </div>
            {decided[p.id] ? (
              <StatusBadge status={decided[p.id] === "approve" ? "Approved" : "Rejected"} />
            ) : (
              <div className="flex gap-2">
                <button onClick={() => decide(p.id, "reject")} className="flex-1 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 inline-flex items-center justify-center gap-1.5">
                  <X size={14} /> Reject
                </button>
                <button onClick={() => decide(p.id, "approve")} className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 inline-flex items-center justify-center gap-1.5">
                  <Check size={14} /> Approve
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TEAM VIEW                                                            */
/* ------------------------------------------------------------------ */

function TeamView() {
  const [execSearch, setExecSearch] = useState("");
  const [execRegion, setExecRegion] = useState("All");

  const filteredExecs = VENDOR_EXECS.filter((e) => {
    if (execRegion !== "All" && e.region !== execRegion) return false;
    if (execSearch) {
      const q = execSearch.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.company.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Team &amp; roles</h2>
          <p className="text-sm text-slate-500">Manage admin and super-admin access</p>
        </div>
        <button className="h-9 px-3.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 inline-flex items-center gap-1.5">
          <Users size={14} /> Invite admin
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={UserCog} value="4" label="Total admins" tone="slate" />
        <KpiCard icon={KeyRound} value="1" label="Super admins" tone="emerald" />
        <KpiCard icon={Activity} value="46" label="Decisions this month" tone="sky" />
        <KpiCard icon={TrendingUp} value="3.4" label="Avg. decisions / day" tone="amber" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold tracking-wide text-slate-400 uppercase">Admin members</div>
        <table className="w-full text-sm">
          <tbody>
            {TEAM.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                <td className="py-3 pl-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center">{t.name.split(" ").map(p=>p[0]).join("")}</span>
                    <div>
                      <div className="font-medium text-slate-800 flex items-center gap-2">{t.name} <span className={`text-xs px-1.5 py-0.5 rounded ${t.role === "Super Admin" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{t.role}</span></div>
                      <div className="text-xs text-slate-400">{t.region}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right text-emerald-600 font-semibold tabular-nums">{t.approved}<div className="text-xs font-normal text-slate-400">Approved</div></td>
                <td className="text-right text-rose-600 font-semibold tabular-nums pl-6">{t.rejected}<div className="text-xs font-normal text-slate-400">Rejected</div></td>
                <td className="pl-6 w-40">
                  <div className="text-right text-sm font-semibold text-slate-800">{t.rate}%</div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.rate}%` }} /></div>
                </td>
                <td className="w-10 pr-3 text-right"><button className="text-slate-300 hover:text-slate-500"><MoreVertical size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Vendor executive contacts</div>
            <div className="text-xs text-slate-400 mt-0.5">Key people at partner companies you coordinate with</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={execSearch}
                onChange={(e) => setExecSearch(e.target.value)}
                placeholder="Search name or company"
                className="h-8 pl-7 pr-3 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 w-48"
              />
            </div>
            <div className="relative">
              <select
                value={execRegion}
                onChange={(e) => setExecRegion(e.target.value)}
                className="h-8 pl-2.5 pr-6 rounded-lg border border-slate-200 text-xs text-slate-600 outline-none appearance-none cursor-pointer bg-white"
              >
                <option>All</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-100">
          {filteredExecs.map((e) => (
            <div key={e.id} className="bg-white p-4 flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold flex items-center justify-center shrink-0">{e.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 truncate">{e.name}</div>
                <div className="text-xs text-slate-500 truncate">{e.title} · {e.company}</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <a href={`mailto:${e.email}`} className="text-xs text-slate-400 hover:text-emerald-600 inline-flex items-center gap-1 truncate">
                    <Mail size={11} className="shrink-0" /> <span className="truncate">{e.email}</span>
                  </a>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Phone size={11} className="shrink-0" /> {e.phone}</span>
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1"><MapPin size={11} className="shrink-0" /> {e.region}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredExecs.length === 0 && (
            <div className="col-span-2 text-center py-10 text-sm text-slate-400 bg-white">No contacts match the current filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ACTIVITY VIEW                                                        */
/* ------------------------------------------------------------------ */

function ActivityView() {
  const [filter, setFilter] = useState("All");
  const rows = filter === "All" ? ACTIVITY : ACTIVITY.filter((a) => a.type === filter);
  const iconFor = (action) => action === "Approved" || action === "Verified" ? CheckCircle2 : action === "Rejected" ? XCircle : action === "Submitted" ? FileText : Users;
  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Activity log</h2>
        <p className="text-sm text-slate-500">All decisions, submissions and status changes</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Recent activity · {rows.length} entries</span>
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            {["All", "Approvals", "Rejections", "Submissions"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {rows.map((a) => {
            const Icon = iconFor(a.action);
            const tone = a.action === "Approved" || a.action === "Verified" ? "text-emerald-600 bg-emerald-50" : a.action === "Rejected" ? "text-rose-600 bg-rose-50" : a.action === "Submitted" ? "text-sky-600 bg-sky-50" : "text-violet-600 bg-violet-50";
            return (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tone}`}><Icon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-800"><span className="font-medium">{a.actor}</span> <span className="text-slate-400">—</span> {a.target} <StatusBadge status={a.action} /></div>
                  {a.reason && <div className="text-xs text-slate-400 mt-0.5">Reason: {a.reason}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-600">{a.by}</div>
                  <div className="text-xs text-slate-400">{a.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VENDOR DETAIL SLIDE-OVER — AI summary                                */
/* ------------------------------------------------------------------ */

function aiSummaryFor(v) {
  const docsDone = parseInt(v.docs);
  const bits = [];
  bits.push(`${v.company} is currently in the ${v.stage} stage with ${v.docs} required documents submitted.`);
  if (v.risk === "high") bits.push("AI risk scoring flags this vendor as high priority — multiple inconsistencies were detected across submitted documents and should be reviewed before further approvals.");
  else if (v.risk === "medium") bits.push("A minor inconsistency was flagged during automated review; recommend a manual check before proceeding.");
  else bits.push("No anomalies were detected in this vendor's submissions.");
  if (v.daysInStage >= 5) bits.push(`This vendor has been in its current stage for ${v.daysInStage} days, approaching the review SLA — consider prioritizing.`);
  if (docsDone < 6 && v.stage !== "Invited") bits.push(`${6 - docsDone} document${6 - docsDone !== 1 ? "s" : ""} still required to complete profile approval.`);
  return bits.join(" ");
}

const DOC_TEMPLATE = ["Company Registration Certificate", "IEC Import / Export Code Licence", "GST / VAT Certificate", "ISO Quality Certificate", "Bank Account Verification Letter", "Supplier Code of Conduct Sign-off"];

function VendorStepper({ stage }) {
  const idx = KANBAN_STAGES.indexOf(stage);
  return (
    <div className="flex items-start">
      {KANBAN_STAGES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center" style={{ width: 96 }}>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                  ${done ? "bg-emerald-500 text-white" : current ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`}
              >
                {done ? <Check size={15} /> : i + 1}
              </div>
              <div className={`text-xs text-center mt-2 leading-snug ${current ? "text-slate-900 font-medium" : "text-slate-500"}`}>{s}</div>
            </div>
            {i < KANBAN_STAGES.length - 1 && (
              <div className={`h-0.5 flex-1 ${i < idx ? "bg-emerald-500" : "bg-slate-200"}`} style={{ marginTop: 18 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function VendorDetailView({ vendor, onBack }) {
  const [decision, setDecision] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  if (!vendor) return null;

  const docsDone = parseInt(vendor.docs);
  const products = PRODUCTS.filter((p) => p.vendor === vendor.name);
  const effectiveStatus = decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : vendor.status;
  const canDecide = !decision && (vendor.status === "In Review" || vendor.status === "Pending");
  const pct = Math.round((docsDone / 6) * 100);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{vendor.name}</h2>
              <StatusBadge status={effectiveStatus} />
            </div>
            <p className="text-sm text-slate-500">{vendor.id?.toUpperCase() || vendor.company} · {vendor.company} · {vendor.region}</p>
          </div>
        </div>
        <div className="shrink-0"><StatusBadge status={effectiveStatus} /></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase mb-4">Onboarding stage</div>
        <VendorStepper stage={vendor.stage} />
      </div>

      <div className="rounded-xl bg-violet-50 ring-1 ring-inset ring-violet-200 p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 mb-1.5"><Sparkles size={13} /> AI summary</div>
        <p className="text-xs text-violet-900 leading-relaxed">{aiSummaryFor(vendor)}</p>
      </div>

      <div className="grid grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase mb-4">Vendor information</div>
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
              <span className="w-11 h-11 rounded-full bg-violet-100 text-violet-700 font-semibold flex items-center justify-center shrink-0">{vendor.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</span>
              <div>
                <div className="text-sm font-semibold text-slate-900">{vendor.name}</div>
                <div className="text-xs text-slate-500">{vendor.company}</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs inline-flex items-center gap-1.5"><Package size={13} /> Category</span>
                <CategoryTag category={vendor.category} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs inline-flex items-center gap-1.5"><MapPin size={13} /> Region</span>
                <span className="text-slate-700">{vendor.region}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs inline-flex items-center gap-1.5"><UserCog size={13} /> Supervisor</span>
                <span className="text-slate-700">{vendor.supervisor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs inline-flex items-center gap-1.5"><Clock size={13} /> Submitted</span>
                <span className="text-slate-700">{vendor.submitted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs inline-flex items-center gap-1.5"><FileText size={13} /> Docs stage</span>
                <span className="text-slate-700">{vendor.stage}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Sample products</div>
              <span className="text-xs text-slate-400">{products.length} product{products.length !== 1 ? "s" : ""} submitted</span>
            </div>
            {products.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {products.map((p) => (
                  <div key={p.id} className="rounded-lg overflow-hidden bg-slate-100" style={{ aspectRatio: "1 / 1" }}>
                    <img src={`${p.images[0]}?w=300&h=300&fit=crop&auto=format&q=80`} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-6 justify-center border border-dashed border-slate-200 rounded-lg">
                <Package size={14} /> No products submitted for this vendor yet
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Documents</div>
            <div className="text-right">
              <div className="text-lg font-semibold text-slate-900 leading-none">{pct}%</div>
              <div className="text-xs text-slate-400">complete</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-800 mb-2">{docsDone} of 6 submitted</div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="space-y-2">
            {DOC_TEMPLATE.map((doc, i) => {
              const done = i < docsDone;
              return (
                <div key={doc} className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 ${done ? "bg-emerald-50/60 ring-1 ring-inset ring-emerald-100" : "bg-slate-50"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"}`}>
                      {done ? <Check size={12} /> : <Clock size={11} />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{doc}</div>
                      <div className="text-xs text-slate-400">{done ? "Submitted · reviewed after final submission" : "Not yet submitted"}</div>
                    </div>
                  </div>
                  {done && (
                    <button onClick={() => setDocPreview(doc)} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white shrink-0">
                      Preview
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {canDecide && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between sticky bottom-4 shadow-lg">
          <span className="text-sm text-slate-500">Ready to make a decision on this vendor?</span>
          <div className="flex gap-2">
            <button onClick={() => setDecision("reject")} className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 inline-flex items-center gap-1.5">
              <X size={14} /> Reject
            </button>
            <button onClick={() => setDecision("approve")} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 inline-flex items-center gap-1.5">
              <Check size={14} /> Approve
            </button>
          </div>
        </div>
      )}

      {docPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setDocPreview(null)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <DocumentMock doc={{ title: docPreview, risk: "low", flag: null }} />
            <button onClick={() => setDocPreview(null)} className="mt-3 w-full h-9 rounded-lg bg-white text-sm text-slate-600 hover:bg-slate-50">Close preview</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* APP                                                                  */
/* ------------------------------------------------------------------ */

const TITLES = { dashboard: "Overview", vendors: "Vendors", documents: "Documents", products: "Products", team: "Team", activity: "Activity", vendorDetail: "Vendor detail" };

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState("dashboard");
  const [previousView, setPreviousView] = useState("vendors");
  const [portal, setPortal] = useState("Admin");
  const [docPriority, setDocPriority] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [toast, setToast] = useState(null);

  const openVendor = useCallback((v) => {
    setSelectedVendor(v);
    setPreviousView((curr) => (curr === "vendorDetail" ? curr : view));
    setView("vendorDetail");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  const handleReset = () => {
    setResetSignal((n) => n + 1);
    setToast("Demo data reset — all decisions cleared.");
    setTimeout(() => setToast(null), 2200);
  };
  const navigate = (nextView) => {
    if (nextView !== "vendorDetail") setPreviousView(nextView);
    setView(nextView);
  };

  return (
    <div className="w-full h-screen flex bg-slate-50 text-slate-900 font-sans" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} view={view === "vendorDetail" ? "vendors" : view} setView={navigate} onReset={handleReset} setDocPriority={setDocPriority} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={TITLES[view]} portal={portal} setPortal={setPortal} />
        <main className="flex-1 overflow-y-auto">
          {view === "dashboard" && (
            <DashboardView
              setView={navigate}
              openVendor={openVendor}
              setDocPriority={setDocPriority}
            />
          )}
          {view === "vendors" && <VendorsView key={`v-${resetSignal}`} openVendor={openVendor} />}
          {view === "documents" && <DocumentsView key={`d-${resetSignal}`} docPriority={docPriority} setDocPriority={setDocPriority} />}
          {view === "products" && <ProductsView key={`p-${resetSignal}`} />}
          {view === "team" && <TeamView />}
          {view === "activity" && <ActivityView />}
          {view === "vendorDetail" && <VendorDetailView vendor={selectedVendor} onBack={() => setView(previousView)} />}
        </main>
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <RotateCcw size={14} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}
