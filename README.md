# Sistem Antrian

Aplikasi antrian 3-in-1: **Kiosk** (ambil nomor + cetak tiket), **Pemanggil**
(panggil & proses antrian), dan **Monitoring** (daftar antrian realtime).

Frontend: Vue 3 + Vite + Naive UI. Backend: modul `que` pada `erp/backend`
(ASP.NET Core minimal API) dengan realtime **Server-Sent Events (SSE)** —
tanpa dependency tambahan di sisi klien.

## Fitur

| Halaman | Fungsi |
| --- | --- |
| `/kiosk` | Tombol **Ambil Nomor Antrian** — pilihan layanan mengikuti **prefiks aktif milik ruang kiosk ini** (diatur di halaman Pengaturan; mis. A = Umum), tiket dicetak otomatis (**jumlah salinan** diatur di Pengaturan → Cetak, print 80mm), bisa cetak ulang. **Header/navigasi disembunyikan otomatis** di halaman ini (tombol **☰** di pojok kanan atas untuk menampilkan/menyembunyikan) |
| `/pemanggil` | 🔒 **Perlu login.** Pilih loket, **klik kartu antrian** untuk memanggil, tombol *Panggil Berikutnya*, *Mulai Proses*, *Selesai*, *Lewati*, *Reset*. Tombol **➕ Baru** membuka modal untuk **membuat nomor antrian baru** dari loket (pilih layanan sesuai ruang, plus isian **nama pelanggan** opsional — halaman Kiosk tidak memakai isian ini). Nomor hasil modal ini **langsung masuk proses** (Sedang Diproses) di loket terpilih, **tanpa melewati daftar menunggu**, dan **langsung dipanggil lewat suara** (template panggilan awal). Tombol **🎫 Ambil & Proses** / **🖨 Ambil, Proses & Cetak**; tiket dicetak **beberapa salinan** sesuai Pengaturan → Cetak (termasuk tombol **🖨 Cetak** pada kartu aktif). Tersedia toggle **Panggil berikutnya saat selesai** serta pilihan **Ruang**, **Layanan**, dan **Loket** — daftar pilihan **Loket** menyesuaikan **layanan** yang dipilih (loket terkonfigurasi per layanan di halaman Pengaturan). Tombol **📣 Panggil Konfirmasi** pada kartu aktif membacakan template konfirmasi memakai **loket dari filter Loket** (loket tiket ikut disamakan dengan filter; status tiket tidak berubah). Menampilkan **peringatan** bila koneksi monitoring realtime terputus |
| `/monitoring` | Panel **nomor dipanggil** besar (**satu kartu per loket** — menampilkan nama loket, nomor terakhir yang dipanggil di loket itu, layanan, nama pelanggan, status; nomor yang sedang dipanggil konfirmasi **disorot** dengan badge + kedip ±15 detik) + ringkasan + **Daftar Antrian** ukuran besar (kolom: kode, **nama pelanggan disensor**, layanan, status, loket, jam) yang **menggulir otomatis ke atas** (berhenti sementara saat kursor di atas daftar; mengikuti `prefers-reduced-motion`), ikut ter-update realtime. **Tanpa login** |
| `/monitoring/{room_id}` | Sama seperti `/monitoring`, tetapi **hanya menampilkan antrian satu ruang** (id ruang diambil dari parameter URL, mis. `/monitoring/poli-gigi`). Berguna untuk layar TV per ruang. Tiket berprefiks **bersama** (tanpa ruang) tetap ditampilkan. Tanpa parameter = semua ruang |
| `/login` | Halaman masuk (username + password) untuk halaman Pemanggil/Pengaturan/Uji Suara |

