<template>
    <div class="section">
        <n-card size="small" class="card">
            <template #header>
                <div class="head">
                    <span class="title">🔊 Ruang Kiosk</span>
                    <n-space :size="8" align="center">
                        <n-tag size="small" type="info">
                            {{ state.rooms.length }} ruang
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
                Setiap <b>ruang</b> mengarah ke satu service
                <code>backend-tts</code> (Text-to-Speech). Daftar ruang
                tersimpan di <b>database</b> (tabel <code>que.kiosk_room</code>)
                lewat backend, jadi berlaku untuk semua perangkat. Ruang yang
                sedang dipakai disimpan per-perangkat.
            </p>

            <n-alert type="default" :show-icon="false" class="server-info">
                <div>
                    Kiosk default server:
                    <b>{{ serverInfo.baseUrl || "(belum diatur)" }}</b>
                </div>
                <div class="server-meta">
                    Token default:
                    {{ serverInfo.hasToken ? "diatur" : "tidak ada" }} · Pengulangan
                    {{ serverInfo.repeats }}x
                    <template v-if="serverInfo.allowedHosts">
                        · Host diizinkan: {{ serverInfo.allowedHosts }}
                    </template>
                </div>
            </n-alert>

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
                v-for="room in state.rooms"
                :key="room.id"
                size="small"
                class="card"
                :class="{ 'card--active': room.id === state.activeRoomId }"
            >
                <template #header>
                    <div class="row-head">
                        <div class="row-title">
                            <span class="row-name">{{
                                room.name || "(tanpa nama)"
                            }}</span>
                            <code class="row-id">{{ room.id }}</code>
                            <n-tag
                                v-if="room.id === state.activeRoomId"
                                size="tiny"
                                type="success"
                                >aktif</n-tag
                            >
                            <n-tag
                                v-if="isDirty(room)"
                                size="tiny"
                                type="warning"
                                >belum disimpan</n-tag
                            >
                        </div>
                        <n-space :size="8" align="center">
                            <n-button
                                size="small"
                                :disabled="room.id === state.activeRoomId"
                                @click="activate(room)"
                                >Aktifkan</n-button
                            >
                            <n-button
                                size="small"
                                type="primary"
                                :disabled="!isDirty(room)"
                                :loading="savingId === room.id"
                                @click="save(room)"
                                >Simpan</n-button
                            >
                            <n-button
                                size="small"
                                :loading="pingingId === room.id"
                                @click="testRoom(room)"
                                >Uji Koneksi</n-button
                            >
                            <n-button
                                size="small"
                                :disabled="state.rooms.length <= 1"
                                type="error"
                                ghost
                                @click="remove(room)"
                                >Hapus</n-button
                            >
                        </n-space>
                    </div>
                </template>

                <div class="fields">
                    <div class="field">
                        <label>Nama ruang</label>
                        <n-input
                            v-model:value="draftOf(room).name"
                            size="small"
                            placeholder="Contoh: Poli Gigi"
                        />
                    </div>
                    <div class="field field--wide">
                        <label>Base URL kiosk</label>
                        <n-input
                            v-model:value="draftOf(room).baseUrl"
                            size="small"
                            placeholder="http://192.168.1.50:9292 (kosong = default server)"
                        />
                    </div>
                    <div class="field">
                        <label>Token (opsional)</label>
                        <n-input
                            v-model:value="draftOf(room).token"
                            size="small"
                            type="password"
                            show-password-on="click"
                            placeholder="kosong bila tidak ada"
                        />
                    </div>
                </div>

                <n-alert
                    v-if="results[room.id]"
                    class="result"
                    :type="results[room.id]?.ok ? 'success' : 'error'"
                    :show-icon="true"
                >
                    {{ results[room.id]?.message }}
                </n-alert>
            </n-card>

            <n-empty
                v-if="!state.loading && state.rooms.length === 0"
                description="Belum ada ruang tersimpan"
                style="padding: 18px 0"
            />
        </n-spin>

        <n-card size="small" class="card">
            <template #header>
                <span class="title small">+ Tambah Ruang</span>
            </template>

            <div class="fields">
                <div class="field">
                    <label>Nama ruang</label>
                    <n-input
                        v-model:value="newRoom.name"
                        size="small"
                        placeholder="Contoh: Poli Gigi"
                    />
                </div>
                <div class="field field--wide">
                    <label>Base URL kiosk</label>
                    <n-input
                        v-model:value="newRoom.baseUrl"
                        size="small"
                        placeholder="http://192.168.1.50:9292 (kosong = default server)"
                    />
                </div>
                <div class="field">
                    <label>Id (opsional)</label>
                    <n-input
                        v-model:value="newRoom.id"
                        size="small"
                        placeholder="otomatis, mis. poli-gigi"
                    />
                </div>
                <div class="field">
                    <label>Token (opsional)</label>
                    <n-input
                        v-model:value="newRoom.token"
                        size="small"
                        type="password"
                        show-password-on="click"
                        placeholder="kosong bila tidak ada"
                    />
                </div>
            </div>

            <div class="actions-new">
                <n-button type="primary" :loading="creating" @click="add"
                    >Tambah</n-button
                >
                <span class="hint-inline"
                    >Base URL tanpa <code>http://</code> otomatis
                    ditambahkan.</span
                >
            </div>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { kioskActions } from "@/services/queueStore";
