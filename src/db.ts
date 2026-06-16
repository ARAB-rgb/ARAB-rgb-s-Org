/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { createClient } from "@supabase/supabase-js";

import { User, Installment, Quote, Receipt, Payment, Expense, Project, Worker, DbSession } from "./types";

// Setup Supabase Client
const DEFAULT_SUPABASE_URL = "https://dypyrtmnxaitowaophvx.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5cHlydG1ueGFpdG93YW9waHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Mjc2NTksImV4cCI6MjA5NTAwMzY1OX0.ReONlt3c3Lp8Aes-sO0G2sANoQn8mYBtCQ4IYkf9i7o";

export function getSupabaseCredentials() {
  const url = localStorage.getItem("aw_supabase_url") || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem("aw_supabase_key") || DEFAULT_SUPABASE_KEY;
  const isCustom = !!localStorage.getItem("aw_supabase_url");
  return { url, key, isCustom };
}

const initialCreds = getSupabaseCredentials();

export let supabase = createClient(initialCreds.url, initialCreds.key);

// Track whether Supabase is healthy or quota restricted
export let isSupabaseHealthy = true;

export function setSupabaseHealthyState(state: boolean) {
  isSupabaseHealthy = state;
}

export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("restricted") ||
    msg.includes("egress") ||
    msg.includes("violation") ||
    (typeof error.status === "number" && (error.status === 402 || error.status === 403))
  );
}

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("users").select("id").limit(1);
    if (error) {
      if (isQuotaError(error)) {
        console.warn("⚠️ Supabase has restriction limits (egress quota limits). Falling back to Firestore database.", error.message);
        isSupabaseHealthy = false;
        return false;
      }
      // If other database error, maybe table is missing or something, but connection is alive.
      // If it is just invalid API Key/URL, it might be unauthorized
      isSupabaseHealthy = true; 
      return true;
    } else {
      isSupabaseHealthy = true;
      console.log("🟢 Supabase connected successfully as active source of truth!");
      return true;
    }
  } catch (err: any) {
    console.warn("⚠️ Supabase connection error. Active Firestore database fallback will be used.", err?.message || err);
    isSupabaseHealthy = false;
    return false;
  }
}

export async function saveSupabaseCredentials(url: string, key: string): Promise<boolean> {
  if (!url || !key) {
    localStorage.removeItem("aw_supabase_url");
    localStorage.removeItem("aw_supabase_key");
  } else {
    localStorage.setItem("aw_supabase_url", url.trim());
    localStorage.setItem("aw_supabase_key", key.trim());
  }
  const creds = getSupabaseCredentials();
  supabase = createClient(creds.url, creds.key);
  return await checkSupabaseHealth();
}

checkSupabaseHealth();

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// Test Connection on Initial Boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();

// Auto Authenticate Anonymously to protect Firestore operations under security rules
signInAnonymously(auth).catch((err) => {
  console.warn("Notice: Optional Anonymous Auth not enabled in Firebase Console. Using fallback unauthenticated access.", err);
});

