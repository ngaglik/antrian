<template>
    <n-config-provider
        :locale="idID"
        :date-locale="dateIdID"
        :theme-overrides="themeOverrides"
    >
        <n-dialog-provider>
            <n-message-provider>
                <n-notification-provider>
                    <App />
                </n-notification-provider>
            </n-message-provider>
        </n-dialog-provider>
    </n-config-provider>
</template>

<script setup lang="ts">
import {
    NConfigProvider,
    NDialogProvider,
    NMessageProvider,
    NNotificationProvider,
    idID,
    dateIdID,
    type GlobalThemeOverrides,
} from "naive-ui";
import App from "../App.vue";

const themeOverrides: GlobalThemeOverrides = {
    common: {
        primaryColor: "#14b8a6",
        primaryColorHover: "#0d9488",
        primaryColorPressed: "#0f766e",
        borderRadius: "12px",
    },
};
</script>
