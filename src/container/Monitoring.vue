<template>
    <div class="monitoring">
        <section class="monitor-top">
            <div class="called-panels">
                <div
                    v-for="item in calledByCounter"
                    :key="item.label"
                    class="called-panel"
                    :class="{
                        'called-panel--confirm':
                            recentConfirm?.ticketId === item.ticketId,
                    }"
                    :style="{
                        background: `linear-gradient(135deg, ${item.colors[0]} 0%, ${item.colors[1]} 100%)`,
                    }"
                >
                    <div
                        v-if="recentConfirm?.ticketId === item.ticketId"
                        class="called-confirm-tag"
                    >
                        🔔 PANGGILAN KONFIRMASI
                    </div>
                    <div class="called-counter">
                        {{ item.label }}
                    </div>
                    <div class="called-code">{{ item.code }}</div>
                    <div v-if="item.customerName" class="called-name">
                        {{ item.customerName }}
                    </div>
                    <div class="called-service">{{ STATUS_LABEL[item.status] }}</div>

                </div>

                <div
                    v-if="calledByCounter.length === 0"
                    class="called-panel called-panel--empty"
                >
                    <div class="called-label">NOMOR DIPANGGIL</div>
                    <div class="called-code">—</div>
                    <div class="called-hint">
                        {{ state.connected ? "Realtime aktif" : "Menunggu koneksi…" }}
                    </div>
                </div>
            </div>
        </section>

        <section class="panel">
            <div class="panel-head">
                <div class="panel-title">
                    📋 Daftar Antrian — {{ roomLabel }} —
                    {{ state.date || "hari ini" }}
                </div>
                <n-space :size="8" align="center">
                    <n-tag v-if="autoScroll" size="small" type="info">
                        ⟳ gulir otomatis
                    </n-tag>
                    <n-tag :type="state.connected ? 'success' : 'error'" size="small">
                        {{ state.serverTime || "--:--" }}
                    </n-tag>
                </n-space>
            </div>

            <!--
              Gulir otomatis: daftar digandakan (track 2 = salinan) sehingga
              loop terasa mulus; `overflow: hidden` masih bisa digeser lewat
              scrollTop. Arahkan kursor ke daftar untuk menghentikan sementara.
            -->
            <div
                v-if="visibleTickets.length > 0"
                ref="listRef"
                class="monitor-list"
                :class="{ 'monitor-list--auto': autoScroll }"
                @mouseenter="paused = true"
                @mouseleave="paused = false"
            >
                <div
                    v-for="track in trackCount"
                    :key="track"
                    class="monitor-track"
                    :aria-hidden="track > 1 ? 'true' : undefined"
                >
                    <div
                        v-for="t in visibleTickets"
                        :key="`${track}-${t.id}`"
                        class="monitor-row"
                        :class="`monitor-row--${t.status}`"
                    >
                        <span class="row-code">{{ t.code }}</span>
                        <span class="row-customer">
                            {{ t.customerName?.trim() || "—" }}
                        </span>
                        <span class="row-service">{{ t.service || "—" }}</span>
                        <n-tag :type="STATUS_TAG_TYPE[t.status]" size="large">
                            {{ STATUS_LABEL[t.status] }}
                        </n-tag>
                        <span class="row-meta">{{ counterLabel(t.counter) }}</span>
                        <span class="row-meta">{{ formatTime(t.calledAt) }}</span>
                    </div>
                </div>
            </div>
            <n-empty
                v-else
                :description="emptyText"
                style="padding: 28px 0"
            />
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useQueue } from "@/services/queueStore";
import { useSettings } from "@/services/settings";
import { usePrefixes } from "@/services/prefixes";
import {
    STATUS_LABEL,
    STATUS_TAG_TYPE,
    counterLabel,
    formatTime,
    type QueueTicket,
} from "@/services/api";

const { state } = useQueue();
const route = useRoute();
const { state: settingsState, loadRooms } = useSettings();
const { state: prefixesState, loadPrefixes } = usePrefixes();

