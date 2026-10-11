<template>
    <div class="section">
        <n-card size="small" class="card">
            <template #header>
                <div class="head">
                    <span class="title">🔢 Prefiks Layanan</span>
                    <n-space :size="8" align="center">
                        <n-tag size="small" type="info">
                            {{ state.prefixes.length }} prefiks
                        </n-tag>
                        <n-tag size="small" type="success">
                            {{ activePrefixes.length }} aktif
                        </n-tag>
                        <n-button
                            size="tiny"
                            quaternary
                            :loading="state.loading"
                            @click="reload"
                            >↻ Muat ulang</n-button
                        >
                    </n-space>
                </div>
            </template>

            <p class="hint">
                Prefiks menentukan awalan nomor antrian dan tombol layanan di
                halaman <b>Kiosk</b>. Contoh: kode <code>A</code> dengan layanan
                <code>Umum</code> menghasilkan nomor <code>A001</code>. Tiap
                prefiks dapat dimiliki satu <b>ruang</b> — kiosk ruang tersebut
                hanya menampilkan prefiks miliknya (plus prefiks
                <i>semua ruang</i>). Tombol <b>Loket</b> pada tiap baris mengatur
                daftar loket layanan tersebut. Data tersimpan di <b>database</b>
                (tabel <code>que.queue_prefix</code> &amp;
                <code>que.queue_counter</code>).
            </p>

            <div class="filter-row">
                <span class="label">Tampilkan</span>
                <n-select
                    v-model:value="filter"
                    :options="filterOptions"
                    size="small"
                    style="width: 220px"
                />
            </div>

            <n-alert
                v-if="state.error"
                class="result"
                type="error"
                :show-icon="true"
            >
                {{ state.error }}
            </n-alert>
        </n-card>

        <n-spin :show="state.loading">
            <n-card
                v-for="prefix in filteredPrefixes"
                :key="prefix.id"
                size="small"
                class="card"
                :class="{ 'card--inactive': !prefix.isActive }"
            >
                <template #header>
                    <div class="row-head">
                        <div class="row-title">
                            <span class="code-badge">{{ prefix.code }}</span>
                            <span class="row-name">{{
                                prefix.service || "(tanpa layanan)"
                            }}</span>
                            <n-tag
                                size="tiny"
                                :type="prefix.roomId ? 'info' : 'default'"
                                >{{ roomName(prefix.roomId) }}</n-tag
                            >
                            <code class="row-id">{{ prefix.id }}</code>
                            <n-tag
                                v-if="!prefix.isActive"
                                size="tiny"
                                type="warning"
                                >nonaktif</n-tag
                            >
                            <n-tag
                                v-if="isDirty(prefix)"
                                size="tiny"
                                type="warning"
                                >belum disimpan</n-tag
                            >
                        </div>
                        <n-space :size="8" align="center">
                            <n-button size="small" @click="openLoket(prefix)"
                                >Loket</n-button
                            >
                            <n-button
                                size="small"
                                type="primary"
                                :disabled="!isDirty(prefix)"
                                :loading="savingId === prefix.id"
                                @click="save(prefix)"
                                >Simpan</n-button
                            >
                            <n-button
                                size="small"
                                :disabled="state.prefixes.length <= 1"
                                type="error"
                                ghost
                                @click="remove(prefix)"
                                >Hapus</n-button
                            >
                        </n-space>
                    </div>
                </template>

                <div class="fields">
                    <div class="field field--code">
                        <label>Kode prefiks</label>
                        <n-input
                            v-model:value="draftOf(prefix).code"
                            size="small"
                            maxlength="5"
                            placeholder="A"
                        />
                    </div>
                    <div class="field field--wide">
                        <label>Nama layanan</label>
                        <n-input
                            v-model:value="draftOf(prefix).service"
                            size="small"
                            placeholder="Contoh: Umum"
                        />
                    </div>
                    <div class="field field--room">
                        <label>Ruang</label>
                        <n-select
                            v-model:value="draftOf(prefix).roomId"
                            :options="roomOptions"
                            size="small"
                        />
                    </div>
                    <div class="field field--switch">
                        <label>Aktif</label>
                        <div class="switch-row">
                            <n-switch
                                v-model:value="draftOf(prefix).isActive"
                                size="small"
                            />
                            <span class="hint-inline">{{
                                draftOf(prefix).isActive
                                    ? "Tampil di kiosk"
                                    : "Disembunyikan"
                            }}</span>
                        </div>
                    </div>
                </div>
            </n-card>

            <n-empty
                v-if="!state.loading && filteredPrefixes.length === 0"
                description="Tidak ada prefiks untuk filter ini"
                style="padding: 18px 0"
            />
        </n-spin>

        <n-card size="small" class="card">
            <template #header>
                <span class="title small">+ Tambah Prefiks</span>
            </template>

            <div class="fields">
                <div class="field field--code">
                    <label>Kode prefiks</label>
                    <n-input
                        v-model:value="newPrefix.code"
                        size="small"
                        maxlength="5"
                        placeholder="D"
                    />
                </div>
                <div class="field field--wide">
                    <label>Nama layanan</label>
                    <n-input
                        v-model:value="newPrefix.service"
                        size="small"
                        placeholder="Contoh: Farmasi"
                    />
                </div>
                <div class="field field--room">
                    <label>Ruang</label>
                    <n-select
                        v-model:value="newPrefix.roomId"
                        :options="roomOptions"
                        size="small"
                    />
                </div>
                <div class="field field--switch">
                    <label>Aktif</label>
                    <div class="switch-row">
                        <n-switch v-model:value="newPrefix.isActive" size="small" />
                        <span class="hint-inline">Tampil di kiosk</span>
                    </div>
                </div>
            </div>

            <div class="actions-new">
                <n-button type="primary" :loading="creating" @click="add"
                    >Tambah</n-button
                >
                <span class="hint-inline"
                    >Kode 1–5 huruf/angka (otomatis huruf besar) &amp; unik. Ruang
                    kosong = berlaku untuk semua ruang.</span
                >
            </div>
        </n-card>

        <!-- Kelola loket layanan (dibuka dari tombol Loket tiap baris) -->
        <LoketModal v-model:show="showLoket" :service="loketService" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { useSettings } from "@/services/settings";
