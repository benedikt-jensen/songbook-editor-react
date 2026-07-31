<script setup lang="ts">
import { ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';
import type { MenuItem } from './menuItem';

const model = ref<MenuItem[]>([
    {
        label: 'Home',
        items: [
            {
                label: 'Dashboard',
                icon: 'pi pi-fw pi-home',
                to: '/'
            }
        ]
    },
    {
        label: 'Songs',
        path: '/songs',
        items: [
            {
                label: 'All Songs',
                icon: 'pi pi-fw pi-list',
                to: '/songs'
            },
            {
                label: 'New Song',
                icon: 'pi pi-fw pi-plus',
                to: '/songs/new'
            }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
