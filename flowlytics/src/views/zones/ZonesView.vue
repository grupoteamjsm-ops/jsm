<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import FlButton from '@/components/ui/FlButton.vue'

const auth   = useAuthStore()
const zones  = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const form = ref({ name: '', description: '', capacity: 0 })
const saving = ref(false)

const fetchZones = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/api/zones')
    zones.value = data.zones
  } finally {
    loading.value = false
  }
}

const createZone = async () => {
  saving.value = true
  try {
    await api.post('/api/zones', form.value)
    form.value = { name: '', description: '', capacity: 0 }
    showForm.value = false
    await fetchZones()
  } finally {
    saving.value = false
  }
}

const toggleZone = async (zone: any) => {
  await api.put(`/api/zones/${zone.id}`, { active: !zone.active })
  await fetchZones()
}

onMounted(fetchZones)
</script>

<template>
  <div class="space-y-6 animate-slide-up">

    <div class="flex items-center justify-between">
      <div>
        <h2 class="font-orbitron text-xl font-bold text-fl-green-l text-glow">Zonas</h2>
        <p class="font-rajdhani text-fl-mint/50 text-sm uppercase tracking-wider mt-1">
          Gestión de espacios de trabajo
        </p>
      </div>
      <FlButton v-if="auth.isAdmin" variant="primary" size="sm" @click="showForm = !showForm">
        + Nueva zona
      </FlButton>
    </div>

    <!-- Formulario nueva zona -->
    <div v-if="showForm" class="card p-6 space-y-4 animate-slide-up">
      <h3 class="font-rajdhani font-bold text-fl-mint uppercase tracking-wider text-sm">Nueva zona</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block font-rajdhani text-xs uppercase tracking-widest text-fl-mint/50 mb-2">Nombre</label>
          <input v-model="form.name" class="input" placeholder="oficina-a" />
        </div>
        <div>
          <label class="block font-rajdhani text-xs uppercase tracking-widest text-fl-mint/50 mb-2">Descripción</label>
          <input v-model="form.description" class="input" placeholder="Planta 1, ala norte" />
        </div>
        <div>
          <label class="block font-rajdhani text-xs uppercase tracking-widest text-fl-mint/50 mb-2">Capacidad</label>
          <input v-model.number="form.capacity" type="number" class="input" placeholder="10" />
        </div>
      </div>
      <div class="flex gap-3">
        <FlButton variant="primary" size="sm" :loading="saving" @click="createZone">Guardar</FlButton>
        <FlButton variant="secondary" size="sm" @click="showForm = false">Cancelar</FlButton>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="spinner !w-8 !h-8" />
      </div>
      <table v-else class="table-fl">
        <thead>
          <tr>
            <th>Zona</th>
            <th>Descripción</th>
            <th>Capacidad</th>
            <th>Estado</th>
            <th v-if="auth.isAdmin">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="zone in zones" :key="zone.id">
            <td class="font-orbitron text-xs text-fl-green-l">{{ zone.name }}</td>
            <td class="text-fl-mint/60">{{ zone.description || '—' }}</td>
            <td class="font-rajdhani">{{ zone.capacity }}</td>
            <td>
              <span :class="zone.active ? 'badge-green' : 'badge-blue'" class="badge">
                {{ zone.active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td v-if="auth.isAdmin">
              <FlButton variant="secondary" size="sm" @click="toggleZone(zone)">
                {{ zone.active ? 'Desactivar' : 'Activar' }}
              </FlButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