Nama pelanggan di layar Monitoring **disensor sebagian**: 2 huruf awal tiap kata,
sisanya diganti `*` (kata pendek → 1 huruf). Contoh: `Budi Santoso` →
`Bu** Sa*****`. Tiket dari Kiosk (tanpa nama) ditampilkan sebagai `—`.
| `/uji-suara` | 🔒 **Perlu login.** **Uji suara (Text-to-Speech)**: tulis paragraf bebas lalu klik **Dengarkan**. Ada tombol **Hentikan**, pengulangan 1–3x, dan tip `Ctrl+Enter` |
| `/pengaturan` | 🔒 **Perlu login.** **Pengaturan** (lima tab, tersimpan di database): <br>**🔊 Ruang Kiosk** — daftar ruang (nama + base URL service `backend-tts` + token), pilih ruang aktif, uji koneksi; <br>**🔢 Prefiks Layanan** — kelola kode prefiks + nama layanan yang muncul di halaman Kiosk, lengkap dengan aktif/nonaktif (tombol **Loket** per baris membuka modal kelola loket layanan); <br>**📢 Pemanggilan** — checkbox kapan nomor dibacakan pada tiap tahap proses (panggilan awal / panggilan ulang / sedang diproses / selesai / konfirmasi); <br>**📝 Template Teks Panggilan** — kalimat (TTS) tiap tahap dengan token `{number}`, `{counter}`, `{service}`, `{customer}`, plus pratinjau; <br>**🖨 Cetak** — jumlah salinan tiket yang dicetak |

Semua halaman menampilkan **judul besar nama ruang aktif** di bagian atas konten
(mis. “Ruang / Poli Gigi”). Ruang aktif dipilih per-perangkat di halaman
Pengaturan, dan judul ini tetap tampil walau header/navigasi disembunyikan
(halaman Kiosk).

Status antrian: `waiting` (menunggu/masuk) → `called` (dipanggil) →
`serving` (sedang diproses) → `done` (selesai), plus `skipped` (dilewati).

## Menjalankan

```bash
# 1. Backend (dari erp/backend)
dotnet run            # http://127.0.0.1:8000, otomatis membuat skema que

# 2. Frontend (dari erp/antrian)
pnpm install          # atau npm install
npm run dev           # http://localhost:5180 (proxy /api → backend)
```

Buka `http://localhost:5180/` → otomatis ke halaman **Kiosk**. Buka halaman
Kiosk di PC ruang tunggu, Pemanggil di PC petugas, Monitoring di layar TV.

Konfigurasi environment dimuat Vite dari `.env.development` (untuk `npm run dev`)
dan `.env.production` (untuk `npm run build`):

| Variabel | Dipakai oleh | Keterangan |
| --- | --- | --- |
| `VITE_BACKEND_URL` | `vite.config.ts` | Alamat backend = target **dev proxy** Vite. Default dev `http://127.0.0.1:8000`. Tidak berpengaruh pada build produksi. |
| `VITE_API_BASE` | `src/services/api.ts` | Base URL API untuk browser. **Kosong** (default) = request relatif → dev lewat proxy Vite, produksi same-origin (nginx). Isi hanya bila API berada di origin lain (butuh CORS di backend). |

```
# .env.development
VITE_BACKEND_URL=http://127.0.0.1:8000   # target dev proxy
VITE_API_BASE=                           # kosong = lewat proxy (bebas CORS)
```

- Override tanpa di-commit: buat `.env.development.local` /
  `.env.production.local` (sudah masuk `.gitignore`).
- Nilai juga bisa ditimpa dari shell, mis.
  `VITE_BACKEND_URL=http://10.0.0.5:8000 npm run dev`.
- Backend CORS (`erp/backend/Program.cs`) hanya mengizinkan origin tertentu, jadi
  untuk mode dev **biarkan** `VITE_API_BASE` kosong (proxy Vite di port `5180`
  tidak ada di daftar origin yang diizinkan).

