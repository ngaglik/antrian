<template>
    <div class="pemanggil">
        <n-alert
            v-if="showDisconnected"
            class="conn-alert"
            type="error"
            title="Koneksi monitoring terputus"
            :show-icon="true"
        >
            <div class="conn-body">
                <span>
                    Data antrian realtime tidak ter-update.
                    <template v-if="lastEventAgo !== null">
                        Terakhir menerima data {{ lastEventAgo }} detik lalu.
                    </template>
                    Periksa koneksi ke server backend.
                    <template v-if="state.lastError">
                        ({{ state.lastError }})
                    </template>
                </span>
                <n-button
                    size="tiny"
                    :loading="reconnecting"
                    :disabled="reconnecting"
                    @click="reconnect"
                    >Hubungkan ulang</n-button
                >
            </div>
        </n-alert>

        <!-- Filter daftar antrian — berlaku untuk kartu aktif & daftar menunggu. -->
        <section class="panel filter-bar">
            <span class="filter-title">🔍 Filter Daftar</span>
            <span class="label">Ruang</span>
            <n-select
                v-model:value="filterRoomId"
                :options="filterRoomOptions"
                style="width: 280px"
                size="small"
            />
            <span class="label">Layanan</span>
            <n-select
                v-model:value="filterService"
                :options="filterServiceOptions"
                style="width: 160px"
                size="small"
                filterable
            />
            <span class="label">Loket</span>
            <n-select
                v-model:value="counter"
                :options="counterOptions"
                style="width: 110px"
                size="small"
            />
            <span class="label">Status</span>
            <n-select
                v-model:value="filterStatus"
                :options="filterStatusOptions"
                style="width: 160px"
                size="small"
            />
            <n-input
                v-model:value="filterName"
                size="small"
                clearable
                placeholder="Cari nama pelanggan"
                style="width: 200px"
            />
            <n-button
                v-if="hasActiveFilter"
                size="small"
                quaternary
                @click="resetFilters"
                >✕ Bersihkan Filter</n-button
            >
        </section>

        <section class="panel">
            <div class="panel-head">
                <div>
                    <div class="panel-title">📣 Pemanggil Antrian</div>
                    <div class="panel-sub">
                        Klik kartu antrian pada daftar untuk memanggil nomornya
                        <template v-if="hasActiveFilter">
                            · kartu aktif ikut disaring sesuai filter di atas
                        </template>
                    </div>
                </div>
                <div class="panel-actions">
                    <n-button
                        type="primary"
                        :loading="busy"
                        @click="callNext"
                    >
                        🔊 Panggil Berikutnya
                    </n-button>
                    <n-button :disabled="busy" @click="openNew">
                        ➕ Baru
                    </n-button>
                    <n-button :disabled="busy" @click="confirmReset">
                        ↺ Reset
                    </n-button>
                    <n-button size="small" quaternary @click="openVoiceTest">
                        🔊 Uji Suara
                    </n-button>
                    <span class="auto-call">
                        <n-switch v-model:value="autoCallNext" size="small" />
                        <span class="label">Panggil berikutnya saat selesai</span>
                    </span>
                </div>
            </div>

            <!-- Antrian yang sedang dipanggil / diproses -->
            <div v-if="filteredActiveTickets.length > 0" class="active-list">
                <div
                    v-for="t in filteredActiveTickets"
                    :key="t.id"
                    class="active-card"
                    :class="{
                        'active-card--serving': t.status === 'serving',
                        'active-card--done': t.status === 'done',
                    }"
                >
                    <div class="active-code">{{ t.code }}</div>
                    <div class="active-info">
                        <div>
                            {{ t.service || "—" }}
                            <span v-if="t.customerName" class="customer">
                                · {{ t.customerName }}
                            </span>
                        </div>
                        <div class="active-meta">
                            {{ counterLabel(t.counter) }} ·
                            {{ STATUS_LABEL[t.status] }} ·
                            {{ formatTime(t.calledAt) }}
                        </div>
                    </div>
                    <div class="active-buttons">
                        <n-button
                            size="small"
                            quaternary
                            :disabled="busy"
                            @click="printTicketFor(t)"
                            >🖨 Cetak</n-button
                        >
                        <n-button
                            size="small"
                            :disabled="busy"
                            @click="recall(t)"
                            >🔁 Panggil Ulang</n-button
                        >
                        <n-button
                            v-if="t.status !== 'done'"
                            size="small"
                            type="warning"
                            :disabled="busy"
                            @click="confirmCall(t)"
                            >📣 Panggil Konfirmasi</n-button
                        >
                        <template v-if="t.status !== 'done'">
                            <n-button
                                v-if="t.status === 'called'"
                                size="small"
                                type="info"
                                :disabled="busy"
                                @click="start(t)"
                                >▶ Mulai Proses</n-button
                            >
                            <n-button
                                v-if="t.status === 'called' || t.status === 'serving'"
                                size="small"
                                type="success"
                                :disabled="busy"
                                @click="finish(t)"
                                >✔ Selesai</n-button
                            >
                            <n-button
                                v-if="t.status === 'called' || t.status === 'serving'"
                                size="small"
                                type="primary"
                                :disabled="busy"
                                @click="finishWithCall(t)"
                                >🔊 Selesai Panggil</n-button
                            >
                            <n-button
                                size="small"
                                type="error"
                                ghost
                                :disabled="busy"
                                @click="skip(t)"
                                >⤼ Lewati</n-button
                            >
                        </template>
                        <n-button
                            v-if="t.status === 'done'"
                            size="small"
                            type="error"
                            ghost
                            :disabled="busy"
                            @click="remove(t)"
                            >🗑 Hapus</n-button
                        >
                    </div>
                </div>
            </div>

            <n-empty
                v-else
                :description="
                    hasActiveFilter
                        ? 'Tidak ada antrian aktif yang cocok dengan filter'
                        : 'Belum ada antrian yang dipanggil'
                "
                style="padding: 18px 0"
            />
        </section>

        <section class="panel">
            <div class="panel-head">
                <div class="panel-title">
                    ⏳ Daftar Menunggu ({{ filteredWaitingList.length
                    }}<template v-if="hasActiveFilter">
                        dari {{ waitingList.length }}</template
                    >)
                </div>
            </div>

            <div v-if="filteredWaitingList.length > 0" class="queue-grid">
                <button
                    v-for="t in filteredWaitingList"
                    :key="t.id"
                    class="queue-card"
                    :disabled="busy"
                    @click="call(t)"
                >
                    <span class="queue-code">{{ t.code }}</span>
                    <span class="queue-service">{{ t.service || "—" }}</span>
                    <span v-if="t.customerName" class="queue-customer">
                        {{ t.customerName }}
                    </span>
                    <span class="queue-time"
                        >menunggu {{ waitingMinutes(t) }} mnt</span
                    >
                </button>
            </div>
            <n-empty
                v-else
                :description="
                    hasActiveFilter
                        ? 'Tidak ada antrian yang cocok dengan filter'
                        : 'Tidak ada antrian menunggu'
                "
                style="padding: 18px 0"
            />
        </section>

        <!-- Modal buat antrian baru (nomor diambil di loket/pemanggil).
             Nomor langsung masuk proses (sedang diproses), bukan menunggu. -->
        <n-modal
            v-model:show="showNew"
            preset="card"
            title="Buat Antrian Baru"
            :style="{ width: 'min(480px, 94vw)' }"
        >
            <div v-if="roomServices.length > 0">
                <div class="label" style="margin-bottom: 8px">
                    Pilih layanan untuk nomor baru:
                </div>
                <div class="new-services">
                    <button
                        v-for="s in roomServices"
                        :key="s.prefix"
                        class="new-service"
                        :class="{
                            'new-service--active': s.prefix === newPrefix,
                        }"
                        @click="newPrefix = s.prefix"
                    >
                        <span class="new-service-code">{{ s.prefix }}</span>
                        <span class="new-service-label">{{ s.service }}</span>
                    </button>
                </div>
            </div>
            <n-empty
                v-else-if="!loadingPrefixes"
                description="Belum ada layanan aktif untuk ruang ini"
                style="padding: 18px 0"
            />

            <div class="new-field">
                <label>ID Pelanggan / NORM (opsional)</label>
                <n-input
                    v-model:value="newCustomerId"
                    size="small"
                    clearable
                    placeholder="Isi NORM untuk mengisi nama otomatis"
                    @update:value="onCustomerIdChange"
                    @keydown.enter="createTicket"
                >
                    <template #suffix>
                        <n-spin v-if="lookingUpCustomer" :size="14" />
                    </template>
                </n-input>
                <div
                    v-if="customerLookupOk"
                    class="new-lookup-ok"
                >
                    ✓ {{ customerLookupName }}
                </div>
                <div
                    v-else-if="customerLookupError"
                    class="new-lookup-err"
                >
                    {{ customerLookupError }}
                </div>
            </div>

            <div class="new-field">
                <label>Nama pelanggan (opsional)</label>
                <n-input
                    v-model:value="newCustomerName"
                    size="small"
                    clearable
                    maxlength="100"
                    placeholder="Contoh: Budi Santoso"
                    :disabled="customerLookupOk"
                    @keydown.enter="createTicket"
                />
            </div>

            <n-alert
                v-if="lastCreated"
                class="new-result"
                type="success"
                :show-icon="true"
            >
                Nomor baru:
                <b>{{ lastCreated.code }}</b>
                ({{ lastCreated.service || "—" }}<template
                    v-if="lastCreated.customerName"
                    >, {{ lastCreated.customerName }}</template
                >) — langsung diproses di
                {{ counterLabel(lastCreated.counter) }}.
            </n-alert>

            <n-space justify="end" style="margin-top: 16px">
                <n-button @click="showNew = false">Tutup</n-button>
                <n-button
                    :loading="creatingTicket"
                    :disabled="!newPrefix"
                    @click="createTicket(false)"
                >
                    🎫 Ambil & Proses
                </n-button>
                <n-button
                    type="primary"
                    :loading="creatingTicket"
                    :disabled="!newPrefix"
                    @click="createTicket(true)"
                >
                    🖨 Ambil, Proses & Cetak
                </n-button>
            </n-space>
        </n-modal>

        <!-- Modal verifikasi reset antrian -->
        <n-modal
            v-model:show="showResetDialog"
            preset="card"
            title="Reset Antrian"
            :style="{ width: 'min(440px, 94vw)' }"
        >
            <p class="reset-warning">
                ⚠️ Tindakan ini akan menghapus <b>seluruh antrian hari ini</b> dan
                tidak dapat dibatalkan.
            </p>
            <p class="reset-hint">
                Ketik <b>reset</b> pada kolom di bawah untuk melanjutkan.
            </p>
            <n-input
                v-model:value="resetInput"
                size="small"
                placeholder='Ketik "reset"'
                @keydown.enter="doReset"
            />
            <n-space justify="end" style="margin-top: 16px">
                <n-button @click="showResetDialog = false">Batal</n-button>
                <n-button
                    type="error"
                    :loading="resetting"
                    :disabled="!resetInputValid"
                    @click="doReset"
                >
                    Reset Data
                </n-button>
            </n-space>
        </n-modal>

        <!-- Area cetak tiket antrian (hanya tampil saat print) — 2 salinan. -->
        <div id="print-area">
            <div v-for="copy in printCopies" :key="copy" class="ticket-copy">
                <div class="ticket-title">NOMOR ANTRIAN</div>
                <div class="ticket-sub">Sistem Antrian</div>
                <div class="ticket-line"></div>
                <div class="ticket-code">{{ printTicket?.code || "—" }}</div>
                <div class="ticket-line"></div>
                <div class="ticket-meta">
                    <div>Layanan: {{ printTicket?.service || "—" }}</div>
                    <div v-if="printTicket?.customerName">
                        Nama: {{ printTicket?.customerName }}
                    </div>
                    <div
                        v-if="
                            printTicket?.customerName &&
                            printTicket?.customerBirthDate
                        "
                    >
                        Tgl. Lahir:
                        {{ formatBirthDate(printTicket.customerBirthDate) }}
                    </div>
                    <div v-if="printTicket?.counter">
                        {{ counterLabel(printTicket?.counter) }}
                    </div>
                    <div>Tanggal: {{ formatDateTime(printTicket?.createdAt) }}</div>
                </div>
                <div class="ticket-line"></div>
                <div class="ticket-sub">
                    Mohon menunggu nomor Anda dipanggil
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import {
    refreshSnapshot,
    startQueueStream,
    stopQueueStream,
    useQueue,
} from "@/services/queueStore";
import { useSettings } from "@/services/settings";
import { usePrefixes } from "@/services/prefixes";
import { useCounters } from "@/services/counters";
import { usePrintSettings } from "@/services/printSettings";
import { STATUS_LABEL, counterLabel, formatTime, type QueueTicket } from "@/services/api";
import { getPasienByNorm, namaLengkap } from "@/services/pasien";