/** Id ruang dari URL (/monitoring/<room_id>). Kosong = semua ruang. */
const roomId = computed(() => String(route.params.roomId ?? "").trim());

/** Data ruang dari parameter URL (bila ada & dikenal). */
const room = computed(() =>
    roomId.value
        ? settingsState.rooms.find((r) => r.id === roomId.value) ?? null
        : null,
);

/** Label ruang untuk judul — nama ruang, atau id bila belum termuat. */
const roomLabel = computed(() =>
    roomId.value ? room.value?.name || roomId.value : "Semua ruang",
);

/**
 * Cocokkan prefiks nomor antrian dengan ruang pada URL. Prefiks tanpa ruang
 * (roomId "") berlaku untuk semua ruang; prefiks yang belum termuat dianggap
 * cocok agar antrian tidak tersembunyi begitu saja saat daftar prefiks gagal.
 */
function matchesRoom(prefix: string): boolean {
    if (!roomId.value) return true;
    const owners = prefixesState.prefixes.filter((p) => p.code === prefix);
    if (owners.length === 0) return true;
    return owners.some((p) => !p.roomId || p.roomId === roomId.value);
}

/** Tiket milik ruang yang sedang ditampilkan (semua tiket bila tanpa ruang). */
const roomTickets = computed(() =>
    state.tickets.filter((t) => matchesRoom(t.prefix)),
);

/** Pesan saat daftar kosong — menyesuaikan ruang yang dipilih. */
const emptyText = computed(() =>
    roomId.value
        ? `Belum ada antrian untuk ruang ${roomLabel.value} hari ini`
        : "Belum ada antrian hari ini",
);

// Palet warna untuk kartu "Nomor Dipanggil" tiap layanan (berbeda-beda).
const CALLED_COLORS: [string, string][] = [
    ["#0f766e", "#14b8a6"], // teal
    ["#7c3aed", "#a78bfa"], // ungu
    ["#1d4ed8", "#60a5fa"], // biru
    ["#be185d", "#ec4899"], // pink
    ["#b45309", "#f59e0b"], // amber
    ["#c2410c", "#fb923c"], // oranye
    ["#334155", "#94a3b8"], // abu
];

/** Waktu aktivitas terakhir sebuah tiket (panggil / proses / selesai). */
function lastActivity(t: QueueTicket): number {
    const times = [t.calledAt, t.startedAt, t.finishedAt]
        .filter((v): v is string => !!v)
        .map((v) => new Date(v).getTime());
    return times.length > 0 ? Math.max(...times) : 0;
}

/** Urutkan dua tiket: mana yang aktivitasnya lebih baru. */
function isNewer(a: QueueTicket, b: QueueTicket): boolean {
    const ta = lastActivity(a);
    const tb = lastActivity(b);
    if (ta !== tb) return ta > tb;
    return a.id > b.id;
}

/**
 * Nomor terakhir yang dipanggil untuk tiap LOKET, mencakup semua tahapan
 * panggilan: awal (called), ulang (called), diproses (serving), dan selesai
 * (done). Nomor tetap tampil hingga nomor berikutnya dipanggil di loket yang
 * sama.
 */