## API Backend (`/api/queue`)

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/tickets` | Ambil nomor antrian baru → `{ prefix?, service?, customerName? }` |
| GET | `/tickets?date=&status=` | Daftar antrian (default hari ini) |
| GET | `/summary` | Snapshot ringkasan + daftar antrian |
| GET | `/stream` | **SSE** realtime (event `snapshot` + heartbeat `ping` tiap ≤15 detik) |
| POST | `/next` | Panggil nomor berikutnya → `{ counter? }` |
| POST | `/tickets/{id}/call` | Panggil nomor tertentu → `{ counter? }` |
| POST | `/tickets/{id}/confirm` | Panggil **konfirmasi** (suara, template `confirm`) untuk satu nomor; status tiket tidak berubah → `{ counter?, kiosk? }`. Bila `counter` diisi, loket itu yang dibacakan **dan** disimpan ke tiket (menyesuaikan filter Loket Pemanggil), sehingga kartu Monitoring menampilkan loket yang sama. Panggilan konfirmasi juga disiarkan realtime dan **disorot di halaman Monitoring** (badge + kedip ±15 detik). Dapat dinonaktifkan lewat pengaturan **e. Panggilan konfirmasi** |
| POST | `/tickets/{id}/status` | Ubah status → `{ status, counter?, autoCallNext?, announceDone?, announceCall? }`. Bila `autoCallNext: true` dan status `done`/`skipped`, nomor menunggu berikutnya otomatis dipanggil (dikembalikan pada field `next`). `announceDone` menimpa pengaturan suara saat selesai; `announceCall: true` memaksa panggilan awal (template call) meski status bukan `called` |
| POST | `/reset` | Hapus antrian satu tanggal (default hari ini) |
| POST | `/speak` | Bacakan teks/paragraf bebas (halaman **Uji Suara**) → `{ text, repeat?, kiosk? }`. Diteruskan ke service TTS sebagai `GET /speak?text=...&repeat=...` |
| POST | `/speak/stop` | Hentikan bacaan TTS → body target `{ baseUrl?, token?, room? }` (diteruskan sebagai `GET /stop`) |
| GET | `/kiosk` | Info kiosk default server (base URL, token, allow-list) |
| POST | `/kiosk/ping` | Uji koneksi ke satu kiosk → body `{ baseUrl?, token?, room? }`, mengembalikan `GET /health` kiosk |
| GET | `/kiosk/rooms` | Daftar ruang kiosk (tabel `que.kiosk_room`) |
| POST | `/kiosk/rooms` | Tambah ruang → `{ id?, name, baseUrl?, token? }` |
| PUT | `/kiosk/rooms/{id}` | Ubah ruang → `{ name, baseUrl?, token? }` |
| DELETE | `/kiosk/rooms/{id}` | Hapus ruang (minimal satu ruang harus tersisa) |
| GET | `/prefixes?activeOnly=&roomId=` | Daftar prefiks nomor antrian; `roomId` = prefiks ruang tsb + prefiks bersama |
| POST | `/prefixes` | Tambah prefiks → `{ id?, code, service, roomId?, isActive? }` |
| PUT | `/prefixes/{id}` | Ubah prefiks → `{ code, service, roomId?, isActive? }` |
| DELETE | `/prefixes/{id}` | Hapus prefiks (minimal satu prefiks harus tersisa) |
| GET | `/counters?activeOnly=&service=` | Daftar loket per layanan (tabel `que.queue_counter`) |
| POST | `/counters` | Tambah loket → `{ id?, service, name, isActive? }` |
| PUT | `/counters/{id}` | Ubah loket → `{ service, name, isActive? }` |
| DELETE | `/counters/{id}` | Hapus loket |
| GET | `/print-settings` | Jumlah salinan tiket yang dicetak (tabel `que.call_setting.print_copies`) |
| PUT | `/print-settings` | Simpan → `{ copies }` (1–10) |
| GET | `/call-settings` | Pengaturan pemanggilan suara per tahap proses (termasuk template teks) |
| PUT | `/call-settings` | Simpan → `{ announceOnCall?, announceOnRecall?, announceOnServing?, announceOnDone?, announceOnConfirm?, callTemplate?, servingTemplate?, doneTemplate?, confirmTemplate? }` (field yang dikirim saja yang diubah) |

Endpoint yang memicu suara (`/next`, `/tickets/{id}/call`, `/tickets/{id}/status`,
`/speak`) menerima objek **`kiosk`** opsional:
`{ "kiosk": { "baseUrl": "http://192.168.1.50:9292", "token": "", "room": "Poli Gigi" } }`.
Bila `baseUrl` kosong, dipakai `Kiosk:BaseUrl` default. Inilah yang membuat
**multi kiosk** mungkin.

Endpoint **publik** (tanpa login): `POST /tickets`, `GET /tickets`, `/summary`,
`/stream`, `GET /prefixes`, `GET /counters`, `GET /print-settings`, dan
`GET /kiosk/rooms` — supaya **Kiosk** dan **Monitoring** jalan tanpa login.

Endpoint berikut **perlu login** (`Authorization: Bearer <token>`):
`/next`, `/tickets/{id}/call`, `/tickets/{id}/confirm`, `/tickets/{id}/status`,
`/reset`, `/speak`,
`/speak/stop`, `/kiosk`, `/kiosk/ping`, tulis ruang (`POST/PUT/DELETE
/kiosk/rooms`), tulis prefiks (`POST/PUT/DELETE /prefixes`), tulis loket
(`POST/PUT/DELETE /counters`), dan `/call-settings`, serta `PUT /print-settings`.

## Login / Autentikasi

Login hanya untuk halaman operator: **Pemanggil**, **Pengaturan**, dan **Uji
Suara**. **Kiosk** dan **Monitoring** tetap terbuka tanpa login.

- `/login` memanggil `POST /api/auth/login` → `{ username, password, appId }`
  (tabel `user_login` di backend).
- Token JWT disimpan di `localStorage` dan otomatis dikirim sebagai header
  `Authorization: Bearer <token>` untuk semua request API.
- `appId` diambil dari `VITE_APP_ID` (default `antrian`) — lihat `.env.*`.
- Token tidak ada/kedaluwarsa (respons `401`) → sesi dibersihkan dan pengguna
  diarahkan ke `/login` (tujuan semula disimpan di `?redirect=`).
- Tombol **Masuk/Keluar** tersedia di header aplikasi.
- `GET /kiosk/rooms` publik, tetapi **token kiosk hanya dikirim ke klien yang
  terautentikasi**; setelah login daftar ruang dimuat ulang agar token tersedia
  untuk pengumuman TTS.
- ⚠️ `Jwt:Key` di `erp/backend/appsettings.json` masih nilai contoh — ganti
  dengan kunci acak yang kuat sebelum dipakai di produksi.

## Suara / Text-to-Speech (multi kiosk)

Pengumuman nomor antrian dan halaman **Uji Suara** memakai service TTS eksternal
melalui URL (kontrak `GET /call`, `GET /speak`, `GET /stop`). Satu sistem antrian
dapat menembak **beberapa kiosk** (per ruangan) — diatur dari halaman
**Pengaturan** di frontend.

Konfigurasi di `erp/backend` (`appsettings.json`) atau environment variable:

```
Kiosk__BaseUrl=http://127.0.0.1:9292   # kiosk default (fallback)
Kiosk__Repeats=1
Kiosk__Token=rahasia                   # bila kiosk dijalankan dengan --token
Kiosk__AllowedHosts=192.168.1.50,192.168.1.51   # opsional; kosong = semua host
```

Bila `Kiosk:BaseUrl` kosong dan tidak ada target per-request, pengumuman dilewati
dan halaman Uji Suara mengembalikan `503` (*"Kiosk TTS belum dikonfigurasi"*).

Service TTS yang dipakai: **`erp/backend-tts`** (ASP.NET Core, engine `edge`,
voice `id-ID-GadisNeural`, default port `9292`) — lihat
`erp/backend-tts/README.md`
(`./run.sh --engine edge --voice id-ID-GadisNeural`). Referensi lain dengan
kontrak sama: `erp/backend-text-to-speech`.

### Halaman Pengaturan

Menu **⚙ Pengaturan** (`/pengaturan`) berisi lima tab; semuanya tersimpan di
**database** lewat backend:

**🔊 Ruang Kiosk** — daftar **ruang**: nama ruang + base URL kiosk (+ token
opsional). Ruang aktif dipakai untuk semua pengumuman; pemilih ruang juga
tersedia di header halaman **Pemanggil** dan **Uji Suara**.

- Tabel `que.kiosk_room`, API `/api/queue/kiosk/rooms`. Perubahan disimpan dengan
  tombol **Simpan** (atau **Tambah** / **Hapus**).
- **Ruang aktif dipilih per-perangkat** (localStorage) — tiap PC petugas bisa
  menembak kiosk ruangannya sendiri.
- Base URL tanpa `http://` otomatis dilengkapi; kosong = pakai kiosk default
  server (`Kiosk:BaseUrl`).