// JSON Error Handling Pattern
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Fluent Hybrid Chain for Real Supabase API with Firestore Fallback
class SupabaseEmulationChain {
  private table: string;
  private filters: { field: string; val: any }[] = [];
  private orderField: string | null = null;
  private orderAscending: boolean = false;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null = null;
  private payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = "*") {
    this.action = 'select';
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload: any, options?: any) {
    this.action = 'upsert';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, val: any) {
    this.filters.push({ field, val });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = options?.ascending ?? false;
    return this;
  }

  private async executeRealSupabase() {
    let queryBuilder: any = supabase.from(this.table);

    if (this.action === 'select') {
      let q = queryBuilder.select("*");
      for (const f of this.filters) {
        q = q.eq(f.field, f.val);
      }
      if (this.orderField) {
        q = q.order(this.orderField, { ascending: this.orderAscending });
      }
      const { data, error } = await q;
      if (error) throw error;
      return { data, error: null };
    }

    if (this.action === 'insert') {
      const { data, error } = await queryBuilder.insert(this.payload).select();
      if (error) throw error;
      return { data: Array.isArray(this.payload) ? data : data?.[0], error: null };
    }

    if (this.action === 'update') {
      let q = queryBuilder.update(this.payload);
      for (const f of this.filters) {
        q = q.eq(f.field, f.val);
      }
      const { data, error } = await q.select();
      if (error) throw error;
      return { data: data?.[0] || null, error: null };
    }

    if (this.action === 'upsert') {
      const { data, error } = await queryBuilder.upsert(this.payload).select();
      if (error) throw error;
      return { data: Array.isArray(this.payload) ? data : data?.[0], error: null };
    }

    if (this.action === 'delete') {
      let q = queryBuilder.delete();
      for (const f of this.filters) {
        q = q.eq(f.field, f.val);
      }
      const { data, error } = await q;
      if (error) throw error;
      return { data: null, error: null };
    }

    throw new Error("Unsupported action for Supabase");
  }

  async maybeSingle(): Promise<{ data: any | null; error: Error | null }> {
    if (isSupabaseHealthy) {
      try {
        let q = supabase.from(this.table).select("*");
        for (const f of this.filters) {
          q = q.eq(f.field, f.val);
        }
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) {
          if (isQuotaError(error)) {
            isSupabaseHealthy = false;
            console.warn("⚠️ Supabase quota exceeded during maybeSingle. Falling back to Firestore.");
          } else {
            return { data: null, error: new Error(error.message) };
          }
        } else {
          return { data, error: null };
        }
      } catch (err: any) {
        console.warn("⚠️ Real Supabase maybeSingle failed, falling back to Firestore.", err);
        isSupabaseHealthy = false;
      }
    }

    // Fallback to Firestore
    try {
      const qConstraints: any[] = [];
      for (const f of this.filters) {
        qConstraints.push(where(f.field, '==', f.val));
      }
      const colRef = collection(db, this.table);
      const q = query(colRef, ...qConstraints);
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { data: docs[0] || null, error: null };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, this.table);
      return { data: null, error: err };
    }
  }

  // Promise-like then method so it can be directly awaited
  async then(resolve?: (val: any) => any, reject?: (err: any) => any) {
    try {
      const res = await this.execute();
      if (resolve) return resolve(res);
      return res;
    } catch (err) {
      if (reject) return reject(err);
      throw err;
    }
  }

  private async execute() {
    if (isSupabaseHealthy) {
      try {
        return await this.executeRealSupabase();
      } catch (err: any) {
        if (isQuotaError(err)) {
          isSupabaseHealthy = false;
          console.warn("⚠️ Supabase restriction or quota exceeded. Seamlesly swapping to Firestore fallback.", err.message || err);
        } else {
          console.error("Real Supabase query threw exception:", err);
          return { data: null, error: err };
        }
      }
    }

    // --- Original Firestore Fallback ---
    if (this.action === 'select') {
      try {
        const colRef = collection(db, this.table);
        const qConstraints: any[] = [];
        for (const f of this.filters) {
          qConstraints.push(where(f.field, '==', f.val));
        }
        if (this.orderField) {
          qConstraints.push(orderBy(this.orderField, this.orderAscending ? 'asc' : 'desc'));
        }
        const q = qConstraints.length > 0 ? query(colRef, ...qConstraints) : colRef;
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { data, error: null };
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, this.table);
        return { data: [], error: err };
      }
    }

    if (this.action === 'insert') {
      try {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload];
        const results = [];
        for (const rec of records) {
          const docId = rec.id || doc(collection(db, this.table)).id;
          const docRef = doc(db, this.table, docId);
          const toSave = {
            id: docId,
            ...rec,
            created_at: rec.created_at || new Date().toISOString()
          };
          await setDoc(docRef, toSave);
          results.push(toSave);
        }
        return { data: Array.isArray(this.payload) ? results : results[0], error: null };
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, this.table);
        return { data: null, error: err };
      }
    }

    if (this.action === 'update') {
      try {
        const idFilter = this.filters.find(f => f.field === 'id');
        if (idFilter) {
          const docId = idFilter.val;
          const docRef = doc(db, this.table, docId);
          await setDoc(docRef, this.payload, { merge: true });
          return { data: { id: docId, ...this.payload }, error: null };
        } else if (this.filters.length > 0) {
          const qConstraints = this.filters.map(f => where(f.field, '==', f.val));
          const colRef = collection(db, this.table);
          const snap = await getDocs(query(colRef, ...qConstraints));
          for (const d of snap.docs) {
            await setDoc(doc(db, this.table, d.id), this.payload, { merge: true });
          }
          return { data: this.payload, error: null };
        }
        return { data: null, error: new Error("No filter specified for update") };
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, this.table);
        return { data: null, error: err };
      }
    }

    if (this.action === 'upsert') {
      try {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload];
        const results = [];
        for (const rec of records) {
          let docId = rec.id;
          if (!docId && rec.code) {
            const colRef = collection(db, this.table);
            const q = query(colRef, where('code', '==', rec.code));
            const snap = await getDocs(q);
            if (!snap.empty) {
              docId = snap.docs[0].id;
            }
          }
          if (!docId) {
            docId = doc(collection(db, this.table)).id;
          }
          const docRef = doc(db, this.table, docId);
          const toSave = {
            id: docId,
            ...rec,
            created_at: rec.created_at || new Date().toISOString()
          };
          await setDoc(docRef, toSave, { merge: true });
          results.push(toSave);
        }
        return { data: Array.isArray(this.payload) ? results : results[0], error: null };
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, this.table);
        return { data: null, error: err };
      }
    }

    if (this.action === 'delete') {
      try {
        const idFilter = this.filters.find(f => f.field === 'id');
        if (idFilter) {
          const docId = idFilter.val;
          const docRef = doc(db, this.table, docId);
          await deleteDoc(docRef);
          return { data: null, error: null };
        }
        return { data: null, error: new Error("No ID filter specified for delete") };
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, this.table);
        return { data: null, error: err };
      }
    }

    return { data: null, error: new Error("Unsupported chain action") };
  }
}

