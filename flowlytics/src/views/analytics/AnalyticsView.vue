<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import BarChart      from '@/components/charts/BarChart.vue'
import LineChart     from '@/components/charts/LineChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'

const stats       = ref<any[]>([])
const byHour      = ref<any[]>([])
const history     = ref<any[]>([])
const loading     = ref(true)
const selectedZone = ref('')
const zones        = ref<string[]>([])

// Filtros de fecha
const from = ref(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
const to   = ref(new Date().toISOString().split('T')[0])

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      from: new Date(from.value).toISOString(),
      to:   new Date(to.value + 'T23:59:59').toISOString()
    }
    if (selectedZone.value) params.zone = selectedZone.value

    const [s, h, hist, byZone] = await Promise.all([
      api.get('/api/occupancy/stats',   { params }),
      api.get('/api/occupancy/by-hour', { params }),
      api.get('/api/occupancy/history', { params: { ...params, limit: 500 } }),
      api.get('/api/occupancy/by-zone')
    ])

    stats.value   = s.data.data?.zones    ?? []
    byHour.value  = h.data.data?.by_hour  ?? []
    history.value = hist.data.history     ?? []
    zones.value   = (byZone.data.data?.zones ?? []).map((z: any) => z.zone)
  } finally {
    loading.value = false
  }
}

// ── Gráfica: lecturas por día ─────────────────────────────
const dailyChartData = computed(() => {
  const byDay: Record<string, number> = {}
  history.value.forEach(r => {
    const day = new Date(r.timestamp).toLocaleDateString('es', { day:'2-digit', month:'2-digit' })
    byDay[day] = (byDay[day] || 0) + r.people_count
  })
  const labels = Object.keys(byDay).slice(-30)
  return {
    labels,
    datasets: [{
      label:           'Total personas',
      data:            labels.map(d => byDay[d]),
      borderColor:     '#52B788',
      backgroundColor: 'rgba(82,183,136,0.15)',
      borderWidth:     2,
      tension:         0.4,
      fill:            true,
      pointRadius:     2
    }]
  }
})

// ── Gráfica: patrón horario ───────────────────────────────
const hourlyChartData = computed(() => {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const zoneList = selectedZone.value
    ? [selectedZone.value]
    : [...new Set(byHour.value.map((r: any) => r.zone))]
  const colors = ['#52B788','#457B9D','#F4A261','#A8DADC','#E63946']

  return {
    labels: hours.map(h => `${String(h).padStart(2,'0')}h`),
    datasets: zoneList.map((zone, i) => ({
      label:           zone,
      data:            hours.map(h => {
        const row = byHour.value.find((r: any) => r.zone === zone && parseInt(r.hora) === h)
        return row ? parseFloat(row.media_personas) : 0
      }),
      backgroundColor: colors[i % colors.length] + 'BB',
      borderColor:     colors[i % colors.length],
      borderWidth:     1,
      borderRadius:    2
    }))
  }
})

// ── Gráfica: movimiento vs sin movimiento ─────────────────
const movementChartData = computed(() => {
  const withMov    = history.value.filter(r => r.movement).length
  const withoutMov = history.value.filter(r => !r.movement).length
  return {
    labels: ['Con movimiento', 'Sin movimiento'],
    datasets: [{
      data:            [withMov, withoutMov],
      backgroundColor: ['rgba(82,183,136,0.8)', 'rgba(29,53,87,0.6)'],
      borderColor:     ['#52B788', '#1D3557'],
      borderWidth:     1
    }]
  }
})

// ── Gráfica: personas por zona (barras) ───────────────────
const zoneCompareData = computed(() => ({
  labels: stats.value.map(s => s.zone),
  datasets: [
    {
      label:           'Media personas',
      data:            stats.value.map(s => parseFloat(s.media_personas)),
      backgroundColor: 'rgba(82,183,136,0.7)',
      borderColor:     '#52B788',
      borderWidth:     1,
      borderRadius:    2
    },
    {
      label:           'Máximo',
      data:            stats.value.map(s => parseInt(s.max_personas)),
      backgroundColor: 'rgba(244,162,97,0.7)',
      borderColor:     '#F4A261',
      borderWidth:     1,
      borderRadius:    2
    }
  ]
}))

