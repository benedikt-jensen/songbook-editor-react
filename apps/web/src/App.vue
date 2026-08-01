<script setup lang="ts">
import { onMounted } from 'vue';
import { authApi } from '@/services/authApi';
import { authState } from '@/stores/auth';

// A token can be in storage from a previous visit without `user` populated
// yet (that field isn't persisted, only the token is) - fetch it once so
// the topbar can show who's logged in.
onMounted(() => {
    if (authState.token && !authState.user) {
        authApi.restoreSession();
    }
});
</script>

<template>
    <router-view />
</template>

<style scoped></style>
