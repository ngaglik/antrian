<template>
    <div class="uji">
        <n-card class="card" size="small">
            <template #header>
                <div class="head">
                    <span class="title">🔊 Uji Suara (Text to Speech)</span>
                    <n-space align="center" :size="8">
                        <span class="label">Ruang</span>
                        <n-select
                            v-model:value="roomId"
                            :options="roomOptions"
                            size="small"
                            style="width: 150px"
                        />
                        <n-button size="tiny" quaternary @click="goSettings"
                            >⚙ Pengaturan</n-button
                        >
                        <n-button size="tiny" quaternary @click="goHome"
                            >← Kembali ke Pemanggil</n-button
                        >
                        <n-tag
                            :type="state.connected ? 'success' : 'error'"
                            size="tiny"
                        >
                            {{ state.connected ? "realtime" : "offline" }}
                        </n-tag>
                    </n-space>
                </div>
            </template>

            <p class="hint">
                Tulis paragraf bebas lalu klik <b>Dengarkan</b> — teks akan
                dibacakan melalui pengeras suara kiosk (TTS). Berguna untuk
                mengumumkan informasi selain nomor antrian.
            </p>

            <n-input
                v-model:value="text"
                type="textarea"
                :rows="8"
                maxlength="1500"
                show-count
                clearable
                placeholder="Contoh: Selamat pagi, mohon perhatian. Poli gigi sedang melakukan pemeliharaan alat, pelayanan dialihkan ke poli umum. Terima kasih."
                @keydown.ctrl.enter="speak"
            />

            <n-space align="center" class="actions" :size="10">
                <n-button
                    type="primary"
                    :loading="sending"
                    :disabled="!canSpeak"
                    @click="speak"
                >
                    🔊 Dengarkan
                </n-button>
                <n-button :disabled="sending" @click="stop">
                    ⏹ Hentikan
                </n-button>

                <span class="label">Pengulangan</span>
                <n-select
                    v-model:value="repeat"
                    :options="repeatOptions"
                    size="small"
                    style="width: 88px"
                />

                <n-button size="small" quaternary @click="useSample"
                    >Contoh teks</n-button
                >
                <n-button
                    size="small"
                    quaternary
                    :disabled="!text"
                    @click="text = ''"
                    >Bersihkan</n-button
                >
            </n-space>

            <p class="shortcut">Tip: Ctrl+Enter untuk langsung membacakan.</p>

            <n-alert
                v-if="status"
                class="status"
                :type="statusType"
                :show-icon="true"
            >
                {{ status }}
            </n-alert>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { useQueue } from "@/services/queueStore";
import { useSettings } from "@/services/settings";

const router = useRouter();
const message = useMessage();
const { state, queueActions } = useQueue();
const {
    state: settingsState,
    setActiveRoom,
    kioskTarget,
} = useSettings();

const text = ref("");
const repeat = ref(1);
const sending = ref(false);
const status = ref("");
const statusType = ref<"success" | "error" | "info">("info");

const repeatOptions = [1, 2, 3].map((n) => ({
    label: `${n}x`,
    value: n,
}));

// Ruang kiosk tujuan (multi kiosk).
const roomOptions = computed(() =>
    settingsState.rooms.map((r) => ({
        label: r.name || r.baseUrl || "(tanpa nama)",
        value: r.id,
    })),
);
const roomId = computed({
    get: () => settingsState.activeRoomId,
    set: (value: string) => setActiveRoom(value),
});

const canSpeak = computed(() => !!text.value.trim() && !sending.value);

const SAMPLE = [
    "Selamat pagi, mohon perhatian.",
    "Nomor antrian A, nol, nol, lima, silakan menuju loket dua.",
    "Bagi pengunjung yang belum melakukan pendaftaran, silakan menuju meja informasi.",
    "Terima kasih atas kesabaran Anda menunggu.",
].join(" ");

const goHome = () => router.push("/pemanggil");
const goSettings = () => router.push("/pengaturan");

const useSample = () => {
    text.value = SAMPLE;
};

const speak = async () => {
    if (!canSpeak.value) return;
    sending.value = true;
    status.value = "";
    try {
        const result = await queueActions.speak(
            text.value.trim(),
            repeat.value,
            kioskTarget(),
        );
        statusType.value = "success";
        status.value =
            result?.message ||
            "Teks dikirim ke pengeras suara. Silakan dengarkan.";
        message.success("Teks dikirim untuk dibacakan");
    } catch (err) {
        statusType.value = "error";
        status.value =
            (err as Error).message || "Gagal mengirim teks ke pengeras suara";
        message.error(status.value);
    } finally {
        sending.value = false;
    }
};

const stop = async () => {
    try {
        await queueActions.stopSpeak(kioskTarget());
        statusType.value = "info";
        status.value = "Bacaan dihentikan.";
        message.info("Bacaan dihentikan");
    } catch (err) {
        statusType.value = "error";
        status.value = (err as Error).message || "Gagal menghentikan bacaan";
        message.error(status.value);
    }
};
</script>

<style scoped>
.uji {
    max-width: 820px;
    margin: 0 auto;
}

.card {
    border-radius: 14px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
}

.title {
    font-size: 16px;
    font-weight: 700;
}

.hint {
    font-size: 13px;
    color: #666;
    margin-bottom: 12px;
}

.actions {
    margin-top: 14px;
}

.label {
    font-size: 13px;
    color: #666;
}

.shortcut {
    font-size: 12px;
    color: #999;
    margin-top: 8px;
}

.status {
    margin-top: 14px;
}
</style>
