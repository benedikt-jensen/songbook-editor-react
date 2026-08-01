<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/services/authApi';
import { ApiError } from '@/services/apiBase';

const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function submit() {
    loading.value = true;
    error.value = null;
    try {
        await authApi.login(email.value, password.value);
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
        router.replace(redirect);
    } catch (err) {
        error.value = err instanceof ApiError ? err.message : 'Failed to log in';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="flex items-center justify-center min-h-screen p-4">
        <div class="card w-full max-w-sm">
            <h1 class="text-xl font-semibold mb-4">Log in</h1>
            <form class="flex flex-col gap-3" @submit.prevent="submit">
                <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
                <div class="flex flex-col gap-1">
                    <label for="email">Email</label>
                    <InputText id="email" v-model="email" type="email" autocomplete="email" required />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="password">Password</label>
                    <Password v-model="password" input-id="password" :feedback="false" toggle-mask autocomplete="current-password" required fluid />
                </div>
                <Button type="submit" label="Log in" :loading="loading" />
            </form>
            <p class="text-sm text-muted-color mt-4">
                No account yet?
                <router-link class="text-primary" to="/register">Register</router-link>
            </p>
        </div>
    </div>
</template>