- Tombol **Uji Koneksi** memanggil `POST /api/queue/kiosk/ping` (diteruskan ke
  `GET /health` kiosk) — lewat backend sehingga bebas CORS.
- `Kiosk:AllowedHosts` membatasi host kiosk yang boleh dituju (anti-SSRF); hanya
  skema `http`/`https` yang diterima.

**🔢 Prefiks Layanan** — kelola kode prefiks + nama layanan yang muncul
sebagai tombol di halaman **Kiosk**, dan **ruang** pemiliknya.

- Tabel `que.queue_prefix`, API `/api/queue/prefixes`.
- Contoh: kode `A` + layanan `Umum` → nomor antrian `A001` dan tombol “A / Umum”
  di kiosk. Kode 1–5 huruf/angka, otomatis jadi huruf besar, dan unik.
- **Kolom Ruang**: tiap prefiks dapat dimiliki satu ruang (`que.kiosk_room.id`).
  Kiosk ruang tersebut hanya menampilkan prefiks miliknya; pilihan _Semua ruang_
  (kosong) berlaku untuk semua kiosk. Ruang yang masih dipakai prefiks tidak
  dapat dihapus — pindahkan atau hapus prefiksnya terlebih dahulu.
- Filter **Tampilkan** di atas daftar untuk melihat prefiks per ruang, termasuk
  kelompok “Tanpa ruang (bersama)”.