const message = useMessage();
const router = useRouter();
const { state, queueActions } = useQueue();
const {
    state: settingsState,
    kioskTarget,
} = useSettings();

// Link ke halaman input paragraf + tombol "Dengarkan" (uji suara TTS)
const openVoiceTest = () => router.push("/uji-suara");

const busy = ref(false);
const counter = ref("1");
// Loket per layanan (dari halaman Pengaturan) — dipakai untuk pilihan "Loket".
const { countersForService, loadCounters } = useCounters();
// Jumlah salinan tiket yang dicetak (diatur di Pengaturan → Cetak).
const { printCopies, loadPrintSettings } = usePrintSettings();

// Pemanggilan otomatis saat selesai (disimpan di browser).
// Default MATI: klik "Selesai" hanya menyelesaikan nomor yang dipilih,
// tanpa otomatis memanggil nomor berikutnya (diaktifkan lewat toggle).
const AUTO_CALL_KEY = "antrian.autoCallNext";
const autoCallNext = ref(localStorage.getItem(AUTO_CALL_KEY) === "1");
watch(autoCallNext, (v) => localStorage.setItem(AUTO_CALL_KEY, v ? "1" : "0"));

// ── Dialog reset antrian (verifikasi kata "reset") ─────────────
const showResetDialog = ref(false);
const resetInput = ref("");
const resetting = ref(false);

