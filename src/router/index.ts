import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/services/api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/pages/DashboardPage.vue'),
        },
        {
          path: '/surveys',
          name: 'surveys',
          component: () => import('@/pages/SurveysPage.vue'),
        },
        {
          path: '/surveys/:id',
          name: 'survey-form',
          component: () => import('@/pages/SurveyFormPage.vue'),
        },
        {
          path: '/pending-sync',
          name: 'pending-sync',
          component: () => import('@/pages/PendingSyncPage.vue'),
        },
        {
          path: '/offline-records',
          name: 'offline-records',
          component: () => import('@/pages/OfflineRecordsPage.vue'),
        },
        {
          path: '/submitted-records',
          name: 'submitted-records',
          component: () => import('@/pages/SubmittedRecordsPage.vue'),
        },
        {
          path: '/sync-history',
          name: 'sync-history',
          component: () => import('@/pages/SyncHistoryPage.vue'),
        },
        {
          path: '/profile',
          name: 'profile',
          component: () => import('@/pages/ProfilePage.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.public && !getToken()) {
    return { name: 'login' }
  }
  if (to.name === 'login' && getToken()) {
    return { name: 'dashboard' }
  }
})

export default router