onMounted(fetchData)
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6 animate-slide-up">

    <!-- Cabecera -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="font-orbitron text-lg lg:text-xl font-bold text-fl-green-l text-glow">
          Analíticas
        </h2>
        <p class="font-rajdhani text-fl-mint/40 text-xs uppercase tracking-widest mt-0.5">
          Estadísticas e histórico de datos
        </p>
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="selectedZone"
          class="bg-fl-dark border border-fl-blue/30 text-fl-mint/60 text-xs font-rajdhani px-3 py-1.5 focus:outline-none focus:border-fl-green"
          @change="fetchData"
        >
          <option value="">Todas las zonas</option>
          <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
        </select>

        <input
          v-model="from" type="date"
          class="bg-fl-dark border border-fl-blue/30 text-fl-mint/60 text-xs font-rajdhani px-3 py-1.5 focus:outline-none focus:border-fl-green"
        />
        <span class="text-fl-mint/30 font-rajdhani text-xs">→</span>
        <input
          v-model="to" type="date"
          class="bg-fl-dark border border-fl-blue/30 text-fl-mint/60 text-xs font-rajdhani px-3 py-1.5 focus:outline-none focus:border-fl-green"
        />
        <button
          class="px-4 py-1.5 font-rajdhani text-xs uppercase tracking-wider text-fl-mint bg-fl-green/20 border border-fl-green/40 hover:bg-fl-green/30 transition-all"
          style="clip-path: polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)"
          @click="fetchData"
        >
          Aplicar
        </button>
      </div>
    </div>

    <!-- KPIs estadísticos -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="stat-card">
        <span class="stat-value">{{ history.length }}</span>
        <span class="stat-label">Total lecturas</span>
      </div>
      <div class="stat-card">
        <span class="stat-value text-fl-warn">
          {{ history.reduce((s, r) => s + r.people_count, 0) }}
        </span>
        <span class="stat-label">Total personas</span>
      </div>
      <div class="stat-card">
        <span class="stat-value text-fl-blue-l">
          {{ history.length ? (history.reduce((s,r) => s + r.people_count, 0) / history.length).toFixed(1) : 0 }}
        </span>
        <span class="stat-label">Media por lectura</span>
      </div>
      <div class="stat-card">
        <span class="stat-value text-fl-green-l">
          {{ history.filter(r => r.movement).length }}
        </span>
        <span class="stat-label">Con movimiento</span>
      </div>
    </div>

    <!-- Gráficas fila 1 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card p-4 lg:col-span-2">
        <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider mb-4">
          Personas detectadas por día
        </h3>
        <div v-if="loading" class="flex justify-center py-16"><div class="spinner !w-8 !h-8" /></div>
        <div v-else style="height:220px"><LineChart :data="dailyChartData" /></div>
      </div>

      <div class="card p-4">
        <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider mb-4">
          Movimiento detectado
        </h3>
        <div v-if="loading" class="flex justify-center py-16"><div class="spinner !w-8 !h-8" /></div>
        <div v-else style="height:220px"><DoughnutChart :data="movementChartData" /></div>
      </div>
    </div>

    <!-- Gráficas fila 2 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-4">
        <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider mb-4">
          Patrón horario por zona
        </h3>
        <div v-if="loading" class="flex justify-center py-16"><div class="spinner !w-8 !h-8" /></div>
        <div v-else style="height:220px"><BarChart :data="hourlyChartData" /></div>
      </div>

      <div class="card p-4">
        <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider mb-4">
          Comparativa de zonas
        </h3>
        <div v-if="loading" class="flex justify-center py-16"><div class="spinner !w-8 !h-8" /></div>
        <div v-else style="height:220px"><BarChart :data="zoneCompareData" /></div>
      </div>
    </div>

    <!-- Tabla estadísticas por zona -->
    <div class="card overflow-hidden">
      <div class="p-4 border-b border-fl-green/10">
        <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider">
          Estadísticas por zona
        </h3>
      </div>
      <div class="overflow-x-auto">
        <table class="table-fl">
          <thead>
            <tr>
              <th>Zona</th>
              <th class="text-right">Lecturas</th>
              <th class="text-right">Total personas</th>
              <th class="text-right">Media</th>
              <th class="text-right">Máximo</th>
              <th class="text-right hidden sm:table-cell">Con movimiento</th>
              <th class="hidden md:table-cell">Primera lectura</th>
              <th class="hidden md:table-cell">Última lectura</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in stats" :key="s.zone">
              <td class="font-orbitron text-xs text-fl-green-l">{{ s.zone }}</td>
              <td class="text-right font-rajdhani text-fl-mint/70">{{ s.total_lecturas }}</td>
              <td class="text-right font-orbitron font-bold text-fl-mint">{{ s.total_personas }}</td>
              <td class="text-right font-rajdhani text-fl-blue-l">{{ s.media_personas }}</td>
              <td class="text-right font-rajdhani font-semibold text-fl-warn">{{ s.max_personas }}</td>
              <td class="text-right hidden sm:table-cell font-rajdhani text-fl-green-l/70">
                {{ s.lecturas_con_movimiento }}
              </td>
              <td class="hidden md:table-cell font-rajdhani text-xs text-fl-mint/30">
                {{ s.primera_lectura ? new Date(s.primera_lectura).toLocaleDateString('es') : '—' }}
              </td>
              <td class="hidden md:table-cell font-rajdhani text-xs text-fl-mint/30">
                {{ s.ultima_lectura ? new Date(s.ultima_lectura).toLocaleDateString('es') : '—' }}
              </td>
            </tr>
            <tr v-if="stats.length === 0">
              <td colspan="8" class="text-center py-8 text-fl-mint/20 font-rajdhani uppercase tracking-widest text-xs">
                Sin datos en el periodo seleccionado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