// ── Modal buat antrian baru ─────────────────────────────────────
const { state: prefixesState, prefixesForRoom, loadPrefixes } = usePrefixes();
const showNew = ref(false);
const creatingTicket = ref(false);
const loadingPrefixes = ref(false);
const newPrefix = ref("");
const newCustomerName = ref("");
const newCustomerBirthDate = ref<string | null>(null);
const lastCreated = ref<QueueTicket | null>(null);

// Pencarian ID pelanggan (NORM) → isi nama otomatis dari master pasien.
const newCustomerId = ref("");
const lookingUpCustomer = ref(false);
const customerLookupOk = ref(false);
const customerLookupName = ref("");
const customerLookupError = ref("");
let lookupSeq = 0; // penanda urutan untuk mengabaikan respons yang kedaluwarsa

// ── Cetak tiket antrian ───────────────────────────────────────────
const printTicket = ref<QueueTicket | null>(null);

const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatBirthDate = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value + "T00:00:00");
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
};

const printTicketFor = async (ticket: QueueTicket) => {
    if (!ticket) return;
    printTicket.value = ticket;
    await nextTick();
    window.print();
};

/** Layanan aktif mengikuti ruang yang dipilih pada section Filter Daftar. */
const roomServices = computed(() =>
    prefixesForRoom(filterRoomId.value).map((p) => ({
        prefix: p.code,
        service: p.service,
    })),
);

