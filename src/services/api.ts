// ── Tipe data antrian ───────────────────────────────────────────────
export type QueueStatusValue =
  | "waiting"
  | "called"
  | "serving"
  | "done"
  | "skipped";

export interface QueueTicket {
  id: number;
  queueDate: string;
  prefix: string;
  number: number;
  code: string;
  service: string | null;
  /** Nama pelanggan (opsional, diisi petugas dari halaman Pemanggil). */
  customerName: string | null;
  /** Tanggal lahir pelanggan (opsional, dari pasien.tanggal_lahir). */
  customerBirthDate: string | null;
  status: QueueStatusValue;
  counter: string | null;
  calledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface QueueSummary {
  total: number;
  waiting: number;
  called: number;
  serving: number;
  done: number;
  skipped: number;
  lastCalled: string | null;
}

export interface QueueSnapshot {
  date: string;
  serverTime: string;
  summary: QueueSummary;
  tickets: QueueTicket[];
  /** Panggilan konfirmasi terakhir (in-memory) — untuk disorot di Monitoring. */
  lastConfirm?: { ticketId: number; counter: string; at: string } | null;
}

export interface ApiResult<T> {
  message: string;
  data: T;
}

// ── Helper request ──────────────────────────────────────────────────
// Base URL API untuk browser. Kosong (default) = relatif → mode dev lewat
// proxy Vite, mode produksi same-origin lewat nginx. Diisi lewat VITE_API_BASE
// (lihat .env.development / .env.production) bila API berada di origin lain.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export const streamUrl = () => apiUrl("/api/queue/stream");

async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.message || data?.detail || data?.title || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ── Auth: header Authorization & penanganan 401 ─────────────────────
// Disuntik dari services/auth.ts (dipanggil App.vue) agar tidak ada impor siklus.
let authHeaderProvider: () => Record<string, string> = () => ({});
let unauthorizedHandler: (() => void) | null = null;

export function setAuthHeaderProvider(fn: () => Record<string, string>) {
  authHeaderProvider = fn;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

function buildHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = { ...authHeaderProvider() };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Token tidak ada/kedaluwarsa → bersihkan sesi & arahkan ke halaman masuk.
    unauthorizedHandler?.();
    throw new Error("Sesi berakhir atau belum masuk. Silakan login kembali.");
  }
  if (!res.ok) throw new Error(await extractError(res));
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return handleResponse<T>(
    await fetch(apiUrl(path), { headers: buildHeaders() }),
  );
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return handleResponse<T>(
    await fetch(apiUrl(path), {
      method: "POST",
      headers: buildHeaders(true),
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return handleResponse<T>(
    await fetch(apiUrl(path), {
      method: "PUT",
      headers: buildHeaders(true),
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return handleResponse<T>(
    await fetch(apiUrl(path), { method: "DELETE", headers: buildHeaders() }),
  );
}

// ── Label & warna status ────────────────────────────────────────────
export const STATUS_LABEL: Record<QueueStatusValue, string> = {
  waiting: "Menunggu",
  called: "Dipanggil",
  serving: "Sedang Diproses",
  done: "Selesai",
  skipped: "Dilewati",
};

export const STATUS_TAG_TYPE: Record<
  QueueStatusValue,
  "default" | "info" | "warning" | "success" | "error"
> = {
  waiting: "default",
  called: "warning",
  serving: "info",
  done: "success",
  skipped: "error",
};

export const formatTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Label loket siap tampil: beri awalan "Loket " bila belum ada, sehingga nama
 * seperti "1" dan "Loket 1" sama-sama tampil sebagai "Loket 1" (tanpa ganda).
 */
export const counterLabel = (counter: string | null | undefined) => {
  const value = (counter ?? "").trim();
  if (!value) return "Loket -";
  return /^loket\b/i.test(value) ? value : `Loket ${value}`;
};
