export type UserRole = "admin" | "manager" | "sales_rep" | "analyst" | "viewer";

export type CompanyStatus = "active" | "inactive" | "prospect";
export type CompanySize = "self_employed" | "1-50" | "51-200" | "201-1000" | "1000+";
export type LeadSource = "website" | "referral" | "linkedin" | "advertisement" | "email" | "event" | "other";
export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "converted";
export type DealStage = "lead" | "qualified" | "opportunity" | "proposal" | "negotiation" | "won" | "lost";
export type ActivityType = "call" | "email" | "meeting" | "note" | "task" | "follow_up" | "demo" | "proposal";
export type ActivityStatus = "planned" | "completed" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "completed" | "overdue";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type NotificationType =
  "task_due" | "deal_follow_up" | "new_lead" | "deal_won" | "deal_lost" | "target_reached" | "mention";
export type TargetPeriod = "monthly" | "quarterly" | "yearly";

export interface DepartmentBrief {
  id: number;
  name: string;
}

export interface UserBrief {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_color: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  job_title: string | null;
  department: DepartmentBrief | null;
  manager_id: number | null;
  is_active: boolean;
  avatar_color: string;
  last_login_at: string | null;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  employee_count: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CompanyBrief {
  id: number;
  name: string;
}

export interface Company {
  id: number;
  name: string;
  industry: string | null;
  size: CompanySize | null;
  country: string | null;
  website: string | null;
  annual_revenue: number | null;
  status: CompanyStatus;
  owner: UserBrief | null;
  created_at: string;
  updated_at: string;
}

export interface Customer360 {
  company: Company;
  customer_since: string | null;
  lifetime_value: number;
  total_deals: number;
  won_deals: number;
  open_deals: number;
  lost_deals: number;
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company: CompanyBrief | null;
  owner: UserBrief | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  score: number;
  status: LeadStatus;
  notes: string | null;
  owner: UserBrief | null;
  converted_deal_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: number;
  title: string;
  company: CompanyBrief | null;
  contact: Contact | null;
  owner: UserBrief | null;
  value: number;
  currency: string;
  probability: number;
  stage: DealStage;
  source: LeadSource | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  lost_reason: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealListItem {
  id: number;
  title: string;
  company: CompanyBrief | null;
  owner: UserBrief | null;
  value: number;
  currency: string;
  probability: number;
  stage: DealStage;
  expected_close_date: string | null;
  updated_at: string;
}

export interface DealStageHistoryItem {
  id: number;
  from_stage: DealStage | null;
  to_stage: DealStage;
  changed_by: UserBrief | null;
  changed_at: string;
  note: string | null;
}

export interface PipelineColumn {
  stage: DealStage;
  label: string;
  count: number;
  total_value: number;
  deals: DealListItem[];
}

export interface PipelineBoard {
  columns: PipelineColumn[];
}

export interface Activity {
  id: number;
  type: ActivityType;
  title: string;
  description: string | null;
  status: ActivityStatus;
  activity_date: string;
  owner: UserBrief | null;
  company: CompanyBrief | null;
  contact_id: number | null;
  deal_id: number | null;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  assignee: UserBrief | null;
  created_by: UserBrief | null;
  related_company_id: number | null;
  related_deal_id: number | null;
  created_at: string;
}

export interface SalesTarget {
  id: number;
  name: string;
  period: TargetPeriod;
  period_start: string;
  period_end: string;
  target_amount: number;
  employee: UserBrief | null;
  department: DepartmentBrief | null;
  actual_amount: number;
  achievement_pct: number;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  params: Record<string, string> | null;
  is_read: boolean;
  related_entity_type: string | null;
  related_entity_id: number | null;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user: UserBrief | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_label: string | null;
  log_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface KnowledgeCategory {
  id: number;
  key: string;
  name_en: string;
  name_tr: string;
  name_de: string;
  name_ar: string;
  term_count: number;
}

export interface KnowledgeTerm {
  id: number;
  key: string;
  category_id: number;
  term_en: string;
  term_tr: string;
  term_de: string;
  term_ar: string;
  short_definition_en: string;
  short_definition_tr: string;
  short_definition_de: string;
  short_definition_ar: string;
  definition_en: string;
  definition_tr: string;
  definition_de: string;
  definition_ar: string;
  example: string | null;
}

export interface KpiMetric {
  key: string;
  label: string;
  value: number;
  change_pct: number | null;
  format: "currency" | "percent" | "number";
}

export interface KpiSummary {
  metrics: KpiMetric[];
}

export interface FunnelStage {
  stage: DealStage;
  label: string;
  count: number;
  value: number;
  conversion_rate: number;
}

export interface FunnelAnalytics {
  stages: FunnelStage[];
  overall_conversion_rate: number;
}

export interface RevenuePoint {
  period_label: string;
  period_start: string;
  actual: number;
  target: number;
  forecast: number;
  previous_period: number;
}

export interface RevenueAnalytics {
  points: RevenuePoint[];
  total_actual: number;
  total_target: number;
  achievement_pct: number;
}

export interface TeamPerformanceRow {
  employee: UserBrief;
  deals_count: number;
  won_count: number;
  revenue: number;
  win_rate: number;
  target_amount: number;
  achievement_pct: number;
}

export interface TeamPerformance {
  rows: TeamPerformanceRow[];
}

export interface BusinessInsight {
  id: string;
  severity: "positive" | "warning" | "info" | "critical";
  title: string;
  description: string;
  metric_key: string | null;
}

export interface SegmentationRow {
  segment: string;
  customer_count: number;
  revenue: number;
  revenue_share_pct: number;
}

export interface WinLossRow {
  period_label: string;
  won: number;
  lost: number;
  win_rate: number;
}

export interface CustomerGrowthPoint {
  period_label: string;
  new_customers: number;
  total_customers: number;
}

export interface PipelineVelocity {
  average_days_to_close: number;
  average_deal_size: number;
  deals_per_month: number;
  velocity_score: number;
}

export interface SearchResultItem {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
  title_i18n: Record<string, string> | null;
  subtitle_i18n: Record<string, string> | null;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
