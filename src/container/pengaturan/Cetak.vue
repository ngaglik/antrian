<template>
    <div class="section">
        <n-card size="small" class="card">
            <template #header>
                <div class="head">
                    <span class="title">🖨 Cetak Tiket</span>
                    <n-space :size="8" align="center">
                        <n-tag v-if="dirty" size="small" type="warning">
                            belum disimpan
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
                Jumlah <b>salinan</b> tiket antrian yang dicetak setiap kali
                cetak — dipakai halaman <b>Kiosk</b> (cetak otomatis) dan tombol
                <b>Cetak</b> di halaman <b>Pemanggil</b>. Tersimpan di
                <b>database</b> (tabel <code>que.call_setting</code>) sehingga
                berlaku untuk semua perangkat.
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
                <div class="field">
                    <label>Jumlah salinan</label>
                    <n-input-number
                        v-model:value="copies"
                        :min="1"
                        :max="10"
                        size="small"
                        style="width: 160px"
                    />
                    <span class="hint-inline"
                        >1–10 salinan per tiket (default 2).</span
                    >
                </div>
            </n-spin>

            <div class="actions-new">
                <n-button
                    type="primary"
                    :disabled="!dirty || state.loading"
                    :loading="state.saving"
                    @click="save"
                    >Simpan</n-button
                >
            </div>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useMessage } from "naive-ui";
import { usePrintSettings } from "@/services/printSettings";

const message = useMessage();
const { state, loadPrintSettings, savePrintSettings } = usePrintSettings();

const copies = ref(state.copies);

const dirty = computed(() => (copies.value ?? 2) !== state.copies);

onMounted(reload);

async function reload() {
    await loadPrintSettings();
    copies.value = state.copies;
}

async function save() {
    try {
        const saved = await savePrintSettings(copies.value ?? 2);
        copies.value = saved;
        message.success(`Jumlah salinan cetak disimpan: ${saved}`);
    } catch (err) {
        message.error(
            (err as Error).message || "Gagal menyimpan pengaturan cetak",
        );
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

.result {
    margin-bottom: 12px;
}

.field {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.field label {
    font-size: 13px;
    color: #666;
}

.actions-new {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
}
</style>
