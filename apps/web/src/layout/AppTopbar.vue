<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useLayout } from '@/layout/composables/layout';
import { authApi } from '@/services/authApi';
import { authState } from '@/stores/auth';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const router = useRouter();

async function logout() {
    await authApi.logout();
    router.push('/login');
}
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" aria-label="Toggle menu" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <i class="pi pi-book" style="font-size: 1.5rem; color: var(--primary-color, inherit)"></i>
                <span>Songbook Editor</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" :aria-label="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
            </div>
            <span v-if="authState.user" class="text-sm text-muted-color mr-2">{{ authState.user.email }}</span>
            <Button label="Log out" icon="pi pi-sign-out" text size="small" @click="logout" />
        </div>
    </div>
</template>