import {
    useSettings,
    type KioskRoom,
    type KioskRoomInput,
} from "@/services/settings";

const message = useMessage();
const dialog = useDialog();
const { state, loadRooms, createRoom, updateRoom, deleteRoom, setActiveRoom } =
    useSettings();

const serverInfo = reactive({
    baseUrl: "" as string | null,
    hasToken: false,
    repeats: 1,
    allowedHosts: "",
});

const pingingId = ref("");
const savingId = ref("");
const creating = ref(false);

const results = reactive<
    Record<string, { ok: boolean; message: string } | undefined>
>({});

// Nilai yang sedang diedit per ruang (belum tentu sama dengan yang di database).
const drafts = reactive<Record<string, KioskRoomInput>>({});

const newRoom = reactive({ id: "", name: "", baseUrl: "", token: "" });

onMounted(reload);

async function reload() {
    await loadRooms();
    syncDrafts();
    try {
        const info = await kioskActions.config();
        serverInfo.baseUrl = info.baseUrl;
        serverInfo.hasToken = info.hasToken;
        serverInfo.repeats = info.repeats;
        serverInfo.allowedHosts = info.allowedHosts;
    } catch (err) {
        message.warning(
            (err as Error).message || "Gagal memuat konfigurasi kiosk server",
        );
    }
}

/** Samakan daftar draft dengan daftar ruang dari server. */
function syncDrafts() {
    for (const room of state.rooms) {
        if (!drafts[room.id]) drafts[room.id] = toDraft(room);
    }
    for (const id of Object.keys(drafts)) {
        if (!state.rooms.some((r) => r.id === id)) delete drafts[id];
    }
}

const toDraft = (room: KioskRoom): KioskRoomInput => ({
    name: room.name,
    baseUrl: room.baseUrl,
    token: room.token,
});

const draftOf = (room: KioskRoom): KioskRoomInput => {
    if (!drafts[room.id]) drafts[room.id] = toDraft(room);
    return drafts[room.id];
};

const isDirty = (room: KioskRoom) => {
    const draft = draftOf(room);
    return (
        draft.name.trim() !== room.name ||
        draft.baseUrl.trim() !== room.baseUrl ||
        draft.token.trim() !== room.token
    );
};

const activate = (room: KioskRoom) => {
    setActiveRoom(room.id);
    message.success(`Ruang aktif: ${room.name || room.id}`);
};

async function save(room: KioskRoom) {
    const draft = draftOf(room);
    if (!draft.name.trim()) {
        message.warning("Nama ruang wajib diisi");
        return;
    }

    savingId.value = room.id;
    try {
        const saved = await updateRoom({
            id: room.id,
            name: draft.name.trim(),
            baseUrl: draft.baseUrl.trim(),
            token: draft.token.trim(),
        });
        // Pakai nilai hasil normalisasi server (mis. penambahan http://).
        drafts[saved.id] = toDraft(saved);
        message.success(`Ruang "${saved.name}" disimpan`);
    } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan ruang");
    } finally {
        savingId.value = "";
    }
}

async function add() {
    if (!newRoom.name.trim()) {
        message.warning("Nama ruang wajib diisi");
        return;
    }

    creating.value = true;
    try {
        const room = await createRoom({
            id: newRoom.id.trim() || undefined,
            name: newRoom.name.trim(),
            baseUrl: newRoom.baseUrl.trim(),
            token: newRoom.token.trim(),
        });
        drafts[room.id] = toDraft(room);
        newRoom.id = "";
        newRoom.name = "";
        newRoom.baseUrl = "";
        newRoom.token = "";
        message.success(`Ruang "${room.name}" ditambahkan`);
    } catch (err) {
        message.error((err as Error).message || "Gagal menambah ruang");
    } finally {
        creating.value = false;
    }
}

function remove(room: KioskRoom) {
    dialog.warning({
        title: "Hapus Ruang",
        content: `Hapus ruang "${
            room.name || room.id
        }" dari database? Tindakan ini tidak dapat dibatalkan.`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
            try {
                await deleteRoom(room.id);
                delete drafts[room.id];
                delete results[room.id];
                message.success("Ruang dihapus");
            } catch (err) {
                message.error((err as Error).message || "Gagal menghapus ruang");
            }
        },
    });
}

async function testRoom(room: KioskRoom) {
    const draft = draftOf(room);
    pingingId.value = room.id;
    try {
        const result = await kioskActions.ping({
            baseUrl: draft.baseUrl.trim(),
            token: draft.token.trim(),
            room: draft.name.trim(),
        });
        results[room.id] = { ok: result.ok, message: result.message };
        if (result.ok) message.success(result.message);
        else message.error(result.message);
    } catch (err) {
        const msg = (err as Error).message || "Gagal menguji koneksi";
        results[room.id] = { ok: false, message: msg };
        message.error(msg);
    } finally {
        pingingId.value = "";
    }
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

.card--active {
    border-color: #14b8a6;
    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.15);
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

.hint code,
.hint-inline code {
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 12px;
}

.hint-inline {
    font-size: 12px;
    color: #888;
}

.server-info {
    font-size: 13px;
}

.server-meta {
    font-size: 12px;
    color: #888;
    margin-top: 2px;
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
    flex: 1 1 170px;
    min-width: 150px;
}

.field--wide {
    flex: 2 1 280px;
}

.field label {
    display: block;
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.result {
    margin-top: 12px;
}

.actions-new {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
}
</style>
