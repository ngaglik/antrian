import { reactive } from "vue";
import {
  apiUrl,
  setAuthHeaderProvider,
  setUnauthorizedHandler,
} from "./api";

// ── Autentikasi (login) ─────────────────────────────────────────────
// Login hanya diperlukan untuk halaman **Pemanggil** dan **Pengaturan**.
// Kiosk & Monitoring tetap dapat diakses tanpa login.
// Token JWT disimpan di localStorage dan dikirim sebagai header
// `Authorization: Bearer <token>` untuk semua request API.

const TOKEN_KEY = "antrian.auth.token";
const USER_KEY = "antrian.auth.username";

// Id aplikasi yang dikirim saat login (menentukan sesi per-aplikasi di backend).
const APP_ID = (import.meta.env.VITE_APP_ID as string | undefined)?.trim() || "antrian";

export const authState = reactive({
  token: localStorage.getItem(TOKEN_KEY) || "",
  username: localStorage.getItem(USER_KEY) || "",
});

export const isAuthenticated = () => authState.token.length > 0;

function persist() {
  if (authState.token) localStorage.setItem(TOKEN_KEY, authState.token);
  else localStorage.removeItem(TOKEN_KEY);

  if (authState.username) localStorage.setItem(USER_KEY, authState.username);
  else localStorage.removeItem(USER_KEY);
}

/**
 * Login ke `POST /api/auth/login` (dipanggil langsung, bukan lewat helper api,
 * supaya respons 401 tidak memicu logout/redirect otomatis).
 */
export async function login(username: string, password: string) {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, appId: APP_ID }),
  });

  if (res.status === 401) throw new Error("Username atau password salah");

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data?.message || data?.detail || data?.title || detail;
    } catch {
      /* biarkan detail default */
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as { token?: string };
  if (!data?.token) throw new Error("Respons login tidak valid (token kosong)");

  authState.token = data.token;
  authState.username = username.trim();
  persist();
  return data;
}

export function logout() {
  authState.token = "";
  authState.username = "";
  persist();
}

/**
 * Daftarkan header Authorization + penanganan 401. Panggil sekali dari App.vue
 * (butuh akses router untuk mengarahkan ke halaman masuk).
 */
export function initAuth(onUnauthorized: () => void) {
  setAuthHeaderProvider((): Record<string, string> =>
    authState.token ? { Authorization: `Bearer ${authState.token}` } : {},
  );

  setUnauthorizedHandler(() => {
    logout();
    onUnauthorized();
  });
}