async function openNew() {
    lastCreated.value = null;
    newCustomerName.value = "";
    resetCustomerLookup();
    loadingPrefixes.value = true;
    try {
        await loadPrefixes();
    } finally {
        loadingPrefixes.value = false;
    }
    newPrefix.value = roomServices.value[0]?.prefix ?? "";
    showNew.value = true;
}

function resetCustomerLookup() {
    lookupSeq++;
    newCustomerId.value = "";
    customerLookupOk.value = false;
    customerLookupName.value = "";
    customerLookupError.value = "";
    newCustomerBirthDate.value = null;
}

/**
 * Saat ID pelanggan diubah: cari NORM di master pasien dan isi nama otomatis.
 * Pakai debounce ringan + penanda urutan agar respons yang kedaluwarsa diabaikan.
 */
async function onCustomerIdChange(value: string) {
    const norm = (value ?? "").trim();
    const seq = ++lookupSeq;

    customerLookupOk.value = false;
    customerLookupName.value = "";
    customerLookupError.value = "";
    newCustomerName.value = "";
    newCustomerBirthDate.value = null;

    if (norm === "") {
        lookingUpCustomer.value = false;
        return;
    }

    // Hanya proses bila murni angka.
    if (!/^\d+$/.test(norm)) {
        customerLookupError.value = "ID pelanggan harus berupa angka";
        return;
    }

    lookingUpCustomer.value = true;
    try {
        const pasien = await getPasienByNorm(Number(norm));
        if (seq !== lookupSeq) return; // ada input terbaru
        if (pasien) {
            const nama = namaLengkap(pasien);
            newCustomerName.value = nama;
            newCustomerBirthDate.value = pasien.tanggalLahir ?? null;
            customerLookupOk.value = true;
            customerLookupName.value = nama || `NORM ${pasien.norm}`;
        } else {
            customerLookupError.value = "ID pelanggan tidak ditemukan";
        }
    } catch (err) {
        if (seq !== lookupSeq) return;
        customerLookupError.value =
            (err as Error).message || "Gagal memuat data pelanggan";
    } finally {
        if (seq === lookupSeq) lookingUpCustomer.value = false;
    }
}

