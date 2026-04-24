<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

defineProps<{
  data:    any
  options?: any
  height?: number
}>()
</script>

<template>
  <Doughnut :data="data" :options="options ?? defaultOptions" :height="height ?? 220" />
</template>

<script lang="ts">
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color:   'rgba(241,250,238,0.6)',
        font:    { family: 'Rajdhani', size: 11 },
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8
      }
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
  }
}
</script>