import LoketModal from "./LoketModal.vue";
import {
    usePrefixes,
    type QueuePrefix,
    type QueuePrefixInput,
} from "@/services/prefixes";

const message = useMessage();
const dialog = useDialog();
const {
    state,
    activePrefixes,
    loadPrefixes,
    createPrefix,
    updatePrefix,
    deletePrefix,
} = usePrefixes();
const { state: settingsState, loadRooms } = useSettings();

const savingId = ref("");
const creating = ref(false);

// Loket: modal daftar loket untuk satu layanan (baris data).
const showLoket = ref(false);
const loketService = ref("");

function openLoket(prefix: QueuePrefix) {
    loketService.value = prefix.service;
    showLoket.value = true;
}

// Filter daftar: "all" | "shared" | <roomId>
const filter = ref<string>("all");

// Nilai yang sedang diedit per prefiks (belum tentu sama dengan yang di database).
const drafts = reactive<Record<string, QueuePrefixInput>>({});

const newPrefix = reactive({ code: "", service: "", roomId: "", isActive: true });

const roomOptions = computed(() => [
    { label: "Semua ruang", value: "" },
    ...settingsState.rooms.map((r) => ({ label: r.name || r.id, value: r.id })),
]);

const filterOptions = computed(() => [
    { label: "Semua prefiks", value: "all" },
    { label: "Tanpa ruang (bersama)", value: "shared" },
    ...settingsState.rooms.map((r) => ({ label: r.name || r.id, value: r.id })),
]);

const filteredPrefixes = computed(() => {
    if (filter.value === "all") return state.prefixes;
    if (filter.value === "shared") return state.prefixes.filter((p) => !p.roomId);
    return state.prefixes.filter((p) => p.roomId === filter.value);
});

const roomName = (roomId: string) => {
    if (!roomId) return "Semua ruang";
    return (
        settingsState.rooms.find((r) => r.id === roomId)?.name || roomId
    );
};

onMounted(async () => {
    await loadRooms();
    await reload();
});

async function reload() {
    await loadPrefixes();
    syncDrafts();
}

/** Samakan daftar draft dengan daftar prefiks dari server. */
function syncDrafts() {
    for (const prefix of state.prefixes) {
        if (!drafts[prefix.id]) drafts[prefix.id] = toDraft(prefix);
    }
    for (const id of Object.keys(drafts)) {
        if (!state.prefixes.some((p) => p.id === id)) delete drafts[id];
    }
}