async function createTicket(withPrint = false) {
    const service = roomServices.value.find(
        (s) => s.prefix === newPrefix.value,
    );
    if (!service) {
        message.warning("Pilih layanan terlebih dahulu");
        return;
    }

    creatingTicket.value = true;
    try {
        const ticket = await queueActions.takeTicket(
            service.prefix,
            service.service,
            newCustomerName.value,
            newCustomerBirthDate.value,
        );
        // Nomor baru dari loket langsung masuk proses (status "sedang diproses")
        // memakai loket yang dipilih, tanpa melewati daftar menunggu, dan
        // langsung dipanggil lewat suara (template panggilan awal).
        const updated = await queueActions.setStatus(
            ticket.id,
            "serving",
            counter.value,
            false,
            kioskTarget(),
            null,
            true,
        );
        const current = updated.data ?? ticket;
        lastCreated.value = current;
        resetCustomerLookup();
        newCustomerName.value = "";
        newCustomerBirthDate.value = null;
        message.success(
            `Nomor ${current.code} langsung diproses di ${counterLabel(counter.value)}`,
        );
        // cetak otomatis hanya bila diminta
        if (withPrint) await printTicketFor(current);
    } catch (err) {
        message.error((err as Error).message || "Gagal membuat nomor antrian");
    } finally {
        creatingTicket.value = false;
    }
}

// ── Peringatan koneksi monitoring realtime ──────────────────────────
// Dianggap bermasalah bila: (a) status koneksi menyatakan terputus, atau
// (b) tidak ada data/heartbeat dari server melewati ambang batas — kasus
// koneksi mati diam-diam, mis. diputus proxy. Diberi tenggang singkat supaya
// tidak berkedip saat koneksi awal.
const DISCONNECT_GRACE_MS = 4000;
const FEED_STALE_MS = 35000; // server mengirim heartbeat tiap <= 15 detik
const showDisconnected = ref(false);
const reconnecting = ref(false);

const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | null = null;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

/** Koneksi monitoring (stream realtime) sedang bermasalah? */
const monitoringDown = computed(() => {
    if (!state.connected) return true;
    if (!state.lastEventAt) return false;
    return now.value - state.lastEventAt > FEED_STALE_MS;
});

/** Detik sejak data/heartbeat terakhir diterima (null bila belum pernah). */
const lastEventAgo = computed(() =>
    state.lastEventAt
        ? Math.max(0, Math.round((now.value - state.lastEventAt) / 1000))
        : null,
);

watch(
    monitoringDown,
    (down) => {
        if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimer = null;
        }
        if (!down) {
            showDisconnected.value = false;
            return;
        }
        disconnectTimer = setTimeout(() => {
            disconnectTimer = null;
            showDisconnected.value = true;
        }, DISCONNECT_GRACE_MS);
    },
    { immediate: true },
);

onMounted(() => {
    // Prefiks diperlukan untuk memetakan nomor antrian ke ruang (filter).
    loadPrefixes();
    // Daftar loket per layanan (pilihan "Loket" mengikuti filter layanan).
    loadCounters();
    // Jumlah salinan cetak tiket.
    loadPrintSettings();
    // Segarkan umur data berkala agar status "stale" terdeteksi.
    ticker = setInterval(() => {
        now.value = Date.now();
    }, 5000);
});