- Prefiks dapat dinonaktifkan (tombol **Aktif**) sehingga disembunyikan dari
  kiosk tanpa dihapus. Bila tidak ada prefiks aktif untuk ruang itu, kiosk
  menampilkan pesan “belum ada layanan aktif”.
- Nomor antrian yang sudah terbit tidak terpengaruh saat prefiks diubah/dihapus.
- Tombol **Loket** di setiap baris layanan membuka **modal** untuk mengatur
  daftar loket tiap layanan (lihat bagian Loket di bawah).

### Loket (di dalam tab Prefiks Layanan)

Daftar **loket** dikelola per **layanan**, dibuka lewat tombol **Loket** pada
tiap baris data layanan (modal).

- Tabel `que.queue_counter`, API `/api/queue/counters`.
- Setiap loket dimiliki satu **layanan** (nama layanan sama dengan prefiks,
  mis. `Umum`). Nama loket unik dalam satu layanan.
- Nama loket boleh ditulis apa adanya — `1` maupun `Loket 1` sama-sama
  ditampilkan sebagai “Loket 1” dan dibacakan “loket satu” (kata “Loket” tidak
  digandakan, termasuk pada suara TTS).
- Di halaman **Pemanggil**, pilihan **Loket** pada baris filter menyesuaikan
  **Layanan** yang dipilih (loket untuk layanan tersebut). Bila belum ada loket
  terkonfigurasi, dipakai pilihan bawaan `1`–`5`.
- Loket dapat dinonaktifkan (tombol **Aktif**) tanpa dihapus.
- Nomor antrian yang sudah terbit tidak terpengaruh saat loket diubah/dihapus.

**📢 Pemanggilan** — atur kapan nomor dibacakan (TTS) pada tiap tahap proses:

- **a. Panggilan awal saat klik daftar menunggu** — saat nomor dipanggil pertama kali
  (klik kartu daftar menunggu, tombol **Panggil Berikutnya**, atau auto-call-next).
- **b. Panggilan ulang** — saat nomor yang sudah dipanggil/diproses dipanggil lagi
  (tombol **Panggil Ulang**). Panggilan ulang dikenali otomatis dari status tiket
  sebelum dipanggil (called/serving), tanpa perlu tombol terpisah.
- **c. Panggilan saat sedang diproses** — saat status berubah menjadi *Sedang
  Diproses*.
- **d. Panggilan saat selesai** — saat status berubah menjadi *Selesai*.
- **e. Panggilan konfirmasi** — mengizinkan tombol **Panggil Konfirmasi** di
  halaman Pemanggil membacakan template konfirmasi (template diatur di tab
  **📝 Template Teks Panggilan**).

Tabel `que.call_setting`, API `/api/queue/call-settings`. Default: **(a)**, **(b)**,
dan **(e)** aktif (perilaku lama), (c) dan (d) nonaktif. Pengumuman dikirim ke **ruang yang sedang
aktif**, dan teks tiap tahap diatur di tab **📝 Template Teks Panggilan** di bawah.

**📝 Template Teks Panggilan** — atur kalimat yang dibacakan (TTS) pada tiap tahap:

