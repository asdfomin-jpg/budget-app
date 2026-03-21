export type PaymentRow = {
  year: number;
  month: string;
  week: string;
  type: "Bill" | "Credit";
  name: string;
  dueDate: string; // YYYY-MM-DD
  currentAmount: number;
  carryOver: number;
  totalDue: number;
  isPaid: boolean;
  isConfirmed: boolean;
  isActive: boolean;
  paidAmount?: number;
  paidDate?: string;
  creditMinPayment?: number;
  creditBalance?: number;
};

export type PaymentForm = {
  type: "Bill" | "Credit";
  name: string;
  dueDate: string;
  currentAmount: string;
  carryOver: string;
  creditMinPayment: string;
  creditBalance: string;
};

export type SettingsState = {
  theme: "light" | "dark" | "auto";
  paidRowColor: string;

  pageScale: number;
  menuScale: number;
  tableScale: number;
  formScale: number;

  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

  showYears: boolean;
  showMonths: boolean;
  showWeeks: boolean;
  showSummary: boolean;

  yearsScale: number;
  monthsScale: number;
  weeksScale: number;
  actionsScale: number;
};

export const viewModes = [
  "Month",
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Credit",
] as const;

export type ViewMode = (typeof viewModes)[number];

export type SortField = "type" | "name" | "dueDate" | null;
export type SortDirection = "asc" | "desc";