onUnmounted(() => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    if (ticker) clearInterval(ticker);
});

/** Coba sambungkan ulang stream realtime + muat ulang data sekali. */
const reconnect = async () => {
    reconnecting.value = true;
    try {
        message.info("Mencoba menghubungkan ulang…");
        stopQueueStream();
        startQueueStream();
        await refreshSnapshot();
        // Tampil/tidaknya peringatan ditentukan oleh monitoringDown
        // (EventSource memicu event 'open' bila berhasil).
    } finally {
        reconnecting.value = false;
    }
};

const waitingList = computed(() =>
    state.tickets.filter((t) => t.status === "waiting"),
);

// ── Filter daftar menunggu ─────────────────────────────────────
// Filter hanya memengaruhi daftar menunggu, bukan kartu aktif yang sedang
// ditangani, supaya petugas tidak kehilangan antrian yang harus diselesaikan.
const filterRoomId = ref("");
const filterService = ref("");
const filterName = ref("");
const filterStatus = ref("active");

const filterRoomOptions = computed(() =>
    settingsState.rooms.map((r) => ({
        label: r.name || r.baseUrl || "(tanpa nama)",
        value: r.id,
    })),
);

// Pilih ruang aktif bila belum ada pilihan; fallback ke ruang pertama yang ada.
watch(
    [filterRoomOptions, () => settingsState.activeRoomId],
    () => {
        const rooms = filterRoomOptions.value;
        if (rooms.length === 0) return;
        const current = filterRoomId.value;
        const exists = rooms.some((r) => r.value === current);
        if (exists) return;
        const preferred =
            rooms.find((r) => r.value === settingsState.activeRoomId) ?? rooms[0];
        filterRoomId.value = preferred.value;
    },
    { immediate: true },
);

/**
 * Nama layanan untuk opsi filter, menyesuaikan ruang yang dipilih.
 * Bila ruang kosong (semua) → semua prefiks aktif; bila ruang dipilih →
 * prefiks milik ruang itu + prefiks bersama (roomId "").
 */
const filterServiceOptions = computed(() => {
    const roomId = filterRoomId.value;
    const relevant = prefixesState.prefixes.filter((p) => {
        if (!p.isActive) return false;
        if (!roomId) return true;
        return !p.roomId || p.roomId === roomId;
    });

    const names = new Set<string>();
    for (const p of relevant) {
        if (p.service) names.add(p.service);
    }
    return [
        { label: "Semua layanan", value: "" },
        ...[...names]
            .sort((a, b) => a.localeCompare(b))
            .map((s) => ({ label: s, value: s })),
    ];
});

// Saat ruang berganti, pastikan layanan yang dipilih masih tersedia di ruang itu;
// bila tidak, kosongkan pilihan layanan.
watch(filterRoomId, () => {
    const valid = filterServiceOptions.value.some(
        (o) => o.value === filterService.value,
    );
    if (!valid) filterService.value = "";
});

// ── Pilihan loket mengikuti filter layanan ──────────────────────
// Bila ada loket terkonfigurasi untuk layanan itu, pakai daftar tersebut;
// bila belum ada, tetap memakai 1–5 (perilaku lama).
const DEFAULT_COUNTERS = ["1", "2", "3", "4", "5"];
const counterOptions = computed(() => {
    const configured = countersForService(filterService.value);
    if (configured.length > 0) {
        // Beberapa layanan bisa punya nama loket sama (mis. "1"); tampilkan sekali.
        const seen = new Set<string>();
        const options: { label: string; value: string }[] = [];
        for (const c of configured) {
            if (seen.has(c.name)) continue;
            seen.add(c.name);
            options.push({ label: counterLabel(c.name), value: c.name });
        }
        return options;
    }
    return DEFAULT_COUNTERS.map((c) => ({ label: counterLabel(c), value: c }));
});

// Jaga agar pilihan loket tetap valid saat daftar loket berubah
// (mis. filter layanan diganti ke layanan dengan loket berbeda).
watch(
    counterOptions,
    (options) => {
        if (options.length === 0) return;
        if (!options.some((o) => o.value === counter.value)) {
            counter.value = options[0].value;
        }
    },
    { immediate: true },
);