- Empat template: **panggilan awal**, **sedang diproses**, **selesai**, dan
  **konfirmasi** — ditentukan per `phase=call|serving|done|confirm` saat pengumuman
  dikirim ke service TTS.
- Token yang tersedia: `{number}` (nomor antrian, dieja per digit), `{counter}` (loket,
  kosong → “loket pelayanan”), `{service}` (layanan, kosong → dihapus otomatis), dan
  `{customer}` (menjadi “ atas nama …” bila nama pelanggan diisi petugas;
  kosong → dihapus otomatis).
- Tersimpan bersama pengaturan pemanggilan di tabel `que.call_setting`
  (`call_template`, `serving_template`, `done_template`, `confirm_template`). Tombol **Kembalikan default**
  mengisi ulang template bawaan sebelum disimpan.
- Backend mengirim template terpilih ke service TTS sebagai parameter `template` pada
  `GET /call`; bila kosong, service TTS memakai template bawaannya
  (`--call-template`, `--serving-template`, `--done-template`).

**🖨 Cetak** — atur jumlah **salinan** tiket antrian yang dicetak setiap kali cetak
(otomatis di **Kiosk** maupun tombol **Cetak** di **Pemanggil**).

- Tersimpan di tabel `que.call_setting` (`print_copies`, default 2), API
  `/api/queue/print-settings` (`GET` publik, `PUT` perlu login).
- Nilai 1–10 salinan per tiket.

## Struktur

```
erp/antrian
├── index.html
├── vite.config.ts          # base /antrian/, dev proxy /api, port 5180
└── src
    ├── App.vue             # shell + navigasi + indikator realtime
    ├── components/Provider.vue
    ├── container
    │   ├── Kiosk.vue       # ambil nomor + cetak (layanan dari prefiks aktif)
    │   ├── Pemanggil.vue   # panggil & proses
    │   ├── Monitoring.vue  # tampilan realtime
    │   ├── UjiSuara.vue    # uji TTS: paragraf bebas + tombol Dengarkan
    │   ├── Pengaturan.vue  # shell tab pengaturan
    │   ├── Login.vue       # halaman masuk (username + password)
    │   └── pengaturan
    │       ├── RuangKiosk.vue    # tab: ruang kiosk (nama + base URL)
    │       ├── PrefiksNomor.vue  # tab: prefiks layanan (kode + nama layanan) + modal loket
    │       ├── LoketModal.vue    # modal: kelola loket per layanan (dari tombol Loket baris)
    │       ├── Pemanggilan.vue   # tab: pengaturan pemanggilan (TTS) per tahap
    │       ├── TemplateTeks.vue  # tab: template teks panggilan (TTS) per tahap
    │       └── Cetak.vue         # tab: jumlah salinan cetak tiket
    ├── router/router.ts    # route + guard login (meta.requiresAuth)
    └── services
        ├── api.ts          # tipe, helper fetch (+ header auth & 401), formatter
        ├── auth.ts         # login/logout + token JWT (localStorage)
        ├── queueStore.ts   # state global + koneksi SSE + aksi
        ├── settings.ts     # ruang kiosk dari API + ruang aktif per-perangkat
        ├── prefixes.ts     # prefiks layanan dari API
        ├── counters.ts     # loket per layanan dari API
        ├── callSettings.ts # pengaturan pemanggilan + template teks (TTS) per tahap
        └── printSettings.ts # jumlah salinan cetak tiket dari API
```

## Produksi

- Build: `npm run build` → `dist/` (base URL `/antrian/`).
- Backend mode Production listen di **`http://127.0.0.1:4433`** (lihat
  `erp/backend/Program.cs`) — pastikan `proxy_pass` nginx menunjuk ke port ini,
  bukan `:8000` (port non-production).
- Frontend di-serve same-origin; `/api/` di-proxy ke backend. Karena
  **SSE**, endpoint `/api/queue/stream` **wajib tanpa buffering**.

### Contoh konfigurasi nginx