export const sb = {
  from: (table: string) => {
    return new SupabaseEmulationChain(table);
  }
};

// Original Helper utilities
export function awExtractRegion(notes: string): string {
  const text = String(notes || "");
  const m1 = text.match(/\[الإدارة:\s*([^\]]+)\]/);
  if (m1) return m1[1].trim();
  
  const m2 = text.match(/\[\[?AW_BRANCH:\s*([^\]\s]+)\]?\]/i);
  if (m2) {
    const code = m2[1].trim().toLowerCase();
    const map: Record<string, string> = {
      riyadh: "الوسطى", kharj: "الوسطى", dammam: "الشرقية",
      central: "الوسطى", east: "الشرقية", west: "الغربية",
      south: "الجنوب", north: "الشمال"
    };
    return map[code] || code;
  }
  return "";
}

export function awExtractTreasury(notes: string): string {
  const text = String(notes || "");
  const m1 = text.match(/\[الخزنة:\s*([^\]]+)\]/);
  if (m1) return m1[1].trim();
  return "";
}

export function awExtractCapital(notes: string): number {
  const text = String(notes || "");
  const m1 = text.match(/\[رأس_المال:\s*(\d+(\.\d+)?)\]/);
  if (m1) return Number(m1[1]);
  return 0;
}

export function awExtractCapitalSource(notes: string): "شركة" | "تحصيل" | "كلاهما" {
  const text = String(notes || "");
  const m = text.match(/\[رأس_المال_المصدر:\s*([^\]]+)\]/);
  if (m) {
    const val = m[1].trim();
    if (val === "شركة" || val === "تحصيل" || val === "كلاهما") return val;
  }
  return "شركة";
}

