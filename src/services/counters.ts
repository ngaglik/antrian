import { computed, reactive } from "vue";
import { apiDelete, apiGet, apiPost, apiPut } from "./api";

// ── Loket per layanan ───────────────────────────────────────────────
// Daftar loket disimpan di DATABASE melalui backend (tabel que.queue_counter).
// Tiap loket dimiliki satu layanan (nama layanan, sama dengan prefiks/tiket),
// sehingga daftar pilihan loket dapat berbeda untuk tiap layanan.

export interface QueueCounter {
  id: string;
  /** Nama layanan pemilik loket, mis. "Umum". */
  service: string;
  /** Nama loket, mis. "Loket 1". */
  name: string;
  sortOrder: number;
  /** Bila false, disembunyikan dari daftar pilihan tanpa dihapus. */
  isActive: boolean;
}

export interface QueueCounterInput {
  id?: string;
  service: string;
  name: string;
  isActive: boolean;
}

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export const state = reactive({
  counters: [] as QueueCounter[],
  loading: false,
  error: "",
});

/** Loket yang aktif (dipakai halaman Pemanggil). */
export const activeCounters = computed(() =>
  state.counters.filter((c) => c.isActive),
);

/** Loket aktif untuk satu layanan; layanan kosong = semua loket aktif. */
export function countersForService(service: string): QueueCounter[] {
  const svc = service.trim();
  if (!svc) return activeCounters.value;
  return activeCounters.value.filter((c) => c.service === svc);
}

function normalizeCounter(
  raw: Partial<QueueCounter> | null | undefined,
): QueueCounter | null {
  if (!raw || !raw.id || !raw.name) return null;
  return {
    id: String(raw.id),
    service: String(raw.service ?? "").trim(),
    name: String(raw.name).trim(),
    sortOrder: Number(raw.sortOrder ?? 0),
    isActive: raw.isActive !== false,
  };
}

function sortCounters() {
  state.counters = [...state.counters].sort(
    (a, b) =>
      a.service.localeCompare(b.service) ||
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name),
  );
}

/** Muat daftar loket dari backend. */
export async function loadCounters() {
  state.loading = true;
  try {
    const res = await apiGet<ApiEnvelope<QueueCounter[]>>("/api/queue/counters");
    state.counters = (res.data ?? [])
      .map((item) => normalizeCounter(item))
      .filter((item): item is QueueCounter => item !== null);
    sortCounters();
    state.error = "";
  } catch (err) {
    state.error = (err as Error).message || "Gagal memuat daftar loket";
  } finally {
    state.loading = false;
  }
}

/** Tambah loket di database. */
export async function createCounter(
  input: QueueCounterInput,
): Promise<QueueCounter> {
  const res = await apiPost<ApiEnvelope<QueueCounter>>("/api/queue/counters", {
    id: input.id?.trim() || null,
    service: input.service.trim(),
    name: input.name.trim(),
    isActive: input.isActive,
  });

  const counter = normalizeCounter(res.data);
  if (!counter) throw new Error("Respons loket dari server tidak valid");

  state.counters.push(counter);
  sortCounters();
  return counter;
}

/** Simpan perubahan loket ke database. */
export async function updateCounter(
  input: QueueCounterInput & { id: string },
): Promise<QueueCounter> {
  const res = await apiPut<ApiEnvelope<QueueCounter>>(
    `/api/queue/counters/${encodeURIComponent(input.id)}`,
    {
      service: input.service.trim(),
      name: input.name.trim(),
      isActive: input.isActive,
    },
  );

  const counter = normalizeCounter(res.data);
  if (!counter) throw new Error("Respons loket dari server tidak valid");

  const index = state.counters.findIndex((c) => c.id === counter.id);
  if (index >= 0) state.counters[index] = counter;
  sortCounters();
  return counter;
}

/** Hapus loket dari database. */
export async function deleteCounter(id: string) {
  await apiDelete<{ message: string }>(
    `/api/queue/counters/${encodeURIComponent(id)}`,
  );
  state.counters = state.counters.filter((c) => c.id !== id);
}

export function useCounters() {
  return {
    state,
    activeCounters,
    countersForService,
    loadCounters,
    createCounter,
    updateCounter,
    deleteCounter,
  };
}
