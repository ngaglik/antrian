import { reactive } from "vue";
import {
  apiGet,
  apiPost,
  apiDelete,
  streamUrl,
  type ApiResult,
  type QueueSnapshot,
  type QueueStatusValue,
  type QueueSummary,
  type QueueTicket,
} from "./api";
import type { KioskTargetPayload } from "./settings";

// State global (singleton) — dipakai bersama oleh Kiosk, Pemanggil, Monitoring
const state = reactive({
  connected: false,
  loading: false,
  date: "",
  serverTime: "",
  summary: {
    total: 0,
    waiting: 0,
    called: 0,
    serving: 0,
    done: 0,
    skipped: 0,
    lastCalled: null as string | null,
  } as QueueSummary,
  tickets: [] as QueueTicket[],
  // Panggilan konfirmasi terakhir (dari snapshot) — untuk disorot di Monitoring.
  lastConfirm: null as { ticketId: number; counter: string; at: string } | null,
  lastError: "",
  // Waktu (ms) event terakhir diterima dari stream realtime (snapshot/ping).
  // Dipakai untuk mendeteksi koneksi monitoring yang mati diam-diam.
  lastEventAt: 0,
});

let source: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function applySnapshot(snap: QueueSnapshot) {
  state.date = snap.date ?? state.date;
  state.serverTime = snap.serverTime ?? state.serverTime;
  if (snap.summary) state.summary = { ...state.summary, ...snap.summary };
  state.tickets = snap.tickets ?? [];
  state.lastConfirm = snap.lastConfirm ?? null;
}

// ── Realtime (Server-Sent Events) ───────────────────────────────────
export function startQueueStream() {
  if (source) return;

  const es = new EventSource(streamUrl());
  source = es;

  es.addEventListener("open", () => {
    state.connected = true;
    state.lastError = "";
    state.lastEventAt = Date.now();
  });

  es.addEventListener("snapshot", (ev: MessageEvent) => {
    try {
      applySnapshot(JSON.parse(ev.data) as QueueSnapshot);
      state.connected = true;
      state.lastError = "";
      state.lastEventAt = Date.now();
    } catch {
      /* abaikan payload tidak valid */
    }
  });

  // Heartbeat dari server (event "ping") — menandakan koneksi masih hidup.
  es.addEventListener("ping", () => {
    state.connected = true;
    state.lastError = "";
    state.lastEventAt = Date.now();
  });

  es.addEventListener("error", () => {
    state.connected = false;
    // EventSource biasanya reconnect sendiri; kalau benar-benar tertutup,
    // jadwalkan koneksi ulang manual.
    if (es.readyState === EventSource.CLOSED) {
      stopQueueStream();
      retryTimer = setTimeout(() => {
        retryTimer = null;
        startQueueStream();
      }, 3000);
    }
  });
}

