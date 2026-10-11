<template>
    <div class="app-shell">
        <header v-if="headerVisible" class="app-header">
            <div class="brand">
                <span class="brand-icon">🎫</span>
                <div class="brand-text">
                    <div class="brand-title">Sistem Antrian</div>
                    <div class="brand-sub">
                        {{ state.date || "—" }} · {{ state.serverTime || "--:--" }}
                    </div>
                </div>
            </div>

            <nav class="app-nav">
                <router-link to="/kiosk" class="nav-item">Kiosk</router-link>
                <router-link to="/pemanggil" class="nav-item"
                    >Pemanggil</router-link
                >
                <router-link to="/monitoring" class="nav-item"
                    >Monitoring</router-link
                >
                <router-link to="/pengaturan" class="nav-item"
                    >⚙ Pengaturan</router-link
                >
            </nav>

            <n-tag v-if="activeRoom" size="small" type="success" :bordered="false">
                🔊 {{ activeRoom.name }}
            </n-tag>

            <n-tag :type="state.connected ? 'success' : 'error'" size="small">
                {{ state.connected ? "🟢 Realtime" : "🔴 Terputus" }}
            </n-tag>

            <router-link v-if="!authed" to="/login" class="nav-item"
                >🔒 Masuk</router-link
            >
            <button
                v-else
                class="nav-item nav-item--action"
                type="button"
                :title="`Keluar dari sesi ${authState.username}`"
                @click="handleLogout"
            >
                ⏏ Keluar ({{ authState.username }})
            </button>

            <button
                class="header-toggle"
                type="button"
                title="Sembunyikan menu"
                aria-label="Sembunyikan menu"
                @click="toggleHeader"
            >
                ✕
            </button>
        </header>

        <!-- Header disembunyikan (default di halaman Kiosk): tombol kecil untuk
             menampilkannya kembali. -->
        <button
            v-else
            class="header-toggle header-toggle--floating"
            type="button"
            title="Tampilkan menu"
            aria-label="Tampilkan menu"
            @click="toggleHeader"
        >
            ☰
        </button>

        <main
            class="app-content"
            :class="{ 'app-content--full': isFullWidthRoute }"
        >
            <!-- Judul besar nama ruang — mengikuti parameter URL (/monitoring/<room_id>)
                 bila ada, atau ruang aktif per-perangkat untuk halaman lain. -->
            <div v-if="bannerRoom" class="room-banner">
                <div class="room-banner-label">Ruang</div>
                <div class="room-banner-name">
                    {{ bannerRoom.name || bannerRoom.id }}
                </div>
            </div>

            <router-view />
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    refreshSnapshot,
    startQueueStream,
    stopQueueStream,
    useQueue,
} from "@/services/queueStore";
import { useSettings } from "@/services/settings";
import { authState, isAuthenticated, logout } from "@/services/auth";

const route = useRoute();
const router = useRouter();
const { state } = useQueue();
const { state: settingsState, activeRoom, loadRooms } = useSettings();

/** Login hanya untuk halaman Pemanggil/Pengaturan (lihat router). */
const authed = computed(() => isAuthenticated());

/** Id ruang dari parameter URL (mis. /monitoring/<room_id>). */
const urlRoomId = computed(() => String(route.params.roomId ?? "").trim());

/**
 * Ruang yang ditampilkan di judul utama. Ruang dari parameter URL diutamakan
 * (mis. layar monitoring per ruang); bila tidak ada, pakai ruang aktif
 * per-perangkat. Bila id ruang belum termuat, tampilkan id-nya sebagai nama.
 */
const bannerRoom = computed<{ id: string; name: string } | null>(() => {
    if (urlRoomId.value) {
        const found = settingsState.rooms.find((r) => r.id === urlRoomId.value);
        return { id: urlRoomId.value, name: found?.name ?? "" };
    }
    return activeRoom.value;
});

/** Halaman yang memakai lebar penuh layar (tanpa max-width container). */
const isFullWidthRoute = computed(() => route.name === "monitoring");

async function handleLogout() {
    logout();
    // Muat ulang daftar ruang tanpa token (token kiosk tidak lagi dikirim).
    await loadRooms();
    router.push("/kiosk");
}

// ── Show/hide header bar ────────────────────────────────────────────
// Default: tersembunyi di halaman Kiosk (agar layar kiosk bersih), tampil di
// halaman lain. Tombol ☰/✕ dapat mengubah sementara; berpindah halaman
// mengembalikan ke default halaman tersebut.
const headerOverride = ref<boolean | null>(null);
// "/" dianggap sama dengan kiosk (redirect) agar header tidak sempat berkedip.
const headerHiddenByDefault = (path: string) => path === "/" || path === "/kiosk";
const headerVisible = computed(
    () => headerOverride.value ?? !headerHiddenByDefault(route.path),
);
const toggleHeader = () => {
    headerOverride.value = !headerVisible.value;
};

watch(
    () => route.path,
    () => {
        headerOverride.value = null;
    },
);

onMounted(() => {
    // Daftar ruang kiosk berasal dari database (via API).
    loadRooms();
    startQueueStream();
    refreshSnapshot();
});

onUnmounted(() => stopQueueStream());
</script>

<style scoped>
.app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.app-header {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 10px 20px;
    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand-icon {
    font-size: 26px;
}

.brand-title {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.2;
}

.brand-sub {
    font-size: 12px;
    opacity: 0.85;
}

.app-nav {
    display: flex;
    gap: 6px;
    margin-left: auto;
}

.nav-item {
    padding: 6px 16px;
    border-radius: 999px;
    color: #e6fffa;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    transition: background 0.15s;
}

.nav-item:hover {
    background: rgba(255, 255, 255, 0.15);
}

.nav-item.router-link-active {
    background: #ffffff;
    color: #0f766e;
}

/* Tombol "Keluar" — dibuat menyerupai item navigasi. */
.nav-item--action {
    border: none;
    cursor: pointer;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.15);
}

.nav-item--action:hover {
    background: rgba(255, 255, 255, 0.28);
}

.header-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s;
}

.header-toggle:hover {
    background: rgba(255, 255, 255, 0.32);
}

/* Saat header disembunyikan, tombol melayang di pojok kanan atas. */
.header-toggle--floating {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1100;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 16px;
    background: rgba(15, 118, 110, 0.85);
    color: #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}

.header-toggle--floating:hover {
    background: rgba(15, 118, 110, 1);
}

.app-content {
    flex: 1;
    padding: 20px;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
}

/* Halaman tertentu (mis. Monitoring) memakai lebar penuh layar. */
.app-content--full {
    max-width: none;
}

.room-banner {
    text-align: center;
    margin-bottom: 18px;
    padding: 12px 18px;
    background: #fff;
    border-radius: 14px;
    border-top: 4px solid #14b8a6;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
}

.room-banner-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #94a3b8;
}

.room-banner-name {
    font-size: 34px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: 0.5px;
    color: #0f766e;
    overflow-wrap: anywhere;
}

@media (max-width: 760px) {
    .room-banner-name {
        font-size: 26px;
    }
}
</style>