const toDraft = (prefix: QueuePrefix): QueuePrefixInput => ({
    code: prefix.code,
    service: prefix.service,
    roomId: prefix.roomId,
    isActive: prefix.isActive,
});

const draftOf = (prefix: QueuePrefix): QueuePrefixInput => {
    if (!drafts[prefix.id]) drafts[prefix.id] = toDraft(prefix);
    return drafts[prefix.id];
};

const isDirty = (prefix: QueuePrefix) => {
    const draft = draftOf(prefix);
    return (
        draft.code.trim().toUpperCase() !== prefix.code ||
        draft.service.trim() !== prefix.service ||
        draft.roomId !== prefix.roomId ||
        draft.isActive !== prefix.isActive
    );
};

async function save(prefix: QueuePrefix) {
    const draft = draftOf(prefix);
    if (!draft.code.trim()) {
        message.warning("Kode prefiks wajib diisi");
        return;
    }
    if (!draft.service.trim()) {
        message.warning("Nama layanan wajib diisi");
        return;
    }

    savingId.value = prefix.id;
    try {
        const saved = await updatePrefix({
            id: prefix.id,
            code: draft.code,
            service: draft.service,
            roomId: draft.roomId,
            isActive: draft.isActive,
        });
        // Pakai nilai hasil normalisasi server (kode jadi huruf besar).
        drafts[saved.id] = toDraft(saved);
        message.success(`Prefiks ${saved.code} (${saved.service}) disimpan`);
    } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan prefiks");
    } finally {
        savingId.value = "";
    }
}

async function add() {
    if (!newPrefix.code.trim()) {
        message.warning("Kode prefiks wajib diisi");
        return;
    }
    if (!newPrefix.service.trim()) {
        message.warning("Nama layanan wajib diisi");
        return;
    }

    creating.value = true;
    try {
        const prefix = await createPrefix({
            code: newPrefix.code,
            service: newPrefix.service,
            roomId: newPrefix.roomId,
            isActive: newPrefix.isActive,
        });
        drafts[prefix.id] = toDraft(prefix);
        newPrefix.code = "";
        newPrefix.service = "";
        newPrefix.roomId = "";
        newPrefix.isActive = true;
        message.success(
            `Prefiks ${prefix.code} (${prefix.service}) ditambahkan`,
        );
    } catch (err) {
        message.error((err as Error).message || "Gagal menambah prefiks");
    } finally {
        creating.value = false;
    }
}

function remove(prefix: QueuePrefix) {
    dialog.warning({
        title: "Hapus Prefiks",
        content: `Hapus prefiks ${prefix.code} (${
            prefix.service || "tanpa layanan"
        }) dari database? Nomor antrian yang sudah terbit tidak berubah.`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
            try {
                await deletePrefix(prefix.id);
                delete drafts[prefix.id];
                message.success("Prefiks dihapus");
            } catch (err) {
                message.error((err as Error).message || "Gagal menghapus prefiks");
            }
        },
    });
}
</script>

<style scoped>
.section {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.card {
    border-radius: 14px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
    border: 1px solid transparent;
}

.card--inactive {
    opacity: 0.72;
    background: #fafafa;
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
}

.title {
    font-size: 15px;
    font-weight: 700;
}

.title.small {
    font-size: 14px;
}

.hint {
    font-size: 13px;
    color: #666;
    margin: 0 0 12px;
}

.hint code {
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 12px;
}

.hint-inline {
    font-size: 12px;
    color: #888;
}

.filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.filter-row .label {
    font-size: 13px;
    color: #666;
}

.row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
}

.row-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.code-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 26px;
    padding: 0 8px;
    border-radius: 8px;
    background: #ccfbf1;
    color: #0f766e;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 1px;
}

.row-name {
    font-size: 15px;
    font-weight: 700;
}

.row-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px;
    color: #64748b;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 1px 6px;
    user-select: all;
}

.fields {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.field {
    flex: 1 1 150px;
    min-width: 140px;
}

.field--code {
    flex: 0 1 120px;
}

.field--wide {
    flex: 2 1 220px;
}

.field--room {
    flex: 1 1 180px;
}

.field--switch {
    flex: 0 1 150px;
}

.field label {
    display: block;
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.switch-row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 28px;
}

.result {
    margin-top: 12px;
}

.actions-new {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
    flex-wrap: wrap;
}
</style>
