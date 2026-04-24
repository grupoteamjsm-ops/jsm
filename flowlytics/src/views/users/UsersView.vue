<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import FlButton from '@/components/ui/FlButton.vue'

const users   = ref<any[]>([])
const loading = ref(true)
const saving  = ref<string | null>(null)

const fetchUsers = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/api/users')
    users.value = data.users
  } finally {
    loading.value = false
  }
}

const toggleUser = async (user: any) => {
  saving.value = user.id
  try {
    if (user.activo) {
      await api.delete(`/api/users/${user.id}`)
    } else {
      await api.put(`/api/users/${user.id}`, { activo: true })
    }
    await fetchUsers()
  } finally {
    saving.value = null
  }
}

const changeRole = async (user: any, rol: string) => {
  saving.value = user.id
  try {
    await api.put(`/api/users/${user.id}`, { rol })
    await fetchUsers()
  } finally {
    saving.value = null
  }
}

const rolBadge = (rol: string) =>
  ({ admin: 'badge-green', operador: 'badge-blue', viewer: 'badge-warn' })[rol] || 'badge-blue'

onMounted(fetchUsers)
</script>

<template>
  <div class="space-y-6 animate-slide-up">

    <div>
      <h2 class="font-orbitron text-xl font-bold text-fl-green-l text-glow">Usuarios</h2>
      <p class="font-rajdhani text-fl-mint/50 text-sm uppercase tracking-wider mt-1">
        Gestión de acceso al sistema
      </p>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="spinner !w-8 !h-8" />
      </div>
      <table v-else class="table-fl">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Último acceso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td class="font-semibold text-fl-mint">{{ user.nombre }}</td>
            <td class="text-fl-mint/60 text-xs">{{ user.email }}</td>
            <td>
              <select
                :value="user.rol"
                class="bg-fl-dark border border-fl-blue/40 text-fl-mint text-xs px-2 py-1 font-rajdhani"
                @change="changeRole(user, ($event.target as HTMLSelectElement).value)"
              >
                <option value="admin">Admin</option>
                <option value="operador">Operador</option>
                <option value="viewer">Viewer</option>
              </select>
            </td>
            <td>
              <span :class="user.activo ? 'badge-green' : 'badge-blue'" class="badge">
                {{ user.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="text-fl-mint/40 text-xs font-rajdhani">
              {{ user.ultimo_login ? new Date(user.ultimo_login).toLocaleDateString('es') : '—' }}
            </td>
            <td>
              <FlButton
                :variant="user.activo ? 'danger' : 'secondary'"
                size="sm"
                :loading="saving === user.id"
                @click="toggleUser(user)"
              >
                {{ user.activo ? 'Desactivar' : 'Activar' }}
              </FlButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