/** Opsi filter status kartu aktif: antrian aktif (dipanggil/diproses) & selesai. */
const filterStatusOptions = [
    { label: "Antrian Aktif", value: "active" },
    { label: "Selesai", value: "done" },
];

/**
 * Cocokkan prefiks nomor antrian dengan satu ruang. Prefiks tanpa ruang
 * (roomId "") berlaku untuk semua ruang; prefiks yang belum termuat dianggap
 * cocok agar antrian tidak tersembunyi begitu saja saat daftar prefiks gagal.
 */
function matchesRoom(prefix: string, roomId: string): boolean {
    if (!roomId) return true;
    const owners = prefixesState.prefixes.filter((p) => p.code === prefix);
    if (owners.length === 0) return true;
    return owners.some((p) => !p.roomId || p.roomId === roomId);
}

/** Cocokkan satu tiket dengan seluruh filter (ruang, layanan, nama pelanggan). */
function matchesFilters(t: QueueTicket): boolean {
    if (!matchesRoom(t.prefix, filterRoomId.value)) return false;
    if (filterService.value && t.service !== filterService.value) return false;
    const query = filterName.value.trim().toLowerCase();
    if (query && !(t.customerName ?? "").toLowerCase().includes(query))
        return false;
    return true;
}

const filteredWaitingList = computed(() =>
    waitingList.value.filter(matchesFilters),
);

const hasActiveFilter = computed(
    () =>
        !!filterService.value ||
        filterName.value.trim().length > 0,
);

function resetFilters() {
    filterRoomId.value =
        settingsState.activeRoomId || filterRoomOptions.value[0]?.value || "";
    filterService.value = "";
    filterName.value = "";
    filterStatus.value = "active";
}

const activeTickets = computed(() =>
    state.tickets
        .filter(
            (t) =>
                t.status === "called" ||
                t.status === "serving" ||
                t.status === "done",
        )
        .sort((a, b) =>
            a.status === "serving" ? -1 : b.status === "serving" ? 1 : 0,
        ),
);

/** Kartu aktif (dipanggil/diproses/selesai) yang lolos filter + filter status. */
const filteredActiveTickets = computed(() =>
    activeTickets.value.filter((t) => {
        if (!matchesFilters(t)) return false;
        if (!filterStatus.value) return true;
        if (filterStatus.value === "active")
            return t.status === "called" || t.status === "serving";
        return t.status === filterStatus.value;
    }),
);

const waitingMinutes = (t: QueueTicket) => {
    const start = new Date(t.createdAt).getTime();
    if (Number.isNaN(start)) return 0;
    return Math.max(0, Math.round((Date.now() - start) / 60000));
};

const run = async (fn: () => Promise<unknown>, successMessage?: string) => {
    busy.value = true;
    try {
        const result = (await fn()) as { message?: string } | undefined;
        if (successMessage) message.success(successMessage);
        else if (result?.message) message.success(result.message);
    } catch (err) {
        message.error((err as Error).message || "Terjadi kesalahan");
    } finally {
        busy.value = false;
    }
};

const callNext = () =>
    run(
        () => queueActions.callNext(counter.value, kioskTarget()),
        "Nomor berikutnya dipanggil",
    );

const call = (t: QueueTicket) =>
    run(
        () => queueActions.callTicket(t.id, counter.value, kioskTarget()),
        `Memanggil ${t.code}`,
    );

const recall = (t: QueueTicket) =>
    run(
        () => queueActions.callTicket(t.id, counter.value, kioskTarget()),
        `Memanggil ulang ${t.code}`,
    );

/** Panggil konfirmasi (suara) untuk satu nomor; status tiket tidak berubah.
 *  Loket yang dibacakan mengikuti filter loket yang sedang dipilih. */
const confirmCall = (t: QueueTicket) =>
    run(
        () => queueActions.confirmTicket(t.id, counter.value, kioskTarget()),
        `Konfirmasi ${t.code} dipanggil`,
    );

const start = (t: QueueTicket) =>
    run(
        () =>
            queueActions.setStatus(t.id, "serving", counter.value, false, kioskTarget()),
        `${t.code} mulai diproses`,
    );

