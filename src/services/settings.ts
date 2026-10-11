import { computed, reactive } from "vue";
import { apiDelete, apiGet, apiPost, apiPut } from "./api";

// ── Pengaturan kiosk (multi ruang) ──────────────────────────────────
// Daftar ruang disimpan di DATABASE melalui backend (tabel que.kiosk_room),
// sehingga berlaku untuk semua perangkat. Sedangkan ruang yang sedang dipakai
// (aktif) disimpan per-perangkat di localStorage — tiap PC petugas bisa
// menembak kiosk ruangannya sendiri.

export interface KioskRoom {
  /** Id ruang dari database, mis. "poli-gigi" atau "ruang-a1b2c3". */
  id: string;
  /** Nama ruang / lokasi, mis. "Poli Gigi". */
  name: string;
  /** Base URL service kiosk, mis. http://192.168.1.50:9292 (kosong = default server). */
  baseUrl: string;
  /** Token kiosk (opsional). */
  token: string;
}

/** Payload yang dikirim ke backend untuk memilih kiosk tujuan. */
export interface KioskTargetPayload {
  baseUrl: string;
  token: string;
  room: string;
}

/** Payload tambah/ubah ruang. */
export interface KioskRoomInput {
  id?: string;
  name: string;
  baseUrl: string;
  token: string;
}

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

const ACTIVE_KEY = "antrian.kiosk.activeRoomId";

export const state = reactive({
  rooms: [] as KioskRoom[],
  activeRoomId: "",
  loading: false,
  error: "",
});

export const activeRoom = computed<KioskRoom | null>(
  () =>
    state.rooms.find((r) => r.id === state.activeRoomId) ?? state.rooms[0] ?? null,
);

function normalizeRoom(raw: Partial<KioskRoom> | null | undefined): KioskRoom | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    name: String(raw.name ?? "").trim(),
    baseUrl: String(raw.baseUrl ?? "").trim(),
    token: String(raw.token ?? "").trim(),
  };
}

/** Pastikan ruang aktif masih ada; kalau tidak, pakai pilihan tersimpan berikutnya. */
function syncActiveRoom() {
  if (!state.rooms.some((r) => r.id === state.activeRoomId)) {
    const stored = localStorage.getItem(ACTIVE_KEY) || "";
    state.activeRoomId = state.rooms.some((r) => r.id === stored)
      ? stored
      : state.rooms[0]?.id ?? "";
  }
  if (state.activeRoomId) localStorage.setItem(ACTIVE_KEY, state.activeRoomId);
}

/** Muat daftar ruang dari backend. */
export async function loadRooms() {
  state.loading = true;
  try {
    const res = await apiGet<ApiEnvelope<KioskRoom[]>>("/api/queue/kiosk/rooms");
    state.rooms = (res.data ?? [])
      .map((item) => normalizeRoom(item))
      .filter((item): item is KioskRoom => item !== null);
    state.error = "";
    syncActiveRoom();
  } catch (err) {
    state.error = (err as Error).message || "Gagal memuat ruang kiosk";
  } finally {
    state.loading = false;
  }
}

/** Tambah ruang di database. */
export async function createRoom(input: KioskRoomInput): Promise<KioskRoom> {
  const res = await apiPost<ApiEnvelope<KioskRoom>>("/api/queue/kiosk/rooms", {
    id: input.id?.trim() || null,
    name: input.name,
    baseUrl: input.baseUrl,
    token: input.token,
  });

  const room = normalizeRoom(res.data);
  if (!room) throw new Error("Respons ruang dari server tidak valid");

  state.rooms.push(room);
  syncActiveRoom();
  return room;
}

/** Simpan perubahan ruang ke database. */
export async function updateRoom(
  input: KioskRoomInput & { id: string },
): Promise<KioskRoom> {
  const res = await apiPut<ApiEnvelope<KioskRoom>>(
    `/api/queue/kiosk/rooms/${encodeURIComponent(input.id)}`,
    { name: input.name, baseUrl: input.baseUrl, token: input.token },
  );

  const room = normalizeRoom(res.data);
  if (!room) throw new Error("Respons ruang dari server tidak valid");

  const index = state.rooms.findIndex((r) => r.id === room.id);
  if (index >= 0) state.rooms[index] = room;
  return room;
}

/** Hapus ruang dari database. */
export async function deleteRoom(id: string) {
  await apiDelete<{ message: string }>(
    `/api/queue/kiosk/rooms/${encodeURIComponent(id)}`,
  );
  state.rooms = state.rooms.filter((r) => r.id !== id);
  syncActiveRoom();
}

/** Pilih ruang aktif (per-perangkat). */
export function setActiveRoom(id: string) {
  if (!state.rooms.some((r) => r.id === id)) return;
  state.activeRoomId = id;
  localStorage.setItem(ACTIVE_KEY, id);
}

/** Target kiosk aktif untuk dikirim ke API. `baseUrl` kosong = pakai default server. */
export function kioskTarget(): KioskTargetPayload {
  const room = activeRoom.value;
  return {
    baseUrl: room?.baseUrl ?? "",
    token: room?.token ?? "",
    room: room?.name ?? "",
  };
}

export function useSettings() {
  return {
    state,
    activeRoom,
    loadRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    setActiveRoom,
    kioskTarget,
  };
}