export function awExtractCapitalCompany(notes: string): number {
  const text = String(notes || "");
  const source = awExtractCapitalSource(notes);
  if (source === "تحصيل") return 0;
  if (source === "شركة") return awExtractCapital(notes);
  
  const m = text.match(/\[رأس_المال_شركة:\s*(\d+(\.\d+)?)\]/);
  return m ? Number(m[1]) : 0;
}

export function awExtractCapitalCollection(notes: string): number {
  const text = String(notes || "");
  const source = awExtractCapitalSource(notes);
  if (source === "شركة") return 0;
  if (source === "تحصيل") return awExtractCapital(notes);
  
  const m = text.match(/\[رأس_المال_تحصيل:\s*(\d+(\.\d+)?)\]/);
  return m ? Number(m[1]) : 0;
}

export function awCleanNotes(notes: string): string {
  return String(notes || "")
    .replace(/\s*\[الإدارة:\s*[^\]]+\]\s*/g, " ")
    .replace(/\s*\[الخزنة:\s*[^\]]+\]\s*/g, " ")
    .replace(/\s*\[رأس_المال:\s*[^\]]+\]\s*/g, " ")
    .replace(/\s*\[رأس_المال_المصدر:\s*[^\]]+\]\s*/g, " ")
    .replace(/\s*\[رأس_المال_شركة:\s*[^\]]+\]\s*/g, " ")
    .replace(/\s*\[رأس_المال_تحصيل:\s*[^\]]+\]\s*/g, " ")
    .replace(/\s*\[\[?AW_BRANCH:\s*[^\]\s]+\]?\]\s*/gi, " ")
    .trim();
}

export function awBuildNotesWithRegion(notes: string, region: string): string {
  const clean = awCleanNotes(notes);
  if (!region) return clean;
  return `[الإدارة: ${region}]` + (clean ? "\n" : "") + clean;
}

export function awBuildNotesWithRegionAndTreasury(notes: string, region: string, treasury: string): string {
  const clean = awCleanNotes(notes);
  let extraArr = [];
  if (region) extraArr.push(`[الإدارة: ${region}]`);
  if (treasury) extraArr.push(`[الخزنة: ${treasury}]`);
  
  if (extraArr.length === 0) return clean;
  return extraArr.join(" ") + (clean ? "\n" : "") + clean;
}

export function awBuildNotesWithRegionAndTreasuryAndCapital(
  notes: string,
  region: string,
  treasury: string,
  capital: number,
  capitalSource?: string,
  capitalCompany?: number,
  capitalCollection?: number
): string {
  const clean = awCleanNotes(notes);
  let extraArr = [];
  if (region) extraArr.push(`[الإدارة: ${region}]`);
  if (treasury) extraArr.push(`[الخزنة: ${treasury}]`);
  if (capital && capital > 0) extraArr.push(`[رأس_المال: ${capital}]`);
  if (capitalSource) extraArr.push(`[رأس_المال_المصدر: ${capitalSource}]`);
  if (typeof capitalCompany === "number" && capitalCompany > 0) extraArr.push(`[رأس_المال_شركة: ${capitalCompany}]`);
  if (typeof capitalCollection === "number" && capitalCollection > 0) extraArr.push(`[رأس_المال_تحصيل: ${capitalCollection}]`);
  
  if (extraArr.length === 0) return clean;
  return extraArr.join(" ") + (clean ? "\n" : "") + clean;
}

