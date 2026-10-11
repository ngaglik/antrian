<template>
    <div class="kiosk">
        <section class="kiosk-hero">
            <div class="kiosk-title">SELAMAT DATANG</div>
            <div class="kiosk-subtitle">Silakan ambil nomor antrian Anda</div>

            <div v-if="services.length > 0" class="kiosk-services">
                <button
                    v-for="s in services"
                    :key="s.prefix"
                    class="service-btn"
                    :class="{ 'service-btn--active': s.prefix === selectedPrefix }"
                    @click="selectedPrefix = s.prefix"
                >
                    <span class="service-code">{{ s.prefix }}</span>
                    <span class="service-label">{{ s.service }}</span>
                </button>
            </div>

            <div v-else class="kiosk-empty">
                ⚠️ Belum ada layanan aktif. Silakan hubungi petugas.
            </div>

            <n-button
                type="primary"
                size="large"
                round
                class="kiosk-cta"
                :loading="taking"
                :disabled="services.length === 0"
                @click="takeNumber"
            >
                🎫 Ambil Nomor Antrian
            </n-button>
        </section>

        <section class="kiosk-stats">
            <div class="stat-card">
                <div class="stat-icon">📣</div>
                <div class="stat-body">
                    <div class="stat-value">
                        {{ state.summary.lastCalled || "—" }}
                    </div>
                    <div class="stat-label">Sedang Dipanggil</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-body">
                    <div class="stat-value">{{ state.summary.waiting }}</div>
                    <div class="stat-label">Menunggu</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-body">
                    <div class="stat-value">{{ state.summary.done }}</div>
                    <div class="stat-label">Selesai</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-body">
                    <div class="stat-value">{{ state.summary.total }}</div>
                    <div class="stat-label">Total Antrian</div>
                </div>
            </div>
        </section>

        <!-- Hasil nomor antrian -->
        <n-modal
            v-model:show="showTicket"
            preset="card"
            title="Nomor Antrian Anda"
            :style="{ width: 'min(420px, 94vw)' }"
        >
            <div v-if="currentTicket" class="ticket-result">
                <div class="ticket-result-code">{{ currentTicket.code }}</div>
                <div class="ticket-result-service">
                    {{ currentTicket.service }}
                </div>
                <div class="ticket-result-meta">
                    {{ formatDateTime(currentTicket.createdAt) }}
                </div>
            </div>
            <n-space justify="end">
                <n-button @click="showTicket = false">Tutup</n-button>
                <n-button type="primary" @click="printTicketNow"
                    >🖨 Cetak Ulang</n-button
                >
            </n-space>
        </n-modal>

        <!-- Area cetak (hanya tampil saat print) — dicetak 2 salinan. -->
        <div id="print-area">
            <div v-for="copy in printCopies" :key="copy" class="ticket-copy">
                <div class="ticket-title">NOMOR ANTRIAN</div>
                <div class="ticket-sub">Sistem Antrian</div>
                <div class="ticket-line"></div>
                <div class="ticket-code">{{ printTicket?.code || "—" }}</div>
                <div class="ticket-line"></div>
                <div class="ticket-meta">
                    <div>Layanan: {{ printTicket?.service || "—" }}</div>
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
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useQueue } from "@/services/queueStore";
import { usePrefixes } from "@/services/prefixes";
import { useSettings } from "@/services/settings";
import { usePrintSettings } from "@/services/printSettings";
import type { QueueTicket } from "@/services/api";

const message = useMessage();
const { state, queueActions } = useQueue();
const { prefixesForRoom, loadPrefixes } = usePrefixes();
// Ruang perangkat kiosk ini (diatur di halaman Pengaturan, disimpan per-perangkat).
const { activeRoom, loadRooms } = useSettings();
// Jumlah salinan tiket yang dicetak (diatur di Pengaturan → Cetak).
const { printCopies, loadPrintSettings } = usePrintSettings();

// Tombol layanan = prefiks aktif milik ruang kiosk ini (+ prefiks semua ruang).
const services = computed(() =>
    prefixesForRoom(activeRoom.value?.id ?? "").map((p) => ({
        prefix: p.code,
        service: p.service,
    })),
);

const selectedPrefix = ref("");

// Jaga pilihan tetap valid saat daftar prefiks dimuat/diubah.
watch(
    services,
    (list) => {
        if (!list.some((s) => s.prefix === selectedPrefix.value)) {
            selectedPrefix.value = list[0]?.prefix ?? "";
        }
    },
    { immediate: true },
);

onMounted(() => {
    loadRooms();
    loadPrefixes();
    loadPrintSettings();
});
const taking = ref(false);
const showTicket = ref(false);
const currentTicket = ref<QueueTicket | null>(null);
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

const printTicketNow = async () => {
    if (!printTicket.value) return;
    await nextTick();
    window.print();
};

const takeNumber = async () => {
    const svc = services.value.find((s) => s.prefix === selectedPrefix.value);
    if (!svc) {
        message.warning("Belum ada layanan aktif");
        return;
    }

    taking.value = true;
    try {
        const ticket = await queueActions.takeTicket(svc.prefix, svc.service);
        currentTicket.value = ticket;
        printTicket.value = ticket;
        showTicket.value = true;
        message.success(`Nomor antrian ${ticket.code} berhasil diambil`);
        // cetak otomatis tiket
        await printTicketNow();
    } catch (err) {
        message.error(
            (err as Error).message || "Gagal mengambil nomor antrian",
        );
    } finally {
        taking.value = false;
    }
};
</script>

<style scoped>
.kiosk {
    display: flex;
    flex-direction: column;
    gap: 22px;
}

.kiosk-hero {
    background: #fff;
    border-radius: 16px;
    padding: 40px 24px;
    text-align: center;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
}

.kiosk-title {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #0f766e;
}

.kiosk-subtitle {
    font-size: 16px;
    color: #666;
    margin-top: 6px;
}

.kiosk-services {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 28px 0 24px;
}

.kiosk-empty {
    margin: 28px 0 24px;
    padding: 18px;
    border-radius: 12px;
    background: #fff7ed;
    color: #9a3412;
    font-size: 15px;
    font-weight: 600;
}

.service-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 130px;
    padding: 14px 18px;
    border: 2px solid #e5e7eb;
    border-radius: 14px;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.service-btn:hover {
    border-color: #5eead4;
}

.service-btn--active {
    border-color: #14b8a6;
    background: #f0fdfa;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}

.service-code {
    font-size: 22px;
    font-weight: 800;
    color: #0f766e;
}

.service-label {
    font-size: 13px;
    color: #555;
}

.kiosk-cta {
    font-size: 20px;
    font-weight: 700;
    padding: 0 40px;
    height: 62px;
}

.kiosk-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
}

@media (max-width: 760px) {
    .kiosk-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #fff;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
}

.stat-icon {
    font-size: 26px;
}

.stat-value {
    font-size: 26px;
    font-weight: 800;
    color: #1a1a2e;
    line-height: 1.1;
}

.stat-label {
    font-size: 12px;
    color: #777;
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.ticket-result {
    text-align: center;
    padding: 8px 0 18px;
}

.ticket-result-code {
    font-size: 58px;
    font-weight: 800;
    letter-spacing: 3px;
    color: #0f766e;
    line-height: 1.1;
}

.ticket-result-service {
    font-size: 15px;
    color: #555;
}

.ticket-result-meta {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}
</style>
