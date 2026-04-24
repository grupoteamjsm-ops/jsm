<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import FlButton from '@/components/ui/FlButton.vue'

const auth  = useAuthStore()
const route = useRoute()
const sidebarOpen = ref(true)

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: '⬡' },
  { to: '/zones',     label: 'Zonas',      icon: '◈' },
  { to: '/energy',    label: 'Energía',    icon: '⚡' },
  { to: '/users',     label: 'Usuarios',   icon: '◉', adminOnly: true },
]
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-fl-dark">

    <!-- ── Sidebar ─────────────────────────────────────────── -->
    <aside
      :class="['flex flex-col border-r border-fl-green/20 transition-all duration-300 bg-fl-darker/90 backdrop-blur-sm',
               sidebarOpen ? 'w-64' : 'w-16']"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-fl-green/20">
        <div class="w-8 h-8 bg-gradient-primary flex items-center justify-center text-fl-mint font-orbitron font-bold text-xs"
             style="clip-path: polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)">
          FL
        </div>
        <span v-if="sidebarOpen" class="font-orbitron font-bold text-fl-green-l text-glow tracking-widest text-sm">
          FLOWLYTICS
        </span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-fl">
        <template v-for="item in navItems" :key="item.to">
          <RouterLink
            v-if="!item.adminOnly || auth.isAdmin"
            :to="item.to"
            :class="['nav-link', route.path.startsWith(item.to) ? 'active' : '']"
          >
            <span class="text-lg leading-none">{{ item.icon }}</span>
            <span v-if="sidebarOpen" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- User + Logout -->
      <div class="border-t border-fl-green/20 p-4 space-y-3">
        <div v-if="sidebarOpen && auth.user" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-fl-green/20 border border-fl-green/40 flex items-center justify-center text-fl-green-l font-orbitron text-xs font-bold">
            {{ auth.user.nombre.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-fl-mint truncate">{{ auth.user.nombre }}</p>
            <p class="text-xs text-fl-mint/40 uppercase tracking-wider">{{ auth.user.rol }}</p>
          </div>
        </div>
        <FlButton variant="secondary" size="sm" class="w-full" @click="auth.logout">
          <span v-if="sidebarOpen">Salir</span>
          <span v-else>✕</span>
        </FlButton>
      </div>
    </aside>

    <!-- ── Main ────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- Topbar -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-fl-green/20 bg-fl-darker/50 backdrop-blur-sm">
        <div class="flex items-center gap-4">
          <button
            class="btn-icon"
            @click="sidebarOpen = !sidebarOpen"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h1 class="font-orbitron text-sm font-semibold text-fl-mint/80 uppercase tracking-widest">
            {{ route.meta.title || 'Flowlytics' }}
          </h1>
        </div>

        <!-- Indicador de conexión -->
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-fl-green-l animate-pulse-glow" />
          <span class="text-xs font-rajdhani text-fl-mint/50 uppercase tracking-wider">Live</span>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto scrollbar-fl p-6 animate-fade-in">
        <RouterView />
      </main>
    </div>
  </div>
</template>
