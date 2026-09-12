/**
 * Static table of contents for the Guide panel. Every category/entry maps 1:1 to a
 * feature that actually exists in SalesCore (verified against the sidebar nav, the
 * dashboard KPI keys, and the RBAC roles in app.core.rbac) - this is a map of the
 * product, not a marketing description of one that doesn't exist yet.
 */
export interface GuideEntry {
  key: string;
  hasExample?: boolean;
}

export interface GuideCategory {
  key: string;
  entries: GuideEntry[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { key: "salescore", entries: [{ key: "whatIsSalesCore" }, { key: "howItWorks" }, { key: "mainWorkflow" }] },
  {
    key: "dashboard",
    entries: [
      { key: "revenue", hasExample: true },
      { key: "pipelineValue", hasExample: true },
      { key: "winRate" },
      { key: "avgDealSize" },
      { key: "salesTarget" },
    ],
  },
  { key: "crm", entries: [{ key: "companies" }, { key: "contacts" }, { key: "leads" }] },
  { key: "sales", entries: [{ key: "pipeline" }, { key: "deals" }, { key: "stagesWonLost" }] },
  { key: "operations", entries: [{ key: "activities" }, { key: "tasks" }] },
  { key: "analytics", entries: [{ key: "kpisTrends" }, { key: "teamPerformance" }] },
  { key: "reports", entries: [{ key: "filtersExport" }] },
  { key: "businessInsights", entries: [{ key: "insightsWhat" }, { key: "insightsHow" }] },
  {
    key: "roles",
    entries: [
      { key: "roleAdmin" },
      { key: "roleManager" },
      { key: "roleSalesRep" },
      { key: "roleAnalyst" },
      { key: "roleViewer" },
    ],
  },
  { key: "navigation", entries: [{ key: "globalSearch" }, { key: "notifications" }, { key: "settings" }] },
];
