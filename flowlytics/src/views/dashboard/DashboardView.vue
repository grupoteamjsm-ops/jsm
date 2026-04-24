<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import LineChart     from '@/components/charts/LineChart.vue'
import BarChart      from '@/components/charts/BarChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'

const store = useDashboardStore()
let sse: EventSource | null = null
let interval: ReturnType<typeof setInterval>

const connectSSE = () => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  sse = new EventSource(`${base}/api/sse/events`)
  sse.addEventListener('sensor_data',      () => store.fetchAll())
  sse.addEventListener('occupancy_update', () => store.fetchAll())
  sse.addEventListener('energy_action',    () => store.fetchAll())
}

onMounted(() => {
  store.fetchAll()
  connectSSE()
  // Refresco de seguridad cada 60s
  interval = setInterval(() => store.fetchAll(), 60_000)
})

onUnmounted(() => {
  sse?.close()
  clearInterval(interval)
})

const deviceIcon  = (t: string) => ({ lighting: '💡', climate: '❄️', ventilation: '🌀' }[t] ?? '⚡')
const statusColor = (s: string) => s === 'on' ? '#52B788' : 'rgba(241,250,238,0.2)'
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6 animate-slide-up">

    <!-- ── Cabecera + filtros ─────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="font-orbitron text-lg lg:text-xl font-bold text-fl-green-l text-glow">
          Dashboard
        </h2>
        <p class="font-rajdhani text-fl-mint/40 text-xs uppercase tracking-widest mt-0.5">
          Monitorización en tiempo real
        </p>
      </div>

      <!-- Filtros de rango -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="r in [['today','Hoy'],['7d','7 días'],['30d','30 días']]"
          :key="r[0]"
          :class="[
            'px-3 py-1.5 font-rajdhani text-xs uppercase tracking-wider transition-all duration-200',
            'border',
            store.selectedRange === r[0]
              ? 'bg-fl-green/20 border-fl-green text-fl-green-l'
              : 'border-fl-blue/30 text-fl-mint/40 hover:border-fl-green/40 hover:text-fl-mint/70'
          ]"
          style="clip-path: polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)"
          @click="store.selectedRange = r[0] as any; store.fetchAll()"
        >
          {{ r[1] }}
        </button>

        <!-- Filtro zona -->
        <select
          v-model="store.selectedZone"
          class="bg-fl-dark border border-fl-blue/30 text-fl-mint/60 text-xs font-rajdhani
                 px-3 py-1.5 focus:outline-none focus:border-fl-green"
          @change="store.fetchAll()"
        >
          <option value="">Todas las zonas</option>
          <option v-for="z in store.occupancyByZone" :key="z.zone" :value="z.zone">
            {{ z.zone }}
          </option>
        </select>
      </div>
    </div>

    <!-- ── KPIs ───────────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div class="stat-card col-span-1">
        <span class="stat-value text-fl-green-l">{{ store.totalPersonas }}</span>
        <span class="stat-label">Personas ahora</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ store.zonasOcupadas }}<span class="text-fl-mint/30 text-lg">/{{ store.totalZonas }}</span></span>
        <span class="stat-label">Zonas ocupadas</span>
      </div>
      <div class="stat-card">
        <span class="stat-value text-fl-warn">{{ store.maxPersonasHoy }}</span>
        <span class="stat-label">Máx. hoy</span>
      </div>
      <div class="stat-card">
        <span class="stat-value text-fl-blue-l">{{ store.sistemasActivos }}</span>
        <span class="stat-label">Sistemas ON</span>
      </div>
      <div class="stat-card col-span-2 lg:col-span-1">
        <span class="stat-value text-fl-gray">{{ store.occupancyHistory.length }}</span>
        <span class="stat-label">Lecturas periodo</span>
      </div>
    </div>

    <!-- ── Gráficas fila 1 ────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <!-- Línea: evolución temporal -->
      <div class="card p-4 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider">
            Evolución de ocupación
          </h3>
          <span class="badge-green badge text-xs">Tiempo real</span>
        </div>
        <div v-if="store.loading" class="flex justify-center py-16">
          <div class="spinner !w-8 !h-8" />
        </div>
        <div v-else-if="store.occupancyHistory.length === 0" class="flex flex-col items-center justify-center py-16 text-fl-mint/20">
          <span class="text-3xl mb-2">◈</span>
          <p class="font-rajdhani text-xs uppercase tracking-widest">Sin datos en el periodo</p>
        </div>
        <div v-else style="height: 220px">
          <LineChart :data="store.lineChartData" />
        </div>
      </div>

      <!-- Donut: distribución por zona -->
      <div class="card p-4">
        <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider mb-4">
          Distribución por zona
        </h3>
        <div v-if="store.loading" class="flex justify-center py-16">
          <div class="spinner !w-8 !h-8" />
        </div>
        <div v-else-if="store.totalPersonas === 0" class="flex flex-col items-center justify-center py-16 text-fl-mint/20">
          <span class="text-3xl mb-2">⬡</span>
          <p class="font-rajdhani text-xs uppercase tracking-widest">Sin ocupación</p>
        </div>
        <div v-else style="height: 220px">
          <DoughnutChart :data="store.doughnutData" />
        </div>
      </div>
    </div>

    <!-- ── Gráficas fila 2 ────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Barras: patrón horario -->
      <div class="card p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider">
            Patrón horario
          </h3>
          <span class="font-rajdhani text-xs text-fl-mint/30">Media personas / hora</span>
        </div>
        <div v-if="store.loading" class="flex justify-center py-16">
          <div class="spinner !w-8 !h-8" />
        </div>
        <div v-else style="height: 220px">
          <BarChart :data="store.barChartData" />
        </div>
      </div>

      <!-- Tabla: zonas en detalle -->
      <div class="card overflow-hidden">
        <div class="p-4 border-b border-fl-green/10">
          <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider">
            Estado por zona
          </h3>
        </div>
        <div v-if="store.loading" class="flex justify-center py-12">
          <div class="spinner !w-8 !h-8" />
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table-fl">
            <thead>
              <tr>
                <th>Zona</th>
                <th class="text-center">Ahora</th>
                <th class="text-center hidden sm:table-cell">Media hoy</th>
                <th class="text-center hidden md:table-cell">Máx hoy</th>
                <th class="text-center">Sistemas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="zone in store.occupancyByZone" :key="zone.zone">
                <td>
                  <span class="font-orbitron text-xs text-fl-green-l">{{ zone.zone }}</span>
                </td>
                <td class="text-center">
                  <span class="font-orbitron font-bold text-fl-mint">
                    {{ zone.ocupacion_actual }}
                  </span>
                </td>
                <td class="text-center hidden sm:table-cell text-fl-mint/50 font-rajdhani">
                  {{ zone.media_hoy }}
                </td>
                <td class="text-center hidden md:table-cell text-fl-warn font-rajdhani font-semibold">
                  {{ zone.max_hoy }}
                </td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <span
                      v-for="sys in store.energySystems.filter(s => s.zone === zone.zone)"
                      :key="sys.device_type"
                      :title="`${sys.device_type}: ${sys.status}`"
                      :style="{ color: statusColor(sys.status) }"
                      class="text-sm"
                    >
                      {{ deviceIcon(sys.device_type) }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="store.occupancyByZone.length === 0">
                <td colspan="5" class="text-center py-8 text-fl-mint/20 font-rajdhani uppercase tracking-widest text-xs">
                  Sin datos
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Últimas lecturas ───────────────────────────────── -->
    <div class="card overflow-hidden">
      <div class="p-4 border-b border-fl-green/10 flex items-center justify-between">
        <h3 class="font-rajdhani font-bold text-fl-mint text-sm uppercase tracking-wider">
          Últimas lecturas de sensores
        </h3>
        <span class="font-rajdhani text-xs text-fl-mint/30">
          {{ store.occupancyHistory.length }} registros
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="table-fl">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Zona</th>
              <th class="text-center">Personas</th>
              <th class="text-center hidden sm:table-cell">Movimiento</th>
              <th class="hidden md:table-cell">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in store.occupancyHistory.slice(0, 10)"
              :key="row.id"
            >
              <td class="font-orbitron text-xs text-fl-green-l/70">{{ row.device_id }}</td>
              <td class="font-rajdhani text-fl-mint/70">{{ row.zone }}</td>
              <td class="text-center font-orbitron font-bold text-fl-mint">{{ row.people_count }}</td>
              <td class="text-center hidden sm:table-cell">
                <span :class="row.movement ? 'badge-green' : 'badge-blue'" class="badge text-xs">
                  {{ row.movement ? 'Sí' : 'No' }}
                </span>
              </td>
              <td class="hidden md:table-cell font-rajdhani text-xs text-fl-mint/40">
                {{ new Date(row.timestamp).toLocaleString('es') }}
              </td>
            </tr>
            <tr v-if="store.occupancyHistory.length === 0">
              <td colspan="5" class="text-center py-8 text-fl-mint/20 font-rajdhani uppercase tracking-widest text-xs">
                Sin lecturas en el periodo seleccionado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
