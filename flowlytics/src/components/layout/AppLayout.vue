<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import FlButton from '@/components/ui/FlButton.vue'

const auth         = useAuthStore()
const route        = useRoute()
const sidebarOpen  = ref(false)   // móvil: cerrado por defecto
const desktopOpen  = ref(true)    // escritorio: abierto por defecto

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',   icon: '⬡', desc: 'Tiempo real' },
  { to: '/analytics',  label: 'Analíticas',  icon: '◈', desc: 'Estadísticas' },
  { to: '/zones',      label: 'Zonas',       icon: '▣', desc: 'Espacios' },
  { to: '/energy',     label: 'Energía',     icon: '⚡', desc: 'Sistemas' },
  { to: '/users',      label: 'Usuarios',    icon: '◉', desc: 'Acceso', adminOnly: true },
]

const isActive = (to: string) => route.path.startsWith(to)
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-fl-dark">

    <!-- ── Overlay móvil ──────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/60 z-20 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- ── Sidebar ─────────────────────────────────────────── -->
    <Transition name="slide-sidebar">
      <aside
        :class="[
          'fixed lg:relative z-30 flex flex-col h-full',
          'border-r border-fl-green/20 bg-fl-darker/95 backdrop-blur-md',
          'transition-all duration-300',
          // Móvil: desliza desde la izquierda
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Escritorio: colapsa a iconos
          desktopOpen ? 'w-60' : 'w-16'
        ]"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 py-5 border-b border-fl-green/20 min-h-[72px]">
          <div
            class="flex-shrink-0 w-9 h-9 bg-gradient-primary flex items-center justify-center
                   font-orbitron font-black text-fl-mint text-xs shadow-glow-green"
            style="clip-path: polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)"
          >
            FL
          </div>
          <Transition name="fade">
            <div v-if="desktopOpen" class="overflow-hidden">
              <p class="font-orbitron font-bold text-fl-green-l text-glow tracking-widest text-sm leading-none">
                FLOWLYTICS
              </p>
              <p class="font-rajdhani text-fl-mint/30 text-xs uppercase tracking-widest mt-0.5">
                IoT System
              </p>
            </div>
          </Transition>
        </div>

        <!-- Nav -->
        <nav class="flex-1 py-4 space-y-0.5 overflow-y-auto scrollbar-fl px-2">
          <template v-for="item in navItems" :key="item.to">
            <RouterLink
              v-if="!item.adminOnly || auth.isAdmin"
              :to="item.to"
              :class="[
                'flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-200',
                'font-rajdhani font-semibold text-sm uppercase tracking-wider',
                'border-l-2',
                isActive(item.to)
                  ? 'text-fl-green-l bg-fl-green/15 border-fl-green shadow-glow-green'
                  : 'text-fl-mint/50 border-transparent hover:text-fl-mint hover:bg-fl-green/8 hover:border-fl-green/40'
              ]"
              @click="sidebarOpen = false"
            >
              <span class="text-lg leading-none flex-shrink-0">{{ item.icon }}</span>
              <Transition name="fade">
                <div v-if="desktopOpen" class="flex-1 min-w-0">
                  <p class="truncate leading-none">{{ item.label }}</p>
                  <p class="text-xs text-fl-mint/30 font-normal normal-case tracking-normal mt-0.5">
                    {{ item.desc }}
                  </p>
                </div>
              </Transition>
            </RouterLink>
          </template>
        </nav>

        <!-- Usuario + Logout -->
        <div class="border-t border-fl-green/20 p-3 space-y-2">
          <div v-if="desktopOpen && auth.user" class="flex items-center gap-2 px-1">
            <div
              class="w-7 h-7 flex-shrink-0 bg-fl-green/20 border border-fl-green/40
                     flex items-center justify-center font-orbitron text-xs font-bold text-fl-green-l"
            >
              {{ auth.user.nombre.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-fl-mint truncate leading-none">{{ auth.user.nombre }}</p>
              <p class="text-xs text-fl-mint/30 uppercase tracking-wider mt-0.5">{{ auth.user.rol }}</p>
            </div>
          </div>
          <button
            class="w-full flex items-center justify-center gap-2 px-3 py-2
                   font-rajdhani text-xs uppercase tracking-wider text-fl-mint/50
                   border border-fl-blue/30 hover:border-fl-danger/50 hover:text-fl-danger
                   transition-all duration-200"
            style="clip-path: polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)"
            @click="auth.logout"
          >
            <span>⏻</span>
            <span v-if="desktopOpen">Salir</span>
          </button>
        </div>
      </aside>
    </Transition>

    <!-- ── Main ────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">

      <!-- Topbar -->
      <header class="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-fl-green/20 bg-fl-darker/60 backdrop-blur-sm flex-shrink-0">
        <div class="flex items-center gap-3">
          <!-- Hamburger móvil -->
          <button
            class="lg:hidden btn-icon text-base"
            @click="sidebarOpen = !sidebarOpen"
            aria-label="Menú"
          >☰</button>

          <!-- Toggle escritorio -->
          <button
            class="hidden lg:flex btn-icon text-base"
            @click="desktopOpen = !desktopOpen"
            aria-label="Colapsar menú"
          >{{ desktopOpen ? '◁' : '▷' }}</button>

          <div>
            <h1 class="font-orbitron text-xs font-semibold text-fl-mint/70 uppercase tracking-widest leading-none">
              {{ route.meta.title || 'Flowlytics' }}
            </h1>
            <p class="font-rajdhani text-fl-mint/30 text-xs mt-0.5 hidden sm:block">
              {{ new Date().toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' }) }}
            </p>
          </div>
        </div>

        <!-- Derecha: live + usuario móvil -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-fl-green-l animate-pulse" />
            <span class="text-xs font-rajdhani text-fl-mint/40 uppercase tracking-wider hidden sm:block">Live</span>
          </div>
          <!-- Avatar móvil -->
          <div
            v-if="auth.user"
            class="lg:hidden w-7 h-7 bg-fl-green/20 border border-fl-green/40
                   flex items-center justify-center font-orbitron text-xs font-bold text-fl-green-l"
          >
            {{ auth.user.nombre.charAt(0).toUpperCase() }}
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto scrollbar-fl">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.hover\:bg-fl-green\/8:hover { background-color: rgba(45,106,79,0.08); }
</style>
