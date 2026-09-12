/**
 * Product tour steps. Every `target` is a `data-tour="..."` attribute already placed on a
 * real, always-present piece of the authenticated shell (sidebar nav, navbar, or the
 * dashboard KPI grid) - the tour never navigates between pages, it only highlights what is
 * already on screen right after registration, so there is nothing to keep in sync with
 * route changes. Kept intentionally short (10 steps) and 1:1 with the app's actual nav
 * items rather than covering every sub-feature.
 */
export interface TourStep {
  id: string;
  target: string;
  titleKey: string;
  descriptionKey: string;
}

export const TOUR_STEPS: TourStep[] = [
  { id: "dashboard", target: "dashboard-kpis", titleKey: "dashboard", descriptionKey: "dashboard" },
  { id: "crm", target: "nav-crm", titleKey: "crm", descriptionKey: "crm" },
  { id: "sales", target: "nav-sales", titleKey: "sales", descriptionKey: "sales" },
  { id: "operations", target: "nav-operations", titleKey: "operations", descriptionKey: "operations" },
  { id: "analytics", target: "nav-analytics", titleKey: "analytics", descriptionKey: "analytics" },
  { id: "reports", target: "nav-reports", titleKey: "reports", descriptionKey: "reports" },
  { id: "knowledge", target: "nav-knowledge", titleKey: "knowledge", descriptionKey: "knowledge" },
  { id: "search", target: "navbar-search", titleKey: "search", descriptionKey: "search" },
  { id: "notifications", target: "navbar-notifications", titleKey: "notifications", descriptionKey: "notifications" },
  { id: "guide", target: "navbar-guide", titleKey: "guide", descriptionKey: "guide" },
];