export function generateNextNo(prefix: string, list: any[], field: string = "no"): string {
  const nums = list
    .map(x => {
      const match = String(x[field] || "").match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter(Boolean);
  const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(nextNum).padStart(4, "0")}`;
}

export function getContractTiming(x: Installment) {
  const start = x.start_date ? new Date(x.start_date) : null;
  const daily = Number(x.installment || 0);
  const paid = Number(x.paid || 0);
  const paidDays = daily > 0 ? Math.floor(paid / daily) : 0;
  
  let lastPaid = "غير مسدد";
  if (start && paidDays > 0) {
    const d = new Date(start);
    d.setDate(d.getDate() + paidDays - 1);
    lastPaid = d.toISOString().slice(0, 10);
  }

  let dueDays = 0;
  if (start) {
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    dueDays = Math.max(0, Math.floor((todayOnly.getTime() - startOnly.getTime()) / 86400000) + 1);
  }

  const overdueDays = Math.max(0, dueDays - paidDays);
  const overdueAmount = overdueDays * daily;

  return {
    paidDays,
    lastPaid,
    dueDays,
    overdueDays,
    overdueAmount,
  };
}

export async function logSession(user: User, action: string) {
  if (!user) return;
  await sb.from("sessions").insert({
    name: user.name,
    code: user.code,
    role: user.role,
    time: new Date().toLocaleString("ar-SA"),
    action
  });
}

export function awCleanWorkerNotes(notes: string): string {
  return String(notes || "")
    .replace(/\s*\[عقد_[^\]]+\]\s*/g, " ")
    .replace(/\s*\[طلب_إجازة:\s*[^\]]+\]\s*/g, " ")
    .trim();
}

export function awExtractWorkerContract(notes: string): any {
  const text = String(notes || "");
  const getVal = (key: string, def = "") => {
    const rx = new RegExp(`\\[${key}:\\s*([^\\]]+)\\]`);
    const m = text.match(rx);
    return m ? m[1].trim() : def;
  };
  const getNum = (key: string, def = 0) => {
    const val = getVal(key);
    return val ? Number(val) : def;
  };

  return {
    start: getVal("عقد_البداية", ""),
    duration: getVal("عقد_المدة", "سنة واحدة"),
    salary: getNum("عقد_الراتب", 0),
    housing: getNum("عقد_السكن", 0),
    transport: getNum("عقد_الانتقال", 0),
    other: getNum("عقد_أخرى", 0),
    passport: getVal("عقد_جواز", ""),
    probation: getVal("عقد_التجربة", "90 يوم"),
    vacation: getNum("عقد_الإجازة", 30),
  };
}

export function awExtractWorkerLeaves(notes: string): any[] {
  const text = String(notes || "");
  const leaves: any[] = [];
  const matches = text.matchAll(/\[طلب_إجازة:\s*([^\]]+)\]/g);
  for (const m of matches) {
    const parts = m[1].split("|");
    if (parts.length >= 4) {
      leaves.push({
        id: parts[0]?.trim() || "",
        start: parts[1]?.trim() || "",
        end: parts[2]?.trim() || "",
        type: parts[3]?.trim() || "",
        notes: parts[4]?.trim() || "",
      });
    }
  }
  return leaves;
}

export function awBuildWorkerNotes(cleanText: string, contract: any, leaves: any[]): string {
  const notesText = awCleanWorkerNotes(cleanText);
  const tags: string[] = [];
  if (contract) {
    if (contract.start) tags.push(`[عقد_البداية: ${contract.start}]`);
    if (contract.duration) tags.push(`[عقد_المدة: ${contract.duration}]`);
    if (contract.salary) tags.push(`[عقد_الراتب: ${contract.salary}]`);
    if (contract.housing) tags.push(`[عقد_السكن: ${contract.housing}]`);
    if (contract.transport) tags.push(`[عقد_الانتقال: ${contract.transport}]`);
    if (contract.other) tags.push(`[عقد_أخرى: ${contract.other}]`);
    if (contract.passport) tags.push(`[عقد_جواز: ${contract.passport}]`);
    if (contract.probation) tags.push(`[عقد_التجربة: ${contract.probation}]`);
    if (contract.vacation) tags.push(`[عقد_الإجازة: ${contract.vacation}]`);
  }
  if (leaves && leaves.length > 0) {
    leaves.forEach(l => {
      tags.push(`[طلب_إجازة: ${l.id || Math.random().toString(36).substring(7)}|${l.start}|${l.end}|${l.type}|${l.notes}]`);
    });
  }

  if (tags.length === 0) return notesText;
  return tags.join(" ") + (notesText ? "\n" : "") + notesText;
}
