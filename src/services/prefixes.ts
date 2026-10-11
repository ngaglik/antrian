import { computed, reactive } from "vue";
import { apiDelete, apiGet, apiPost, apiPut } from "./api";

// ── Prefiks nomor antrian ───────────────────────────────────────────
// Daftar prefiks (kode + nama layanan) disimpan di DATABASE melalui backend
// (tabel que.queue_prefix). Tiap prefiks dapat dimiliki satu ruang
// (que.kiosk_room.id) atau tanpa ruang ("" = semua ruang).

export interface QueuePrefix {
  id: string;
  /** Kode prefiks pada nomor antrian, mis. "A" → A001. */
  code: string;
  /** Nama layanan, mis. "Umum". */
  service: string;
  /** Id ruang pemilik prefiks; "" = semua ruang. */
  roomId: string;
  sortOrder: number;
  /** Bila false, disembunyikan dari kiosk tanpa dihapus. */
  isActive: boolean;
}

export interface QueuePrefixInput {
  id?: string;
  code: string;
  service: string;
  roomId: string;
  isActive: boolean;
}

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export const state = reactive({
  prefixes: [] as QueuePrefix[],
  loading: false,
  error: "",
});

/** Prefiks yang aktif (dipakai halaman Kiosk). */
export const activePrefixes = computed(() =>
  state.prefixes.filter((p) => p.isActive),
);

/** Prefiks aktif yang berlaku untuk satu ruang (milik ruang + prefiks bersama). */
export function prefixesForRoom(roomId: string): QueuePrefix[] {
  return activePrefixes.value.filter((p) => !p.roomId || p.roomId === roomId);
}

function normalizePrefix(
  raw: Partial<QueuePrefix> | null | undefined,
): QueuePrefix | null {
  if (!raw || !raw.id || !raw.code) return null;
  return {
    id: String(raw.id),
    code: String(raw.code).trim().toUpperCase(),
    service: String(raw.service ?? "").trim(),
    roomId: String(raw.roomId ?? "").trim(),
    sortOrder: Number(raw.sortOrder ?? 0),
    isActive: raw.isActive !== false,
  };
}

function sortPrefixes() {
  state.prefixes = [...state.prefixes].sort(
    (a, b) =>
      a.roomId.localeCompare(b.roomId) ||
      a.sortOrder - b.sortOrder ||
      a.code.localeCompare(b.code),
  );
}

/** Muat daftar prefiks dari backend. */
export async function loadPrefixes() {
  state.loading = true;
  try {
    const res = await apiGet<ApiEnvelope<QueuePrefix[]>>("/api/queue/prefixes");
    state.prefixes = (res.data ?? [])
      .map((item) => normalizePrefix(item))
      .filter((item): item is QueuePrefix => item !== null);
    sortPrefixes();
    state.error = "";
  } catch (err) {
    state.error = (err as Error).message || "Gagal memuat prefiks nomor antrian";
  } finally {
    state.loading = false;
  }
}

/** Tambah prefiks di database. */
export async function createPrefix(
  input: QueuePrefixInput,
): Promise<QueuePrefix> {
  const res = await apiPost<ApiEnvelope<QueuePrefix>>("/api/queue/prefixes", {
    id: input.id?.trim() || null,
    code: input.code.trim(),
    service: input.service.trim(),
    roomId: input.roomId,
    isActive: input.isActive,
  });

  const prefix = normalizePrefix(res.data);
  if (!prefix) throw new Error("Respons prefiks dari server tidak valid");

  state.prefixes.push(prefix);
  sortPrefixes();
  return prefix;
}

/** Simpan perubahan prefiks ke database. */
export async function updatePrefix(
  input: QueuePrefixInput & { id: string },
): Promise<QueuePrefix> {
  const res = await apiPut<ApiEnvelope<QueuePrefix>>(
    `/api/queue/prefixes/${encodeURIComponent(input.id)}`,
    {
      code: input.code.trim(),
      service: input.service.trim(),
      roomId: input.roomId,
      isActive: input.isActive,
    },
  );

  const prefix = normalizePrefix(res.data);
  if (!prefix) throw new Error("Respons prefiks dari server tidak valid");

  const index = state.prefixes.findIndex((p) => p.id === prefix.id);
  if (index >= 0) state.prefixes[index] = prefix;
  sortPrefixes();
  return prefix;
}

/** Hapus prefiks dari database. */
export async function deletePrefix(id: string) {
  await apiDelete<{ message: string }>(
    `/api/queue/prefixes/${encodeURIComponent(id)}`,
  );
  state.prefixes = state.prefixes.filter((p) => p.id !== id);
}

export function usePrefixes() {
  return {
    state,
    activePrefixes,
    prefixesForRoom,
    loadPrefixes,
    createPrefix,
    updatePrefix,
    deletePrefix,
  };
}
