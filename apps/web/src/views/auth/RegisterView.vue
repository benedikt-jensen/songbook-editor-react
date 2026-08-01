<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '@/services/authApi';
import { ApiError } from '@/services/apiBase';

const router = useRouter();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function submit() {
    error.value = null;
    if (password.value !== confirmPassword.value) {
        error.value = 'Passwords do not match';
        return;
    }
    if (password.value.length < 8) {
        error.value = 'Password must be at least 8 characters';
        return;
    }
    loading.value = true;
    try {
        await authApi.register(email.value, password.value);
        router.replace('/');
    } catch (err) {
        error.value = err instanceof ApiError ? err.message : 'Failed to register';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="flex items-center justify-center min-h-screen p-4">
        <div class="card w-full max-w-sm">
            <h1 class="text-xl font-semibold mb-4">Create an account</h1>
            <form class="flex flex-col gap-3" @submit.prevent="submit">
                <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
                <div class="flex flex-col gap-1">
                    <label for="email">Email</label>
                    <InputText id="email" v-model="email" type="email" autocomplete="email" required />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="password">Password</label>
                    <Password v-model="password" input-id="password" toggle-mask autocomplete="new-password" required fluid />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="confirm-password">Confirm password</label>
                    <Password v-model="confirmPassword" input-id="confirm-password" :feedback="false" toggle-mask autocomplete="new-password" required fluid />
                </div>
                <Button type="submit" label="Register" :loading="loading" />
            </form>
            <p class="text-sm text-muted-color mt-4">
                Already have an account?
                <router-link class="text-primary" to="/login">Log in</router-link>
            </p>
        </div>
    </div>
</template>
