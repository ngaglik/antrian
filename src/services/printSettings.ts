import { computed, reactive } from "vue";
import { apiGet, apiPut } from "./api";

// ── Pengaturan cetak tiket ──────────────────────────────────────────
// Jumlah salinan tiket disimpan di DATABASE (que.call_setting.print_copies)
// lewat backend, sehingga berlaku untuk semua perangkat (Kiosk & Pemanggil).

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

const DEFAULT_COPIES = 2;

export const state = reactive({
  copies: DEFAULT_COPIES,
  loading: false,
  saving: false,
  error: "",
});

/** Jumlah salinan tiket yang dicetak (minimal 1). */
export const printCopies = computed(() => Math.max(1, Math.floor(state.copies)));

/** Muat pengaturan cetak dari backend (endpoint publik). */
export async function loadPrintSettings() {
  state.loading = true;
  try {
    const res = await apiGet<ApiEnvelope<{ copies: number }>>(
      "/api/queue/print-settings",
    );
    state.copies = Number(res.data?.copies ?? DEFAULT_COPIES);
    state.error = "";
  } catch (err) {
    state.error = (err as Error).message || "Gagal memuat pengaturan cetak";
  } finally {
    state.loading = false;
  }
}

/** Simpan jumlah salinan cetak (butuh login). Mengembalikan nilai tersimpan. */
export async function savePrintSettings(copies: number) {
  state.saving = true;
  try {
    const res = await apiPut<ApiEnvelope<{ copies: number }>>(
      "/api/queue/print-settings",
      { copies },
    );
    state.copies = Number(res.data?.copies ?? copies);
    state.error = "";
    return state.copies;
  } finally {
    state.saving = false;
  }
}

export function usePrintSettings() {
  return { state, printCopies, loadPrintSettings, savePrintSettings };
}
