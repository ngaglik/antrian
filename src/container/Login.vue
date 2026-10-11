<template>
    <div class="login">
        <n-card class="card" size="small">
            <template #header>
                <div class="head">
                    <span class="title">🔒 Masuk</span>
                    <n-tag size="small" type="info">Pemanggil &amp; Pengaturan</n-tag>
                </div>
            </template>

            <p class="hint">
                Login diperlukan untuk halaman <b>Pemanggil</b> dan
                <b>Pengaturan</b>. Halaman <b>Kiosk</b> dan <b>Monitoring</b> dapat
                diakses tanpa login.
            </p>

            <div class="field">
                <label>Username</label>
                <n-input
                    v-model:value="username"
                    size="large"
                    placeholder="username"
                    :disabled="loading"
                    @keydown.enter="submit"
                />
            </div>

            <div class="field">
                <label>Password</label>
                <n-input
                    v-model:value="password"
                    type="password"
                    show-password-on="click"
                    size="large"
                    placeholder="password"
                    :disabled="loading"
                    @keydown.enter="submit"
                />
            </div>

            <n-alert
                v-if="error"
                class="error"
                type="error"
                :show-icon="true"
            >
                {{ error }}
            </n-alert>

            <n-button
                class="submit"
                type="primary"
                size="large"
                block
                :loading="loading"
                :disabled="!canSubmit"
                @click="submit"
            >
                Masuk
            </n-button>

            <div class="back">
                <n-button size="small" quaternary @click="goPublic">
                    ← Lanjut tanpa login (Kiosk/Monitoring)
                </n-button>
            </div>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { login } from "@/services/auth";
import { useSettings } from "@/services/settings";

const route = useRoute();
const router = useRouter();
const message = useMessage();
const { loadRooms } = useSettings();

const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const canSubmit = computed(
    () => !!username.value.trim() && !!password.value && !loading.value,
);

async function submit() {
    if (!canSubmit.value) return;

    loading.value = true;
    error.value = "";
    try {
        await login(username.value.trim(), password.value);

        // Muat ulang daftar ruang sekarang (sudah terautentikasi) agar token
        // kiosk ikut terisi — sebelumnya dimuat anonim tanpa token.
        await loadRooms();

        message.success(`Selamat datang, ${username.value.trim()}`);
        const redirect = route.query.redirect;
        await router.replace(
            typeof redirect === "string" && redirect ? redirect : "/pemanggil",
        );
    } catch (err) {
        error.value = (err as Error).message || "Gagal login";
    } finally {
        loading.value = false;
    }
}

const goPublic = () => router.push("/kiosk");
</script>

<style scoped>
.login {
    max-width: 420px;
    margin: 6vh auto 0;
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
}

.title {
    font-size: 17px;
    font-weight: 700;
}

.hint {
    font-size: 13px;
    color: #666;
    margin: 0 0 14px;
}

.field {
    margin-bottom: 12px;
}

.field label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
}

.error {
    margin-bottom: 12px;
}

.submit {
    margin-top: 4px;
}

.back {
    margin-top: 12px;
    text-align: center;
}
</style>
