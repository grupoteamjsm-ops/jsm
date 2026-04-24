<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import FlButton from '@/components/ui/FlButton.vue'

const auth    = useAuthStore()
const systems = ref<any[]>([])
const loading = ref(true)
const saving  = ref<string | null>(null)

const fetchStatus = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/api/energy/status')
    systems.value = data.data.systems
  } finally {
    loading.value = false
  }
}

const executeAction = async (zone: string, device_type: string, action: string, value?: number) => {
  const key = `${zone}-${device_type}`
  saving.value = key
  try {
    await api.post('/api/energy/actions', { action, zone, device_type, value })
    await fetchStatus()
  } finally {
    saving.value = null
  }
}

const deviceIcon  = (t: string) => ({ lighting: '💡', climate: '❄️', ventilation: '🌀' })[t] || '⚡'
const deviceLabel = (t: string) => ({ lighting: 'Iluminación', climate: 'Climatización', ventilation: 'Ventilación' })[t] || t

onMounted(fetchStatus)
</script>

<template>
  <div class="space-y-6 animate-slide-up">

    <div>
      <h2 class="font-orbitron text-xl font-bold text-fl-green-l text-glow">Energía</h2>
      <p class="font-rajdhani text-fl-mint/50 text-sm uppercase tracking-wider mt-1">
        Control de sistemas energéticos
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="spinner !w-8 !h-8" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="sys in systems"
        :key="`${sys.zone}-${sys.device_type}`"
        class="card p-5 space-y-4"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ deviceIcon(sys.device_type) }}</span>
            <div>
              <p class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider">
                {{ deviceLabel(sys.device_type) }}
              </p>
              <p class="font-orbitron text-xs text-fl-green-l/70">{{ sys.zone }}</p>
            </div>
          </div>
          <span :class="sys.status === 'on' ? 'badge-green' : 'badge-blue'" class="badge">
            {{ sys.status.toUpperCase() }}
          </span>
        </div>

        <!-- Valor -->
        <div v-if="sys.status === 'on'" class="space-y-2">
          <div class="flex justify-between text-xs font-rajdhani text-fl-mint/50">
            <span>Intensidad</span>
            <span class="text-fl-green-l font-bold">{{ sys.value }}%</span>
          </div>
          <div class="h-1.5 bg-fl-blue/20" style="clip-path: polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)">
            <div
              class="h-full bg-gradient-primary transition-all duration-500"
              :style="{ width: `${sys.value}%` }"
            />
          </div>
        </div>

        <!-- Acciones -->
        <div v-if="auth.isOperador" class="flex gap-2">
          <FlButton
            v-if="sys.status === 'off'"
            variant="primary" size="sm"
            :loading="saving === `${sys.zone}-${sys.device_type}`"
            @click="executeAction(sys.zone, sys.device_type, 'turn_on', 100)"
          >
            Encender
          </FlButton>
          <FlButton
            v-else
            variant="danger" size="sm"
            :loading="saving === `${sys.zone}-${sys.device_type}`"
            @click="executeAction(sys.zone, sys.device_type, 'turn_off')"
          >
            Apagar
          </FlButton>
          <FlButton
            v-if="sys.status === 'on'"
            variant="secondary" size="sm"
            @click="executeAction(sys.zone, sys.device_type, 'adjust', 50)"
          >
            50%
          </FlButton>
        </div>
      </div>
    </div>

    <div v-if="!loading && systems.length === 0" class="card p-12 text-center">
      <p class="font-orbitron text-fl-mint/30 text-sm uppercase tracking-widest">
        Sin sistemas registrados
      </p>
    </div>
  </div>
</template>