const calledByCounter = computed(() => {
    const considered = roomTickets.value.filter(
        (t) =>
            t.status === "called" ||
            t.status === "serving" ||
            t.status === "done",
    );

    // Dikelompokkan per loket (label "Loket …"), bukan per layanan.
    const latest = new Map<string, QueueTicket>();
    for (const t of considered) {
        const key = counterLabel(t.counter);
        const existing = latest.get(key);
        if (!existing || isNewer(t, existing)) latest.set(key, t);
    }

    return [...latest.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
        .map(([label, t], i) => ({
            ticketId: t.id,
            label,
            service: t.service,
            code: t.code,
            customerName: t.customerName,
            status: t.status,
            colors: CALLED_COLORS[i % CALLED_COLORS.length],
        }));
});

const listRef = ref<HTMLElement | null>(null);
const autoScroll = ref(false);
/** Berhenti sementara saat kursor berada di atas daftar. */
const paused = ref(false);

/** Perlu track kedua (salinan) saat menggulir, agar loop mulus. */
const trackCount = computed(() => (autoScroll.value ? 2 : 1));

/** Daftar antrian yang tampil — antrian selesai (done) disembunyikan. */
const visibleTickets = computed(() =>
    roomTickets.value.filter((t) => t.status !== "done"),
);

// ── Sorot panggilan konfirmasi terakhir ─────────────────────────────
// Berapa lama nomor tetap disorot setelah tombol Panggil Konfirmasi ditekan.
const CONFIRM_HIGHLIGHT_MS = 15000;
/** Detik berjalan agar sorotan konfirmasi kedaluwarsa sendiri. */
const now = ref(Date.now());
let clockTimer: ReturnType<typeof setInterval> | null = null;

/** Info konfirmasi yang masih baru (untuk disorot), atau null. */
const recentConfirm = computed(() => {
    const c = state.lastConfirm;
    if (!c) return null;
    const age = now.value - new Date(c.at).getTime();
    return age >= 0 && age < CONFIRM_HIGHLIGHT_MS ? c : null;
});

const SCROLL_SPEED_PX_PER_SEC = 34;
const MEASURE_INTERVAL_MS = 500;

let rafId: number | null = null;
let lastTs = 0;
let lastMeasureTs = 0;
let trackHeight = 0;
let reducedMotion = false;

/** Ukur tinggi satu track vs tinggi area tampil → perlu digulir atau tidak. */
function measure() {
    const container = listRef.value;
    if (!container) {
        autoScroll.value = false;
        return;
    }

    const firstTrack = container.firstElementChild as HTMLElement | null;
    const track = firstTrack?.offsetHeight ?? 0;
    const view = container.clientHeight;
    trackHeight = track;

    const shouldScroll = !reducedMotion && track > view + 4;
    if (shouldScroll !== autoScroll.value) autoScroll.value = shouldScroll;

    if (!shouldScroll && container.scrollTop !== 0) container.scrollTop = 0;
}

function step(ts: number) {
    rafId = requestAnimationFrame(step);
    const container = listRef.value;

    if (ts - lastMeasureTs > MEASURE_INTERVAL_MS) {
        lastMeasureTs = ts;
        measure();
    }

    if (!container || !autoScroll.value || paused.value || trackHeight <= 0) {
        lastTs = ts;
        return;
    }

    const elapsed = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;

    // Geser ke atas; saat melewati satu track penuh, ulang dari awal
    // (tanpa lompatan karena track kedua identik).
    let next = container.scrollTop + SCROLL_SPEED_PX_PER_SEC * elapsed;
    if (next >= trackHeight) next -= trackHeight;
    container.scrollTop = next;
}

onMounted(() => {
    // Prefiks diperlukan untuk memetakan tiket ke ruang (filter parameter URL).
    loadRooms();
    loadPrefixes();
    reducedMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    measure();
    rafId = requestAnimationFrame(step);
    window.addEventListener("resize", measure);
    // Detik berjalan: menyegarkan sorotan panggilan konfirmasi.
    clockTimer = setInterval(() => {
        now.value = Date.now();
    }, 1000);
});

onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (clockTimer !== null) clearInterval(clockTimer);
    window.removeEventListener("resize", measure);
});

// Ukur ulang setelah daftar berubah.
watch(
    () => visibleTickets.value.length,
    async () => {
        await nextTick();
        measure();
    },
);
</script>

<style scoped>
.monitoring {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.monitor-top {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
}

@media (max-width: 860px) {
    .monitor-top {
        grid-template-columns: 1fr;
    }
}

.called-panels {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
    min-width: 0;
}

.called-panels .called-panel {
    flex: 1 1 240px;
    min-width: 220px;
}

.called-panel {
    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
    color: #fff;
    border-radius: 16px;
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(15, 118, 110, 0.25);
}

.called-panel--empty {
    background: linear-gradient(135deg, #334155 0%, #64748b 100%);
}

/* Sorotan panggilan konfirmasi (beberapa detik setelah tombol ditekan). */
.called-panel--confirm {
    outline: 4px solid #f59e0b;
    animation: confirm-pulse 1.1s ease-in-out infinite;
}

.called-confirm-tag {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 1px;
    background: #f59e0b;
    color: #1f2937;
    border-radius: 999px;
    padding: 3px 12px;
    margin-bottom: 6px;
}

@keyframes confirm-pulse {
    0%,
    100% {
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.25);
    }
    50% {
        box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.5);
    }
}

