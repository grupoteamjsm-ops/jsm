<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/services/api'

const occupancy  = ref<any[]>([])
const energy     = ref<any[]>([])
const loading    = ref(true)
let   eventSource: EventSource | null = null

const fetchData = async () => {
  try {
    const [occ, eng] = await Promise.all([
      api.get('/api/occupancy/by-zone'),
      api.get('/api/energy/status')
    ])
    occupancy.value = occ.data.data.zones
    energy.value    = eng.data.data.systems
  } finally {
    loading.value = false
  }
}

// SSE — actualización en tiempo real
const connectSSE = () => {
  const token = localStorage.getItem('access_token')
  eventSource = new EventSource(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sse/events`
  )
  eventSource.addEventListener('occupancy_update', () => fetchData())
  eventSource.addEventListener('energy_action',    () => fetchData())
}

onMounted(() => { fetchData(); connectSSE() })
onUnmounted(() => eventSource?.close())

const statusColor = (status: string) =>
  status === 'on' ? 'text-fl-green-l' : 'text-fl-mint/30'

const deviceIcon = (type: string) =>
  ({ lighting: '💡', climate: '❄️', ventilation: '🌀' })[type] || '⚡'
</script>

<template>
  <div class="space-y-6 animate-slide-up">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="font-orbitron text-xl font-bold text-fl-green-l text-glow">Dashboard</h2>
        <p class="font-rajdhani text-fl-mint/50 text-sm uppercase tracking-wider mt-1">
          Monitorización en tiempo real
        </p>
      </div>
      <div class="flex items-center gap-2 badge-green px-3 py-1">
        <span class="w-1.5 h-1.5 rounded-full bg-fl-green-l animate-pulse" />
        <span>Live</span>
      </div>
    </div>

    <!-- Stats rápidas -->
    <div v-if="!loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <span class="stat-value">{{ occupancy.length }}</span>
        <span class="stat-label">Zonas activas</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">
          {{ occupancy.reduce((s, z) => s + Number(z.ocupacion_actual || 0), 0) }}
        </span>
        <span class="stat-label">Personas ahora</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">
          {{ energy.filter(e => e.status === 'on').length }}
        </span>
        <span class="stat-label">Sistemas ON</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">
          {{ occupancy.reduce((s, z) => s + Number(z.lecturas_hoy || 0), 0) }}
        </span>
        <span class="stat-label">Lecturas hoy</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="spinner !w-8 !h-8" />
    </div>

    <!-- Zonas -->
    <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        v-for="zone in occupancy"
        :key="zone.zone"
        class="card p-5 space-y-4"
      >
        <!-- Cabecera zona -->
        <div class="flex items-center justify-between">
          <h3 class="font-rajdhani font-bold text-fl-mint uppercase tracking-wider">
            {{ zone.zone }}
          </h3>
          <span :class="['badge', zone.ocupacion_actual > 0 ? 'badge-green' : 'badge-blue']">
            {{ zone.ocupacion_actual > 0 ? 'Ocupada' : 'Libre' }}
          </span>
        </div>

        <!-- Personas -->
        <div class="flex items-end gap-3">
          <span class="font-orbitron text-4xl font-bold text-fl-green-l text-glow">
            {{ zone.ocupacion_actual }}
          </span>
          <span class="font-rajdhani text-fl-mint/50 text-sm pb-1">personas</span>
          <span class="ml-auto font-rajdhani text-xs text-fl-mint/40">
            Media hoy: {{ zone.media_hoy }}
          </span>
        </div>

        <!-- Barra de ocupación -->
        <div class="h-1 bg-fl-blue/20 overflow-hidden" style="clip-path: polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)">
          <div
            class="h-full bg-gradient-primary transition-all duration-700"
            :style="{ width: `${Math.min(100, (zone.ocupacion_actual / 10) * 100)}%` }"
          />
        </div>

        <!-- Sistemas energéticos -->
        <div class="flex gap-3">
          <div
            v-for="sys in energy.filter(e => e.zone === zone.zone)"
            :key="sys.device_type"
            class="flex items-center gap-1.5 text-xs font-rajdhani"
          >
            <span>{{ deviceIcon(sys.device_type) }}</span>
            <span :class="statusColor(sys.status)">
              {{ sys.status === 'on' ? `${sys.value}%` : 'OFF' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sin datos -->
    <div v-if="!loading && occupancy.length === 0"
         class="card p-12 text-center">
      <p class="font-orbitron text-fl-mint/30 text-sm uppercase tracking-widest">
        Sin datos de ocupación
      </p>
      <p class="font-rajdhani text-fl-mint/20 text-xs mt-2">
        Esperando lecturas de sensores...
      </p>
    </div>
  </div>
</template>
