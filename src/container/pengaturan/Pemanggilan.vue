<template>
    <div class="section">
        <n-card size="small" class="card">
            <template #header>
                <div class="head">
                    <span class="title">📢 Pemanggilan</span>
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
                Atur kapan nomor dibacakan lewat pengeras suara kiosk (TTS) pada
                tiap tahap proses. Pengaturan tersimpan di <b>database</b>
                (tabel <code>que.call_setting</code>) dan pengumuman dikirim ke
                <b>ruang yang sedang aktif</b>.
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
                <div class="checks">
                    <n-checkbox
                        v-model:checked="draft.announceOnCall"
                        size="large"
                        class="check"
                    >
                        <span class="check-text">
                            <span class="check-title"
                                >a. Panggilan awal saat klik daftar
                                menunggu</span
                            >
                            <span class="check-desc">
                                Umumkan saat nomor dipanggil — klik kartu daftar
                                menunggu, tombol <b>Panggil Berikutnya</b>, atau
                                panggil ulang.
                            </span>
                        </span>
                    </n-checkbox>

                    <n-checkbox
                        v-model:checked="draft.announceOnRecall"
                        size="large"
                        class="check"
                    >
                        <span class="check-text">
                            <span class="check-title"
                                >b. Panggilan ulang</span
                            >
                            <span class="check-desc">
                                Umumkan saat nomor yang sudah dipanggil/diproses
                                dipanggil lagi (tombol <b>Panggil Ulang</b>).
                            </span>
                        </span>
                    </n-checkbox>

                    <n-checkbox
                        v-model:checked="draft.announceOnServing"
                        size="large"
                        class="check"
                    >
                        <span class="check-text">
                            <span class="check-title"
                                >c. Panggilan saat sedang diproses</span
                            >
                            <span class="check-desc">
                                Umumkan saat nomor mulai diproses (tombol
                                <b>Mulai Proses</b>).
                            </span>
                        </span>
                    </n-checkbox>

                    <n-checkbox
                        v-model:checked="draft.announceOnDone"
                        size="large"
                        class="check"
                    >
                        <span class="check-text">
                            <span class="check-title"
                                >d. Panggilan saat selesai</span
                            >
                            <span class="check-desc">
                                Umumkan saat nomor selesai dilayani (tombol
                                <b>Selesai</b>).
                            </span>
                        </span>
                    </n-checkbox>

                    <n-checkbox
                        v-model:checked="draft.announceOnConfirm"
                        size="large"
                        class="check"
                    >
                        <span class="check-text">
                            <span class="check-title"
                                >e. Panggilan konfirmasi</span
                            >
                            <span class="check-desc">
                                Izinkan tombol <b>Panggil Konfirmasi</b> di halaman
                                Pemanggil membacakan template konfirmasi.
                            </span>
                        </span>
                    </n-checkbox>
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
                <span class="hint-inline">
                    Teks tiap tahap diatur di tab
                    <b>📝 Template Teks Panggilan</b>.
                </span>
            </div>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { useMessage } from "naive-ui";
import {
    useCallSettings,
    type CallSetting,
} from "@/services/callSettings";

const message = useMessage();
const { state, loadCallSettings, saveCallSettings } = useCallSettings();

const draft = reactive<CallSetting>({ ...state.setting });

const dirty = computed(
    () =>
        draft.announceOnCall !== state.setting.announceOnCall ||
        draft.announceOnRecall !== state.setting.announceOnRecall ||
        draft.announceOnServing !== state.setting.announceOnServing ||
        draft.announceOnDone !== state.setting.announceOnDone ||
        draft.announceOnConfirm !== state.setting.announceOnConfirm,
);

function syncDraft() {
    draft.announceOnCall = state.setting.announceOnCall;
    draft.announceOnRecall = state.setting.announceOnRecall;
    draft.announceOnServing = state.setting.announceOnServing;
    draft.announceOnDone = state.setting.announceOnDone;
    draft.announceOnConfirm = state.setting.announceOnConfirm;
    // Template tidak diubah dari tab ini, tetapi tetap disalin agar draft
    // selalu mencerminkan pengaturan terbaru.
    draft.callTemplate = state.setting.callTemplate;
    draft.servingTemplate = state.setting.servingTemplate;
    draft.doneTemplate = state.setting.doneTemplate;
    draft.confirmTemplate = state.setting.confirmTemplate;
}

onMounted(reload);

async function reload() {
    await loadCallSettings();
    syncDraft();
}

async function save() {
    try {
        await saveCallSettings({
            announceOnCall: draft.announceOnCall,
            announceOnRecall: draft.announceOnRecall,
            announceOnServing: draft.announceOnServing,
            announceOnDone: draft.announceOnDone,
            announceOnConfirm: draft.announceOnConfirm,
        });
        syncDraft();
        message.success("Pengaturan pemanggilan disimpan");
    } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan pengaturan");
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

.result {
    margin-bottom: 12px;
}

.checks {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px 0;
}

.check {
    align-items: flex-start;
}

.check :deep(.n-checkbox__label) {
    white-space: normal;
    padding-left: 10px;
}

.check-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
}

.check-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2430;
}

.check-desc {
    font-size: 12.5px;
    color: #777;
    line-height: 1.45;
}

.actions-new {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
}
</style>