```nginx
# Frontend hasil build (dist/)
location /antrian/ {
    alias /var/www/antrian/;                  # isi dari erp/antrian/dist
    try_files $uri $uri/ /antrian/index.html;
}

# API umum
location /api/ {
    proxy_pass         http://127.0.0.1:4433;
    proxy_http_version 1.1;                   # WAJIB (default nginx = HTTP/1.0)
    proxy_set_header   Connection "";
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}

# Khusus SSE — exact match, menang dari prefix /api/. HARUS tanpa buffering.
location = /api/queue/stream {
    proxy_pass         http://127.0.0.1:4433;
    proxy_http_version 1.1;
    proxy_set_header   Connection "";
    proxy_set_header   Host              $host;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    proxy_buffering           off;
    proxy_cache               off;
    gzip                      off;
    chunked_transfer_encoding on;
    proxy_read_timeout        1h;             # jangan 60s (default)
    proxy_send_timeout        1h;
}
```

Backend juga sudah mengirim `X-Accel-Buffering: no` dan
`Cache-Control: no-cache, no-transform`, serta **heartbeat `event: ping` setiap
≤15 detik** sehingga koneksi tidak diputus proxy yang idle.

### Bila Monitoring error di produksi

Gejala umum `GET https://<host>/api/queue/stream` gagal — cek **status code**-nya:

| Status / gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| **404** | nginx tidak mem-proxy `/api/` | tambahkan `location /api/` |
| **502** | port upstream salah / backend mati. Production = `127.0.0.1:4433` | samakan `proxy_pass` dengan `Program.cs` |
| **504** atau stream putus ~30–60 detik | `proxy_buffering on` / `proxy_read_timeout 60s` / `proxy_http_version 1.0` | pakai blok SSE di atas |
| CORS (`blocked by CORS policy`) | `VITE_API_BASE` diisi ke origin lain yang tidak ada di `Program.cs` | kosongkan `VITE_API_BASE` (same-origin) atau tambahkan origin-nya |
| Frontend tampil “Koneksi monitoring terputus” | koneksi stream mati / data tidak mengalir | lihat baris di atas |

## Database

Skema otomatis dibuat saat backend start (lihat `Program.cs`, blok
*Auto-migrate que schema*):

```sql
CREATE SCHEMA IF NOT EXISTS que;
CREATE TABLE IF NOT EXISTS que.ticket (
    id SERIAL PRIMARY KEY,
    queue_date DATE NOT NULL,
    prefix VARCHAR(5) NOT NULL DEFAULT 'A',
    number INT NOT NULL,
    code VARCHAR(10) NOT NULL,
    service VARCHAR(100),
    customer_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    counter VARCHAR(20),
    called_at TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ruang kiosk TTS (multi kiosk); diisi minimal satu ruang default
CREATE TABLE IF NOT EXISTS que.kiosk_room (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT '',
    base_url VARCHAR(255) NOT NULL DEFAULT '',
    token VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prefiks nomor antrian (tombol layanan di kiosk); diisi default A/B/C
CREATE TABLE IF NOT EXISTS que.queue_prefix (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(5) NOT NULL,
    service VARCHAR(100) NOT NULL DEFAULT '',
    room_id VARCHAR(50) NOT NULL DEFAULT '',   -- '' = semua ruang
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_queue_prefix_code ON que.queue_prefix (code);

-- Loket per layanan (daftar pilihan loket di halaman Pemanggil)
CREATE TABLE IF NOT EXISTS que.queue_counter (
    id VARCHAR(50) PRIMARY KEY,
    service VARCHAR(100) NOT NULL DEFAULT '',
    name VARCHAR(100) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_queue_counter_service_name
    ON que.queue_counter (service, name);

-- Pengaturan pemanggilan TTS per tahap proses (satu baris "default")
CREATE TABLE IF NOT EXISTS que.call_setting (
    id VARCHAR(50) PRIMARY KEY,
    announce_on_call BOOLEAN NOT NULL DEFAULT TRUE,
    announce_on_recall BOOLEAN NOT NULL DEFAULT TRUE,
    announce_on_serving BOOLEAN NOT NULL DEFAULT FALSE,
    announce_on_done BOOLEAN NOT NULL DEFAULT FALSE,
    announce_on_confirm BOOLEAN NOT NULL DEFAULT TRUE,
    print_copies INT NOT NULL DEFAULT 2,   -- jumlah salinan cetak tiket
    confirm_template VARCHAR(500) NOT NULL
        DEFAULT 'Nomor antrian {number}{service}{customer}, silakan konfirmasi ke {counter}.',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
# antrian
