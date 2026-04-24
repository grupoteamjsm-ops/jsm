import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useDashboardStore = defineStore('dashboard', () => {
  // ── Estado ────────────────────────────────────────────────
  const occupancyByZone  = ref<any[]>([])
  const occupancyByHour  = ref<any[]>([])
  const occupancyHistory = ref<any[]>([])
  const occupancyStats   = ref<any[]>([])
  const energySystems    = ref<any[]>([])
  const loading          = ref(false)

  // Filtros activos
  const selectedZone  = ref<string>('')
  const selectedRange = ref<'today' | '7d' | '30d' | 'custom'>('today')
  const customFrom    = ref<string>('')
  const customTo      = ref<string>('')

  // ── Helpers de fecha ──────────────────────────────────────
  const getDateRange = () => {
    const now  = new Date()
    const to   = now.toISOString()
    let   from = ''

    if (selectedRange.value === 'today') {
      const start = new Date(now); start.setHours(0,0,0,0)
      from = start.toISOString()
    } else if (selectedRange.value === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 7)
      from = d.toISOString()
    } else if (selectedRange.value === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 30)
      from = d.toISOString()
    } else {
      from = customFrom.value
    }

    return { from, to: selectedRange.value === 'custom' ? customTo.value : to }
  }

  // ── Fetch principal ───────────────────────────────────────
  const fetchAll = async () => {
    loading.value = true
    const { from, to } = getDateRange()

    const params: any = {}
    if (selectedZone.value) params.zone = selectedZone.value
    if (from) params.from = from
    if (to)   params.to   = to

    try {
      const [byZone, byHour, history, stats, energy] = await Promise.all([
        api.get('/api/occupancy/by-zone'),
        api.get('/api/occupancy/by-hour',  { params }),
        api.get('/api/occupancy/history',  { params: { ...params, limit: 200 } }),
        api.get('/api/occupancy/stats',    { params }),
        api.get('/api/energy/status',      { params: selectedZone.value ? { zone: selectedZone.value } : {} })
      ])

      occupancyByZone.value  = byZone.data.data?.zones  ?? []
      occupancyByHour.value  = byHour.data.data?.by_hour ?? []
      occupancyHistory.value = history.data.history      ?? []
      occupancyStats.value   = stats.data.data?.zones    ?? []
      energySystems.value    = energy.data.data?.systems ?? []
    } finally {
      loading.value = false
    }
  }

  // ── Computed para gráficas ────────────────────────────────

  /** Línea: personas a lo largo del tiempo (historial) */
  const lineChartData = computed(() => {
    const sorted = [...occupancyHistory.value]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-50) // últimos 50 puntos

    const zones = [...new Set(sorted.map(r => r.zone))]
    const colors = ['#52B788', '#457B9D', '#F4A261', '#A8DADC', '#E63946']

    return {
      labels: [...new Set(sorted.map(r =>
        new Date(r.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
      ))],
      datasets: zones.map((zone, i) => ({
        label:           zone,
        data:            sorted.filter(r => r.zone === zone).map(r => r.people_count),
        borderColor:     colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + '20',
        borderWidth:     2,
        pointRadius:     3,
        tension:         0.4,
        fill:            true
      }))
    }
  })

  /** Barras: media de personas por hora del día */
  const barChartData = computed(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const zones = [...new Set(occupancyByHour.value.map((r: any) => r.zone))]
    const colors = ['#52B788', '#457B9D', '#F4A261', '#A8DADC']

    return {
      labels: hours.map(h => `${String(h).padStart(2,'0')}h`),
      datasets: zones.map((zone, i) => ({
        label:           zone,
        data:            hours.map(h => {
          const row = occupancyByHour.value.find((r: any) => r.zone === zone && parseInt(r.hora) === h)
          return row ? parseFloat(row.media_personas) : 0
        }),
        backgroundColor: colors[i % colors.length] + 'CC',
        borderColor:     colors[i % colors.length],
        borderWidth:     1,
        borderRadius:    2
      }))
    }
  })

  /** Donut: distribución de personas por zona (actual) */
  const doughnutData = computed(() => {
    const colors = ['#52B788', '#457B9D', '#F4A261', '#A8DADC', '#E63946', '#2D6A4F']
    return {
      labels: occupancyByZone.value.map((z: any) => z.zone),
      datasets: [{
        data:            occupancyByZone.value.map((z: any) => Number(z.ocupacion_actual) || 0),
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor:     colors,
        borderWidth:     1,
        hoverOffset:     6
      }]
    }
  })

  // ── Totales ───────────────────────────────────────────────
  const totalPersonas   = computed(() =>
    occupancyByZone.value.reduce((s: number, z: any) => s + (Number(z.ocupacion_actual) || 0), 0)
  )
  const totalZonas      = computed(() => occupancyByZone.value.length)
  const zonasOcupadas   = computed(() =>
    occupancyByZone.value.filter((z: any) => Number(z.ocupacion_actual) > 0).length
  )
  const sistemasActivos = computed(() =>
    energySystems.value.filter((s: any) => s.status === 'on').length
  )
  const maxPersonasHoy  = computed(() =>
    Math.max(0, ...occupancyByZone.value.map((z: any) => Number(z.max_hoy) || 0))
  )

  return {
    occupancyByZone, occupancyByHour, occupancyHistory, occupancyStats,
    energySystems, loading,
    selectedZone, selectedRange, customFrom, customTo,
    fetchAll,
    lineChartData, barChartData, doughnutData,
    totalPersonas, totalZonas, zonasOcupadas, sistemasActivos, maxPersonasHoy
  }
})
