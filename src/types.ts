/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserPerms {
  region: string;
  installmentsView: boolean;
  installmentsAdd: boolean;
  installmentsEdit: boolean;
  installmentsDelete: boolean;
  quotes: boolean;
  receipts: boolean;
  payments: boolean;
  expenses: boolean;
  treasury: boolean;
  projects: boolean;
  workers: boolean;
  users: boolean;
  sessions: boolean;
  print: boolean;
  companies: boolean;
  dashTopCards: boolean;
  dashCollection: boolean;
  dashPulse: boolean;
  dashLateClients: boolean;
  dashLastReceipts: boolean;
  dashUpcomingPaid: boolean;
  is_authorized?: boolean;
  use_global?: boolean;
  worker_id?: string | null;
}

export interface User {
  id: string;
  name: string;
  code: string;
  password?: string;
  role: "admin" | "employee" | "supervisor";
  perms: UserPerms;
  company_perms?: Record<string, UserPerms>;
  worker_id?: string;
  company_id?: string | null;
  created_at?: string;
}

export interface Installment {
  id: string;
  company_id?: string;
  client: string;
  identity: string;
  nationality: string;
  phone: string;
  no: string;
  amount: number;
  paid: number;
  remaining: number;
  type: string;
  start_date: string;
  end_date: string;
  next_due?: string;
  periods: number;
  installment: number;
  discount: number;
  after_discount: number;
  project: string;
  workplace?: string;
  guarantor?: string;
  status: "منتظم" | "متأخر" | "متعثر" | "مكتمل";
  notes?: string;
  created_at?: string;
}

export interface Quote {
  id: string;
  company_id?: string;
  no: string;
  client: string;
  phone: string;
  project: string;
  amount: number;
  vat: number;
  total: number;
  date: string;
  status: "جديد" | "مرسل" | "مقبول" | "مرفوض";
  notes?: string;
  items?: { description: string; quantity: number; price: number; total: number; }[];
  created_at?: string;
}

export interface Receipt {
  id: string;
  company_id?: string;
  no: string;
  from_name: string;
  amount: number;
  method: string;
  date: string;
  project: string;
  notes?: string;
  installment_id?: string;
  contract_no?: string;
  identity?: string;
  phone?: string;
  nationality?: string;
  remaining_before?: number;
  remaining_after?: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  company_id?: string;
  worker_id?: string;
  no: string;
  to_name: string;
  amount: number;
  method: string;
  date: string;
  project: string;
  notes?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  company_id?: string;
  no: string;
  name: string;
  category: "مواد" | "عمالة" | "نقل" | "إيجار" | "وقود" | "إعاشة" | "سيارات" | "عدة" | "بنزين" | "تغيير زيت" | "صيانة" | "اتصالات" | "أخرى" | string;
  amount: number;
  date: string;
  project: string;
  supplier?: string;
  notes?: string;
  created_at?: string;
}

export interface Project {
  id: string;
  company_id?: string;
  name: string;
  location: string;
  engineer: string;
  budget: number;
  start_date: string;
  end_date: string;
  progress: number;
  status: "نشط" | "متوقف" | "منتهي";
  notes?: string;
  created_at?: string;
}

export interface Worker {
  id: string;
  company_id?: string;
  name: string;
  worker_id: string;
  phone: string;
  job: "حداد" | "نجار" | "كهربائي" | "سباك" | "عامل" | "مشرف";
  project: string;
  daily: number;
  days: number;
  advance: number;
  total: number;
  balance: number;
  status: "على رأس العمل" | "إجازة" | "موقوف";
  recipient_name?: string;
  notes?: string;
  created_at?: string;
}

export interface DbSession {
  id: string;
  name: string;
  code: string;
  role: string;
  time: string;
  action: string;
  created_at?: string;
}

export interface Company {
  id: string;
  name: string;
  record_no?: string; // Commercial Registration / السجل التجاري
  manager?: string;   // مدير الشركة للتعميدات والتوقيع
  phone?: string;
  address?: string;
  notes?: string;     // بنود وشروط إضافية للعقود
  promissory_note_template?: string; // صيغة سند الأمر الافتراضية للشركة
  created_at?: string;
}

export interface Extract {
  id: string;
  no: string;         // رقم المستخلص
  company_id: string; // تبعية الشركة
  project_id: string; // المشروع المعني
  client_name: string;// الجهة المالكة للمستخلص / العميل
  total_amount: number; // المبلغ الإجمالي المعتمد
  deductions: number;  // نسبة أو قيمة خصومات الغرامات/المواد
  net_amount: number;  // المبلغ الصافي للاستلام
  date: string;       // تاريخ إصدار المستخلص
  status: "مسودة" | "تحت المراجعة" | "مقبول" | "مسدد جزئياً" | "تم السداد";
  notes?: string;
  created_at?: string;
}

