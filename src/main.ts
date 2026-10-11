import { createApp } from "vue";
import naiveUI from "naive-ui";
import router from "./router/router";
import Provider from "./components/Provider.vue";
import { initAuth } from "./services/auth";
import "./index.css";

// Daftarkan header Authorization + penanganan 401 SEBELUM aplikasi dirender,
// supaya request dari komponen mana pun sudah membawa token (bila ada).
initAuth(() => {
  const current = router.currentRoute.value;
  if (current.path !== "/login") {
    router.push({ path: "/login", query: { redirect: current.fullPath } });
  }
});

createApp(Provider).use(router).use(naiveUI).mount("#app");
