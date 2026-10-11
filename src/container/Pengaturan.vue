<template>
    <div class="pengaturan">
        <div class="page-head">
            <div>
                <div class="page-title">⚙ Pengaturan</div>
                <div class="page-sub">
                    Ruang kiosk, prefiks/loket layanan, pemanggilan, template teks
                    &amp; cetak — tersimpan di database
                </div>
            </div>
            <n-button size="small" quaternary @click="goPemanggil"
                >← Kembali ke Pemanggil</n-button
            >
        </div>

        <n-tabs v-model:value="tab" type="line" animated>
            <n-tab-pane
                name="ruang"
                tab="🔊 Ruang Kiosk"
                display-directive="show"
            >
                <RuangKiosk />
            </n-tab-pane>
            <n-tab-pane
                name="prefiks"
                tab="🔢 Prefiks Layanan"
                display-directive="show"
            >
                <PrefiksNomor />
            </n-tab-pane>
            <n-tab-pane
                name="pemanggilan"
                tab="📢 Pemanggilan"
                display-directive="show"
            >
                <Pemanggilan />
            </n-tab-pane>
            <n-tab-pane
                name="template"
                tab="📝 Template Teks Panggilan"
                display-directive="show"
            >
                <TemplateTeks />
            </n-tab-pane>
            <n-tab-pane
                name="cetak"
                tab="🖨 Cetak"
                display-directive="show"
            >
                <Cetak />
            </n-tab-pane>
        </n-tabs>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import RuangKiosk from "./pengaturan/RuangKiosk.vue";
import PrefiksNomor from "./pengaturan/PrefiksNomor.vue";
import Pemanggilan from "./pengaturan/Pemanggilan.vue";
import TemplateTeks from "./pengaturan/TemplateTeks.vue";
import Cetak from "./pengaturan/Cetak.vue";

const router = useRouter();

// Ingat tab terakhir yang dibuka (per-perangkat).
const TAB_KEY = "antrian.pengaturan.tab";
const tab = ref<string>(localStorage.getItem(TAB_KEY) || "ruang");
watch(tab, (value) => localStorage.setItem(TAB_KEY, value));

const goPemanggil = () => router.push("/pemanggil");
</script>

<style scoped>
/* Lebarnya mengikuti judul besar (room banner) di atasnya — tanpa batas
   940px — supaya tab & kartu sejajar dengan judul. */
.pengaturan {
    width: 100%;
}

/* Kedua tab dibagi sama lebar dan mengisi seluruh lebar konten. */
.pengaturan :deep(.n-tabs-nav-scroll-content) {
    width: 100%;
}

.pengaturan :deep(.n-tabs-tab) {
    flex: 1 1 0;
    justify-content: center;
}

.page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 6px;
}

.page-title {
    font-size: 20px;
    font-weight: 700;
}

.page-sub {
    font-size: 12px;
    color: #888;
}
</style>
