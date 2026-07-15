<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { songsApi, type SongSummary } from '@/services/songsApi';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const songs = ref<SongSummary[]>([]);
const loading = ref(true);

async function reload() {
    loading.value = true;
    try {
        songs.value = await songsApi.list();
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to load songs', life: 3000 });
    } finally {
        loading.value = false;
    }
}

onMounted(reload);

function openSong(song: SongSummary) {
    router.push(`/songs/${song.id}`);
}

function confirmDelete(song: SongSummary) {
    confirm.require({
        message: `Delete "${song.title}"? This cannot be undone.`,
        header: 'Delete song',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: 'Delete', severity: 'danger' },
        rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
        accept: async () => {
            try {
                await songsApi.remove(song.id);
                toast.add({ severity: 'success', summary: 'Song deleted', life: 2000 });
                await reload();
            } catch {
                toast.add({ severity: 'error', summary: 'Failed to delete song', life: 3000 });
            }
        },
    });
}
</script>

<template>
    <div class="card">
        <Toolbar class="mb-4">
            <template #start>
                <Button label="New Song" icon="pi pi-plus" as="router-link" to="/songs/new" />
            </template>
        </Toolbar>

        <DataTable :value="songs" :loading="loading" dataKey="id" paginator :rows="15" sortField="updated_at" :sortOrder="-1">
            <Column field="title" header="Title" sortable>
                <template #body="{ data }">
                    <a class="cursor-pointer text-primary font-medium hover:underline" @click="openSong(data)">{{ data.title }}</a>
                </template>
            </Column>
            <Column field="artist" header="Artist" sortable />
            <Column field="updated_at" header="Updated" sortable>
                <template #body="{ data }">{{ new Date(data.updated_at).toLocaleString() }}</template>
            </Column>
            <Column style="width: 6rem">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" severity="secondary" text rounded @click="openSong(data)" />
                        <Button icon="pi pi-trash" severity="danger" text rounded @click="confirmDelete(data)" />
                    </div>
                </template>
            </Column>
            <template #empty>No songs yet - create your first one.</template>
        </DataTable>
    </div>
    <ConfirmDialog />
    <Toast />
</template>
