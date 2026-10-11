import { createRouter, createWebHistory } from "vue-router";
import Kiosk from "@/container/Kiosk.vue";
import Pemanggil from "@/container/Pemanggil.vue";
import Monitoring from "@/container/Monitoring.vue";
import UjiSuara from "@/container/UjiSuara.vue";
import Pengaturan from "@/container/Pengaturan.vue";
import Login from "@/container/Login.vue";
import { isAuthenticated } from "@/services/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/kiosk" },

    // ── Tanpa login (kiosk ruang tunggu & layar monitoring) ──────────
    { path: "/kiosk", name: "kiosk", component: Kiosk },
    // Monitoring dapat difilter per ruang lewat parameter URL: /monitoring/<room_id>.
    // Tanpa parameter (/monitoring) = semua ruang.
    {
      path: "/monitoring/:roomId?",
      name: "monitoring",
      component: Monitoring,
    },

    // ── Perlu login (operator) ───────────────────────────────────────
    {
      path: "/pemanggil",
      name: "pemanggil",
      component: Pemanggil,
      meta: { requiresAuth: true },
    },
    {
      path: "/uji-suara",
      name: "uji-suara",
      component: UjiSuara,
      meta: { requiresAuth: true },
    },
    {
      path: "/pengaturan",
      name: "pengaturan",
      component: Pengaturan,
      meta: { requiresAuth: true },
    },

    { path: "/login", name: "login", component: Login },
  ],
});

// Halaman yang butuh login → arahkan ke /login (tujuan semula disimpan).
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (to.path === "/login" && isAuthenticated()) {
    return { path: "/pemanggil" };
  }
  return true;
});

export default router;