.called-service {
    font-size: 16px;
    font-weight: 700;
    margin-top: 2px;
    opacity: 0.95;
}

.called-label {
    font-size: 13px;
    letter-spacing: 2px;
    opacity: 0.9;
}

.called-code {
    font-size: 66px;
    font-weight: 800;
    letter-spacing: 4px;
    line-height: 1.1;
}

.called-name {
    font-size: 28px;
    font-weight: 700;
    margin-top: 4px;
    color: #fff;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
}

/* Nama loket diperbesar agar terbaca dari jauh. */
.called-counter {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: 1px;
    line-height: 1.15;
    margin-top: 6px;
    color: #fff;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
}

@media (max-width: 860px) {
    .called-counter {
        font-size: 32px;
    }
}

.called-hint {
    font-size: 12px;
    opacity: 0.85;
}

.panel {
    background: #fff;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
}

.panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.panel-title {
    font-size: 22px;
    font-weight: 700;
}

/* Area daftar: lebih tinggi + besar agar terbaca dari jauh. */
.monitor-list {
    max-height: 64vh;
    min-height: 260px;
    overflow-y: auto;
    scroll-behavior: auto;
}

/* Saat menggulir otomatis, scrollbar disembunyikan (tetap bisa digeser
   secara program lewat scrollTop). */
.monitor-list--auto {
    overflow-y: hidden;
}

.monitor-track {
    display: flex;
    flex-direction: column;
}

.monitor-row {
    display: grid;
    grid-template-columns: 150px 2.2fr 1.1fr 1.1fr 140px 110px;
    align-items: center;
    gap: 14px;
    padding: 18px 20px;
    margin-bottom: 10px;
    border-radius: 14px;
    background: #fafafa;
    font-size: 22px;
}

@media (max-width: 1100px) {
    .monitor-row {
        grid-template-columns: 130px 1.6fr 1fr auto;
    }

    /* Loket & jam disembunyikan dulu di layar sedang. */
    .monitor-row .row-meta {
        display: none;
    }

    .monitor-row .row-customer {
        font-size: 30px;
    }
}

@media (max-width: 860px) {
    .monitor-row {
        grid-template-columns: 120px 1fr auto;
        row-gap: 6px;
        font-size: 18px;
    }

    .monitor-row .row-customer {
        font-size: 24px;
    }

    .monitor-row .row-service {
        display: none;
    }

    .monitor-row :deep(.n-tag) {
        font-size: 15px;
        padding: 5px 10px;
    }
}

.monitor-row--called {
    background: #fffbeb;
}

.monitor-row--serving {
    background: #ecfeff;
}

.monitor-row--done {
    background: #f0fdf4;
}

.monitor-row--skipped {
    background: #fef2f2;
}

/* Tag status di daftar dibuat lebih besar agar terbaca dari jauh
   (termasuk label "Sedang Diproses"). */
.monitor-row :deep(.n-tag) {
    font-size: 18px;
    font-weight: 700;
    height: auto;
    padding: 7px 14px;
    line-height: 1.25;
}

.monitor-row :deep(.n-tag__content) {
    line-height: 1.25;
}

.row-code {
    font-size: 40px;
    font-weight: 800;
    color: #0f766e;
    letter-spacing: 1px;
}

.row-service {
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Nama pelanggan ditampilkan apa adanya — ukuran font disamakan dengan
   nomor antrian agar terbaca dari jauh. */
.row-customer {
    font-size: 40px;
    font-weight: 800;
    color: #0f766e;
    letter-spacing: 0.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.row-meta {
    font-size: 17px;
    color: #888;
}
</style>