/** Selesai tanpa suara pemanggil. */
const finish = (t: QueueTicket) =>
    run(() =>
        queueActions.setStatus(
            t.id,
            "done",
            counter.value,
            autoCallNext.value,
            kioskTarget(),
            false,
        ),
    );

/** Selesai disertai suara pemanggil. */
const finishWithCall = (t: QueueTicket) =>
    run(() =>
        queueActions.setStatus(
            t.id,
            "done",
            counter.value,
            autoCallNext.value,
            kioskTarget(),
            true,
        ),
    );

const skip = (t: QueueTicket) =>
    run(() =>
        queueActions.setStatus(
            t.id,
            "skipped",
            counter.value,
            autoCallNext.value,
            kioskTarget(),
        ),
    );

const remove = (t: QueueTicket) =>
    run(
        () => queueActions.removeTicket(t.id),
        `Antrian ${t.code} dihapus`,
    );

const confirmReset = () => {
    resetInput.value = "";
    showResetDialog.value = true;
};

const resetInputValid = computed(
    () => resetInput.value.trim().toLowerCase() === "reset",
);

const doReset = async () => {
    if (!resetInputValid.value) {
        message.error('Ketik "reset" untuk melanjutkan');
        return;
    }
    resetting.value = true;
    try {
        await queueActions.reset();
        showResetDialog.value = false;
        resetInput.value = "";
        message.success("Antrian hari ini direset");
    } catch (err) {
        message.error((err as Error).message || "Gagal mereset antrian");
    } finally {
        resetting.value = false;
    }
};
</script>

<style scoped>
.pemanggil {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.panel {
    background: #fff;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
}

.conn-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
}

.panel-title {
    font-size: 16px;
    font-weight: 700;
}

.panel-sub {
    font-size: 12px;
    color: #888;
}

.panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

/* Bilah filter di atas daftar: satu baris, membungkus di layar sempit. */
.filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 16px;
}

.filter-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f766e;
    margin-right: 4px;
}

.label {
    font-size: 13px;
    color: #666;
}

.auto-call {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-left: 6px;
    border-left: 1px solid #eee;
}

.new-services {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.new-service {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 110px;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.new-service:hover {
    border-color: #5eead4;
}

.new-service--active {
    border-color: #14b8a6;
    background: #f0fdfa;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}

.new-service-code {
    font-size: 20px;
    font-weight: 800;
    color: #0f766e;
    letter-spacing: 1px;
}

.new-service-label {
    font-size: 12px;
    color: #555;
}

.new-result {
    margin-top: 16px;
}

.reset-warning {
    margin: 0 0 8px;
    color: #9a3412;
    font-size: 13px;
}

.reset-hint {
    margin: 0 0 12px;
    color: #475569;
    font-size: 13px;
}

.new-field {
    margin-top: 16px;
}

.new-field label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
}

.new-lookup-ok {
    margin-top: 4px;
    font-size: 12px;
    color: #0f766e;
}

.new-lookup-err {
    margin-top: 4px;
    font-size: 12px;
    color: #dc2626;
}

.customer {
    color: #334155;
    font-weight: 600;
}

.queue-customer {
    font-size: 12px;
    font-weight: 600;
    color: #0f766e;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.active-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.active-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-radius: 12px;
    background: #fff7ed;
    border-left: 5px solid #f59e0b;
    flex-wrap: wrap;
}

.active-card--serving {
    background: #ecfeff;
    border-left-color: #06b6d4;
}

.active-card--done {
    background: #f1f5f9;
    border-left-color: #94a3b8;
}

.active-code {
    font-size: 34px;
    font-weight: 800;
    color: #b45309;
    letter-spacing: 1px;
}

.active-card--serving .active-code {
    color: #0e7490;
}

.active-card--done .active-code {
    color: #64748b;
}

.active-info {
    flex: 1;
    min-width: 160px;
    font-size: 14px;
}

.active-meta {
    font-size: 12px;
    color: #777;
}

.active-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.queue-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
}

.queue-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 14px 10px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.queue-card:hover {
    border-color: #14b8a6;
    background: #f0fdfa;
}

.queue-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.queue-code {
    font-size: 26px;
    font-weight: 800;
    color: #0f766e;
}

.queue-service {
    font-size: 12px;
    color: #555;
}

.queue-time {
    font-size: 11px;
    color: #999;
}
</style>
