import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { authState } from '@/stores/auth';

// Augmenting (not replacing) vue-router's types requires this file to
// already be a real ES module (it is, via the import above) - the same
// declaration written in an ambient .d.ts with no imports/exports would
// wipe out vue-router's own exported types instead of merging with them.
declare module 'vue-router' {
    interface RouteMeta {
        requiresAuth?: boolean;
    }
}

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
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
                {
                    path: '/setlists',
                    name: 'setlists',
                    component: () => import('@/views/setlists/SetlistsListView.vue'),
                },
                {
                    path: '/setlists/:id',
                    name: 'setlist-detail',
                    component: () => import('@/views/setlists/SetlistDetailView.vue'),
                },
            ],
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/auth/LoginView.vue'),
        },
        {
            path: '/register',
            name: 'register',
            component: () => import('@/views/auth/RegisterView.vue'),
        },
        {
            // Public - anyone with the link, no account needed. Deliberately
            // outside AppLayout: no sidebar/topbar chrome, just the songs.
            path: '/share/:token',
            name: 'share',
            component: () => import('@/views/share/ShareView.vue'),
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'notfound',
            component: () => import('@/views/NotFound.vue'),
        },
    ],
});

router.beforeEach((to: RouteLocationNormalized) => {
    const isAuthed = authState.token !== null;
    if (to.meta.requiresAuth && !isAuthed) {
        return { name: 'login', query: { redirect: to.fullPath } };
    }
    if ((to.name === 'login' || to.name === 'register') && isAuthed) {
        return { path: '/' };
    }
});

export default router;