export function stopQueueStream() {
  if (source) {
    source.close();
    source = null;
  }
  state.connected = false;
  state.lastEventAt = 0;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

// Ambil snapshot sekali (fallback bila SSE belum terhubung)
export async function refreshSnapshot() {
  try {
    state.loading = true;
    applySnapshot(await apiGet<QueueSnapshot>("/api/queue/summary"));
    state.lastError = "";
  } catch (err) {
    state.lastError =
      (err as Error).message || "Gagal memuat data antrian";
  } finally {
    state.loading = false;
  }
}

// ── Aksi ────────────────────────────────────────────────────────────
export const queueActions = {
  /** Client/kiosk: ambil nomor antrian baru.
   *  `customerName` opsional (diisi petugas dari halaman Pemanggil). */
  async takeTicket(
    prefix = "A",
    service = "Umum",
    customerName?: string | null,
    customerBirthDate?: string | null,
  ): Promise<QueueTicket> {
    const res = await apiPost<ApiResult<QueueTicket>>("/api/queue/tickets", {
      prefix,
      service,
      customerName: customerName?.trim() || null,
      customerBirthDate: customerBirthDate || null,
    });
    return res.data;
  },

  /** Pemanggil: panggil nomor berikutnya */
  async callNext(counter?: string | null, kiosk?: KioskTargetPayload | null) {
    return apiPost<ApiResult<QueueTicket | null>>("/api/queue/next", {
      counter: counter ?? null,
      kiosk: kiosk ?? null,
    });
  },

  /** Pemanggil: panggil nomor tertentu (klik daftar antrian) */
  async callTicket(
    id: number,
    counter?: string | null,
    kiosk?: KioskTargetPayload | null,
  ) {
    return apiPost<ApiResult<QueueTicket>>(`/api/queue/tickets/${id}/call`, {
      counter: counter ?? null,
      kiosk: kiosk ?? null,
    });
  },

  /** Pemanggil: panggil konfirmasi (suara) untuk satu nomor tanpa mengubah status.
   *  `counter` = loket yang dibacakan (mis. dari filter loket). */
  async confirmTicket(
    id: number,
    counter?: string | null,
    kiosk?: KioskTargetPayload | null,
  ) {
    return apiPost<ApiResult<QueueTicket>>(
      `/api/queue/tickets/${id}/confirm`,
      { counter: counter ?? null, kiosk: kiosk ?? null },
    );
  },

  /** Ubah status: called/serving/done/skipped/waiting.
   *  autoCallNext: saat selesai, otomatis panggil nomor berikutnya.
   *  announceDone: kontrol suara saat selesai (true = panggil, false = diam,
   *                undefined = ikuti pengaturan).
   *  announceCall: paksa panggilan awal (template call) meski statusnya bukan
   *                'called' — dipakai nomor baru dari loket yang langsung proses. */
  async setStatus(
    id: number,
    status: QueueStatusValue,
    counter?: string | null,
    autoCallNext = false,
    kiosk?: KioskTargetPayload | null,
    announceDone?: boolean | null,
    announceCall?: boolean | null,
  ) {
    return apiPost<ApiResult<QueueTicket> & { next?: QueueTicket | null }>(
      `/api/queue/tickets/${id}/status`,
      {
        status,
        counter: counter ?? null,
        autoCallNext,
        kiosk: kiosk ?? null,
        announceDone: announceDone ?? null,
        announceCall: announceCall ?? null,
      },
    );
  },

  /** Hapus seluruh antrian hari ini */
  async reset() {
    return apiPost<{ message: string }>("/api/queue/reset");
  },

  /** Hapus satu tiket antrian (mis. antrian selesai dari tampilan). */
  async removeTicket(id: number) {
    return apiDelete<{ message: string }>(`/api/queue/tickets/${id}`);
  },

  /** Halaman Uji Suara: bacakan paragraf bebas lewat pengeras suara kiosk */
  async speak(
    text: string,
    repeat?: number | null,
    kiosk?: KioskTargetPayload | null,
  ) {
    return apiPost<{ message: string; data?: unknown }>("/api/queue/speak", {
      text,
      repeat: repeat ?? null,
      kiosk: kiosk ?? null,
    });
  },

  /** Hentikan bacaan TTS yang sedang berjalan.
   *  Body = target kiosk langsung ({ baseUrl, token, room }). */
  async stopSpeak(kiosk?: KioskTargetPayload | null) {
    return apiPost<{ message: string }>(
      "/api/queue/speak/stop",
      kiosk ?? {},
    );
  },
};

/** Pengaturan kiosk: info default server & uji koneksi target. */
export const kioskActions = {
  /** Info kiosk default dari konfigurasi server (Kiosk:BaseUrl). */
  async config() {
    return apiGet<{
      baseUrl: string | null;
      hasToken: boolean;
      repeats: number;
      allowedHosts: string;
    }>("/api/queue/kiosk");
  },

  /** Uji koneksi ke satu kiosk tujuan (diteruskan ke GET /health kiosk). */
  async ping(target: KioskTargetPayload) {
    return apiPost<{
      ok: boolean;
      message: string;
      baseUrl?: string | null;
      room?: string | null;
      health?: string | null;
    }>("/api/queue/kiosk/ping", target);
  },
};

export function useQueue() {
  return { state, refreshSnapshot, queueActions, kioskActions };
}
