<template>
    <div class="section">
        <n-card size="small" class="card">
            <template #header>
                <div class="head">
                    <span class="title">📝 Template Teks Panggilan</span>
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
                Atur kalimat yang dibacakan pengeras suara kiosk (TTS) pada tiap
                tahap. Template tersimpan di <b>database</b> (tabel
                <code>que.call_setting</code>) dan dikirim ke service TTS saat
                nomor dipanggil.
            </p>

            <n-alert class="tokens" type="info" :show-icon="false">
                <div class="tokens-title">Token yang bisa dipakai:</div>
                <div class="tokens-list">
                    <span class="token"
                        ><code>{number}</code> → nomor antrian, mis. “A, nol,
                        nol, satu”</span
                    >
                    <span class="token"
                        ><code>{counter}</code> → loket, mis. “loket satu”
                        (kosong → “loket pelayanan”)</span
                    >
                    <span class="token"
                        ><code>{service}</code> → layanan, mis. “, layanan Umum”
                        (kosong → dihapus otomatis)</span
                    >
                    <span class="token"
                        ><code>{customer}</code> → nama pelanggan, hasil " atas
                        nama …" (kosong → dihapus; hanya terisi bila nama pelanggan diisi petugas)</span
                    >
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

            <n-spin :show="state.loading">
                <div class="fields">
                    <div v-for="field in fields" :key="field.key" class="field">
                        <div class="field-head">
                            <span class="field-title">{{ field.title }}</span>
                            <n-button
                                size="tiny"
                                quaternary
                                @click="useDefault(field.key)"
                                >Kembalikan default</n-button
                            >
                        </div>
                        <div class="field-desc">{{ field.desc }}</div>
                        <n-input
                            v-model:value="draft[field.key]"
                            type="textarea"
                            :autosize="{ minRows: 2, maxRows: 5 }"
                            :maxlength="MAX_LENGTH"
                            show-count
                            :placeholder="DEFAULT_CALL_TEMPLATES[field.key]"
                        />
                        <div class="preview">
                            <span class="preview-label">Pratinjau:</span>
                            <span class="preview-text">{{
                                preview(field.key)
                            }}</span>
                        </div>
                    </div>
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
                    Kosongkan token yang tidak perlu. Nomor antrian tetap dieja
                    per digit oleh service TTS.
                </span>
            </div>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { useMessage } from "naive-ui";
import {
    DEFAULT_CALL_TEMPLATES,
    useCallSettings,
    type CallSetting,
} from "@/services/callSettings";

type TemplateKey =
    | "callTemplate"
    | "servingTemplate"
    | "doneTemplate"
    | "confirmTemplate";

const MAX_LENGTH = 500;

const message = useMessage();
const { state, loadCallSettings, saveCallSettings } = useCallSettings();

const fields: { key: TemplateKey; title: string; desc: string }[] = [
    {
        key: "callTemplate",
        title: "a. Panggilan awal",
        desc: "Dibacakan saat nomor dipanggil — klik daftar menunggu, Panggil Berikutnya, atau panggil ulang.",
    },
    {
        key: "servingTemplate",
        title: "b. Panggilan saat sedang diproses",
        desc: "Dibacakan saat nomor mulai diproses (tombol Mulai Proses).",
    },
    {
        key: "doneTemplate",
        title: "c. Panggilan saat selesai",
        desc: "Dibacakan saat nomor selesai dilayani (tombol Selesai).",
    },
    {
        key: "confirmTemplate",
        title: "d. Panggilan konfirmasi",
        desc: "Dibacakan saat tombol Panggil Konfirmasi di halaman Pemanggil ditekan (status nomor tidak berubah).",
    },
];

const draft = reactive<Record<TemplateKey, string>>({ ...DEFAULT_CALL_TEMPLATES });

const dirty = computed(
    () =>
        draft.callTemplate !== state.setting.callTemplate ||
        draft.servingTemplate !== state.setting.servingTemplate ||
        draft.doneTemplate !== state.setting.doneTemplate ||
        draft.confirmTemplate !== state.setting.confirmTemplate,
);

function syncDraft() {
    draft.callTemplate = state.setting.callTemplate;
    draft.servingTemplate = state.setting.servingTemplate;
    draft.doneTemplate = state.setting.doneTemplate;
    draft.confirmTemplate = state.setting.confirmTemplate;
}

/** Isi satu field dengan template bawaan (belum tersimpan sampai klik Simpan). */
function useDefault(key: TemplateKey) {
    draft[key] = DEFAULT_CALL_TEMPLATES[key];
}

/** Pratinjau sederhana dengan contoh nilai tetap. */
function preview(key: TemplateKey): string {
    const template = draft[key]?.trim() || DEFAULT_CALL_TEMPLATES[key];
    return template
        .replace(/\{number\}/g, "A, nol, nol, satu")
        .replace(/\{counter\}/g, "loket satu")
        .replace(/\{service\}/g, ", layanan Umum")
        .replace(/\{customer\}/g, " atas nama Budi");
}

onMounted(reload);

async function reload() {
    await loadCallSettings();
    syncDraft();
}

async function save() {
    const payload: Pick<CallSetting, TemplateKey> = {
        callTemplate: draft.callTemplate.trim(),
        servingTemplate: draft.servingTemplate.trim(),
        doneTemplate: draft.doneTemplate.trim(),
        confirmTemplate: draft.confirmTemplate.trim(),
    };

    if (
        !payload.callTemplate ||
        !payload.servingTemplate ||
        !payload.doneTemplate ||
        !payload.confirmTemplate
    ) {
        message.error("Template tidak boleh kosong");
        return;
    }

    try {
        await saveCallSettings(payload);
        syncDraft();
        message.success("Template teks panggilan disimpan");
    } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan template");
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
.tokens code,
.hint-inline code {
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 12px;
}

.tokens {
    margin-bottom: 12px;
}

.tokens-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
}

.tokens-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.token {
    font-size: 12.5px;
    color: #555;
    line-height: 1.5;
}

.result {
    margin-bottom: 12px;
}

.fields {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 4px 0;
}

.field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.field-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2430;
}

.field-desc {
    font-size: 12.5px;
    color: #777;
    line-height: 1.45;
    margin: 2px 0 8px;
}

.preview {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    font-size: 12.5px;
    line-height: 1.5;
}

.preview-label {
    color: #999;
    white-space: nowrap;
}

.preview-text {
    color: #4b5563;
    font-style: italic;
}

.actions-new {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
}

.hint-inline {
    font-size: 12px;
    color: #888;
}
</style>
