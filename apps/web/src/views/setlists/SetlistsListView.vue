<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { setlistsApi, type SetlistSummary } from '@/services/setlistsApi';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const setlists = ref<SetlistSummary[]>([]);
const loading = ref(true);

async function reload() {
    loading.value = true;
    try {
        setlists.value = await setlistsApi.list();
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to load setlists', life: 3000 });
    } finally {
        loading.value = false;
    }
}

onMounted(reload);

function openSetlist(setlist: SetlistSummary) {
    router.push(`/setlists/${setlist.id}`);
}

const createDialogOpen = ref(false);
const newSetlistName = ref('');
const creating = ref(false);

async function createSetlist() {
    const name = newSetlistName.value.trim();
    if (!name) return;
    creating.value = true;
    try {
        const setlist = await setlistsApi.create(name);
        createDialogOpen.value = false;
        newSetlistName.value = '';
        router.push(`/setlists/${setlist.id}`);
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to create setlist', life: 3000 });
    } finally {
        creating.value = false;
    }
}

function confirmDelete(setlist: SetlistSummary) {
    confirm.require({
        message: `Delete "${setlist.name}"? This cannot be undone.`,
        header: 'Delete setlist',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: 'Delete', severity: 'danger' },
        rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
        accept: async () => {
            try {
                await setlistsApi.remove(setlist.id);
                toast.add({ severity: 'success', summary: 'Setlist deleted', life: 2000 });
                await reload();
            } catch {
                toast.add({ severity: 'error', summary: 'Failed to delete setlist', life: 3000 });
            }
        },
    });
}
</script>

<template>
    <div class="card">
        <Toolbar class="mb-4">
            <template #start>
                <Button label="New Setlist" icon="pi pi-plus" @click="createDialogOpen = true" />
            </template>
        </Toolbar>

        <DataTable :value="setlists" :loading="loading" dataKey="id" paginator :rows="15" sortField="updatedAt" :sortOrder="-1">
            <Column field="name" header="Name" sortable>
                <template #body="{ data }">
                    <a class="cursor-pointer text-primary font-medium hover:underline" @click="openSetlist(data)">{{ data.name }}</a>
                </template>
            </Column>
            <Column field="songCount" header="Songs" sortable style="width: 8rem" />
            <Column field="updatedAt" header="Updated" sortable>
                <template #body="{ data }">{{ new Date(data.updatedAt).toLocaleString() }}</template>
            </Column>
            <Column style="width: 6rem">
                <template #body="{ data }">
                    <Button icon="pi pi-trash" aria-label="Delete setlist" severity="danger" text rounded @click="confirmDelete(data)" />
                </template>
            </Column>
            <template #empty>No setlists yet - create your first one.</template>
        </DataTable>
    </div>

    <Dialog v-model:visible="createDialogOpen" header="New setlist" modal :style="{ width: '25rem' }">
        <form class="flex flex-col gap-3" @submit.prevent="createSetlist">
            <InputText v-model="newSetlistName" placeholder="Setlist name" autofocus />
            <Button type="submit" label="Create" :loading="creating" :disabled="!newSetlistName.trim()" />
        </form>
    </Dialog>

    <ConfirmDialog />
    <Toast />
</template>
