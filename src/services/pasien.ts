import { apiGet } from "./api";

// ── Data pasien (pelanggan) dari database master ─────────────────────
// Diambil lewat backend dari database MySQL `master`, tabel `pasien`.
// Dipakai halaman Pemanggil untuk mengisi nama pelanggan otomatis
// berdasarkan Nomor Rekam Medis (NORM).

export interface Pasien {
  norm: number;
  nama: string;
  panggilan: string | null;
  gelarDepan: string | null;
  gelarBelakang: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: number;
  alamat: string | null;
  rt: string | null;
  rw: string | null;
  kodepos: string | null;
  wilayah: string | null;
  agama: number | null;
  pendidikan: number | null;
  pekerjaan: number | null;
  statusPerkawinan: number | null;
  golonganDarah: number | null;
  kewarganegaraan: number;
  suku: number;
  tidakDikenal: number;
  bahasa: string;
  lockAkses: number;
  tanggal: string | null;
  oleh: number | null;
  status: number;
}

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

/** Nama tampil pelanggan: pakai gelar depan + nama + gelar belakang. */
export function namaLengkap(p: Pasien): string {
  return [p.gelarDepan, p.nama, p.gelarBelakang]
    .filter((v) => v && String(v).trim().length > 0)
    .join(" ")
    .trim();
}

/**
 * Ambil satu pasien berdasarkan NORM (id pelanggan).
 * Melempar error bila tidak ditemukan (404) atau gagal.
 */
export async function getPasienByNorm(norm: number): Promise<Pasien | null> {
  try {
    const res = await apiGet<ApiEnvelope<Pasien>>(
      `/api/pasien/${encodeURIComponent(norm)}`,
    );
    return res.data ?? null;
  } catch (err) {
    // 404 → kembalikan null tanpa memunculkan error modal.
    const msg = (err as Error).message ?? "";
    if (/404|tidak ditemukan/i.test(msg)) return null;
    throw err;
  }
}
