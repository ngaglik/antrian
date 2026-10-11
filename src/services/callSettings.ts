import { reactive } from "vue";
import { apiGet, apiPut } from "./api";

// ── Pengaturan pemanggilan suara ────────────────────────────────────
// Menentukan kapan nomor dibacakan lewat pengeras suara kiosk (TTS) pada
// setiap tahap proses, beserta template teksnya. Disimpan di DATABASE
// melalui backend (tabel que.call_setting).

export interface CallSetting {
  /** (a) Panggilan awal saat nomor dipanggil (klik daftar menunggu / berikutnya). */
  announceOnCall: boolean;
  /** (b) Panggilan ulang saat nomor yang sudah dipanggil/diproses dipanggil lagi. */
  announceOnRecall: boolean;
  /** (c) Panggilan saat nomor sedang diproses. */
  announceOnServing: boolean;
  /** (d) Panggilan saat nomor selesai dilayani. */
  announceOnDone: boolean;
  /** (e) Panggilan konfirmasi (tombol Panggil Konfirmasi di Pemanggil). */
  announceOnConfirm: boolean;
  /** Template teks panggilan awal. Token: {number}, {counter}, {service}, {customer} (" atas nama …", kosong → dihapus). */
  callTemplate: string;
  /** Template teks saat nomor sedang diproses. */
  servingTemplate: string;
  /** Template teks saat nomor selesai dilayani. */
  doneTemplate: string;
  /** Template teks panggilan konfirmasi (tombol “Panggil Konfirmasi” di Pemanggil). */
  confirmTemplate: string;
}

/** Sebagian pengaturan — hanya field yang dikirim yang ikut diubah. */
export type CallSettingPatch = Partial<CallSetting>;

/** Template bawaan (sama dengan default backend & service TTS). */
export const DEFAULT_CALL_TEMPLATES: Pick<
  CallSetting,
  "callTemplate" | "servingTemplate" | "doneTemplate" | "confirmTemplate"
> = {
  callTemplate:
    "Nomor antrian {number}{service}{customer}, silakan menuju {counter}.",
  servingTemplate:
    "Nomor antrian {number}{service}{customer}, sedang diproses di {counter}.",
  doneTemplate:
    "Nomor antrian {number}{service}{customer}, telah selesai dilayani. Terima kasih.",
  confirmTemplate:
    "Nomor antrian {number}{service}{customer}, silakan konfirmasi ke {counter}.",
};

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

const DEFAULT_SETTING: CallSetting = {
  announceOnCall: true,
  announceOnRecall: true,
  announceOnServing: false,
  announceOnDone: false,
  announceOnConfirm: true,
  ...DEFAULT_CALL_TEMPLATES,
};

export const state = reactive({
  setting: { ...DEFAULT_SETTING } as CallSetting,
  loading: false,
  saving: false,
  error: "",
});

function normalize(raw: Partial<CallSetting> | null | undefined): CallSetting {
  return {
    announceOnCall: raw?.announceOnCall !== false,
    announceOnRecall: raw?.announceOnRecall !== false,
    announceOnServing: raw?.announceOnServing === true,
    announceOnDone: raw?.announceOnDone === true,
    announceOnConfirm: raw?.announceOnConfirm !== false,
    callTemplate:
      raw?.callTemplate?.trim() || DEFAULT_CALL_TEMPLATES.callTemplate,
    servingTemplate:
      raw?.servingTemplate?.trim() || DEFAULT_CALL_TEMPLATES.servingTemplate,
    doneTemplate: raw?.doneTemplate?.trim() || DEFAULT_CALL_TEMPLATES.doneTemplate,
    confirmTemplate:
      raw?.confirmTemplate?.trim() || DEFAULT_CALL_TEMPLATES.confirmTemplate,
  };
}

/** Muat pengaturan pemanggilan dari backend. */
export async function loadCallSettings() {
  state.loading = true;
  try {
    const res = await apiGet<ApiEnvelope<CallSetting>>(
      "/api/queue/call-settings",
    );
    state.setting = normalize(res.data);
    state.error = "";
  } catch (err) {
    state.error =
      (err as Error).message || "Gagal memuat pengaturan pemanggilan";
  } finally {
    state.loading = false;
  }
}

/** Simpan pengaturan pemanggilan ke database (field yang dikirim saja). */
export async function saveCallSettings(
  input: CallSettingPatch,
): Promise<CallSetting> {
  state.saving = true;
  try {
    const res = await apiPut<ApiEnvelope<CallSetting>>(
      "/api/queue/call-settings",
      input,
    );
    state.setting = normalize(res.data);
    return state.setting;
  } finally {
    state.saving = false;
  }
}

export function useCallSettings() {
  return { state, loadCallSettings, saveCallSettings };
}
