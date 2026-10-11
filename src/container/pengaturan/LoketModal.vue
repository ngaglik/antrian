<template>
    <n-modal
        :show="show"
        preset="card"
        :title="`🎫 Loket — ${service || '(tanpa layanan)'}`"
        class="loket-modal"
        :style="{ width: 'min(560px, 94vw)' }"
        @update:show="(value: boolean) => emit('update:show', value)"
    >
        <p class="hint">
            Daftar <b>loket</b> untuk layanan <b>{{ service }}</b>. Pilihan ini
            dipakai halaman <b>Pemanggil</b> (mengikuti filter layanan). Nama
            boleh ditulis apa adanya — “1” maupun “Loket 1” sama-sama tampil
            sebagai “Loket 1” (tidak digandakan). Tersimpan di database (tabel
            <code>que.queue_counter</code>).
        </p>

        <n-alert
            v-if="state.error"
            class="result"
            type="error"
            :show-icon="true"
        >
            {{ state.error }}
        </n-alert>

        <n-spin :show="state.loading">
            <div v-for="counter in counters" :key="counter.id" class="row">
                <n-input
                    v-model:value="draftOf(counter).name"
                    size="small"
                    placeholder="Nama loket"
                />
                <n-switch
                    v-model:value="draftOf(counter).isActive"
                    size="small"
                />
                <n-button
                    size="small"
                    type="primary"
                    :disabled="!isDirty(counter)"
                    :loading="savingId === counter.id"
                    @click="save(counter)"
                    >Simpan</n-button
                >
                <n-button size="small" type="error" ghost @click="remove(counter)"
                    >Hapus</n-button
                >
            </div>

            <n-empty
                v-if="!state.loading && counters.length === 0"
                description="Belum ada loket untuk layanan ini"
                style="padding: 16px 0"
            />
        </n-spin>

        <div class="add-row">
            <n-input
                v-model:value="newName"
                size="small"
                placeholder="Nama loket baru, mis. Loket 1"
                @keyup.enter="add"
            />
            <n-button
                type="primary"
                size="small"
                :loading="creating"
                @click="add"
                >Tambah</n-button
            >
        </div>
    </n-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useDialog, useMessage } from "naive-ui";
import {
    useCounters,
    type QueueCounter,
    type QueueCounterInput,
} from "@/services/counters";

const props = defineProps<{ show: boolean; service: string }>();
const emit = defineEmits<{ (e: "update:show", value: boolean): void }>();

const message = useMessage();
const dialog = useDialog();
const {
    state,
    loadCounters,
    createCounter,
    updateCounter,
    deleteCounter,
} = useCounters();

const savingId = ref("");
const creating = ref(false);
const newName = ref("");

// Nilai yang sedang diedit per loket (belum tentu sama dengan yang di database).
const drafts = reactive<Record<string, QueueCounterInput>>({});

/** Loket milik layanan pada baris data yang diklik. */
const counters = computed(() =>
    state.counters.filter((c) => c.service === props.service),
);

// Muat data & samakan draft setiap kali modal dibuka.
watch(
    () => props.show,
    async (visible) => {
        if (!visible) return;
        newName.value = "";
        await loadCounters();
        syncDrafts();
    },
);

const syncDrafts = () => {
    for (const counter of state.counters) {
        if (!drafts[counter.id]) drafts[counter.id] = toDraft(counter);
    }
    for (const id of Object.keys(drafts)) {
        if (!state.counters.some((c) => c.id === id)) delete drafts[id];
    }
};

const toDraft = (counter: QueueCounter): QueueCounterInput => ({
    service: counter.service,
    name: counter.name,
    isActive: counter.isActive,
});

const draftOf = (counter: QueueCounter): QueueCounterInput => {
    if (!drafts[counter.id]) drafts[counter.id] = toDraft(counter);
    return drafts[counter.id];
};

const isDirty = (counter: QueueCounter) => {
    const draft = draftOf(counter);
    return (
        draft.name.trim() !== counter.name ||
        draft.isActive !== counter.isActive
    );
};

async function save(counter: QueueCounter) {
    const draft = draftOf(counter);
    if (!draft.name.trim()) {
        message.warning("Nama loket wajib diisi");
        return;
    }

    savingId.value = counter.id;
    try {
        const saved = await updateCounter({
            id: counter.id,
            service: props.service,
            name: draft.name,
            isActive: draft.isActive,
        });
        drafts[saved.id] = toDraft(saved);
        message.success(`Loket "${saved.name}" disimpan`);
    } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan loket");
    } finally {
        savingId.value = "";
    }
}

async function add() {
    if (!newName.value.trim()) {
        message.warning("Nama loket wajib diisi");
        return;
    }

    creating.value = true;
    try {
        const counter = await createCounter({
            service: props.service,
            name: newName.value,
            isActive: true,
        });
        drafts[counter.id] = toDraft(counter);
        newName.value = "";
        message.success(`Loket "${counter.name}" ditambahkan`);
    } catch (err) {
        message.error((err as Error).message || "Gagal menambah loket");
    } finally {
        creating.value = false;
    }
}

function remove(counter: QueueCounter) {
    dialog.warning({
        title: "Hapus Loket",
        content: `Hapus loket "${counter.name}" dari layanan "${counter.service}"? Antrian yang sudah terbit tidak berubah.`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
            try {
                await deleteCounter(counter.id);
                delete drafts[counter.id];
                message.success("Loket dihapus");
            } catch (err) {
                message.error((err as Error).message || "Gagal menghapus loket");
            }
        },
    });
}
</script>

<style scoped>
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

.result {
    margin-bottom: 12px;
}

.row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.row .n-input {
    flex: 1;
}

.add-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
}

.add-row .n-input {
    flex: 1;
}
</style>
