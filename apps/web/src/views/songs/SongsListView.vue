<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { songsApi } from '@/services/songsApi';
import type { SongSummary } from '@/types/song';

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

const importInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);

async function importFiles(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    (event.target as HTMLInputElement).value = ''; // allow re-selecting the same file later
    if (files.length === 0) return;

    importing.value = true;
    try {
        const created = await Promise.all(files.map(async (file) => songsApi.create(await file.text())));
        toast.add({ severity: 'success', summary: `Imported ${created.length} song${created.length === 1 ? '' : 's'}`, life: 2000 });
        await reload();
        if (created.length === 1) router.push(`/songs/${created[0].id}`);
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to import song', life: 3000 });
    } finally {
        importing.value = false;
    }
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
                <div class="flex gap-2">
                    <Button label="New Song" icon="pi pi-plus" as="router-link" to="/songs/new" />
                    <Button label="Import ChordPro" icon="pi pi-upload" severity="secondary" outlined :loading="importing" @click="importInputRef?.click()" />
                    <input ref="importInputRef" type="file" accept=".cho,.chopro,.crd,.pro,.txt" multiple class="hidden" @change="importFiles">
                </div>
            </template>
        </Toolbar>

        <DataTable :value="songs" :loading="loading" dataKey="id" paginator :rows="15" sortField="updatedAt" :sortOrder="-1">
            <Column field="title" header="Title" sortable>
                <template #body="{ data }">
                    <a class="cursor-pointer text-primary font-medium hover:underline" @click="openSong(data)">{{ data.title }}</a>
                </template>
            </Column>
            <Column field="artist" header="Artist" sortable />
            <Column field="updatedAt" header="Updated" sortable>
                <template #body="{ data }">{{ new Date(data.updatedAt).toLocaleString() }}</template>
            </Column>
            <Column style="width: 6rem">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" aria-label="Edit song" severity="secondary" text rounded @click="openSong(data)" />
                        <Button icon="pi pi-trash" aria-label="Delete song" severity="danger" text rounded @click="confirmDelete(data)" />
                    </div>
                </template>
            </Column>
            <template #empty>No songs yet - create your first one.</template>
        </DataTable>
    </div>
    <ConfirmDialog />
    <Toast />
</template>
