<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

defineProps<{
  data:    any
  options?: any
  height?: number
}>()
</script>

<template>
  <Line :data="data" :options="options ?? defaultOptions" :height="height ?? 220" />
</template>

<script lang="ts">
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: 'rgba(241,250,238,0.6)', font: { family: 'Rajdhani', size: 11 } }
    },
    tooltip: {
      backgroundColor: 'rgba(4,14,10,0.95)',
      borderColor:     'rgba(45,106,79,0.5)',
      borderWidth:     1,
      titleColor:      '#52B788',
      bodyColor:       '#F1FAEE',
      titleFont:       { family: 'Orbitron', size: 10 },
      bodyFont:        { family: 'Rajdhani', size: 12 }
    }
  },
  scales: {
    x: {
      grid:  { color: 'rgba(29,53,87,0.3)' },
      ticks: { color: 'rgba(241,250,238,0.4)', font: { family: 'Rajdhani', size: 10 } }
    },
    y: {
      grid:  { color: 'rgba(29,53,87,0.3)' },
      ticks: { color: 'rgba(241,250,238,0.4)', font: { family: 'Rajdhani', size: 10 } },
      beginAtZero: true
    }
  }
}
</script>
