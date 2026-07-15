import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue'),
                },
                {
                    path: '/songs',
                    name: 'songs',
                    component: () => import('@/views/songs/SongsListView.vue'),
                },
                {
                    path: '/songs/new',
                    name: 'song-new',
                    component: () => import('@/views/songs/SongEditorView.vue'),
                },
                {
                    path: '/songs/:id',
                    name: 'song-edit',
                    component: () => import('@/views/songs/SongEditorView.vue'),
                },
            ],
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue'),
        },
    ],
});

export default router;
