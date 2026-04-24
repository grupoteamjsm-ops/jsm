<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import FlButton from '@/components/ui/FlButton.vue'

const auth   = useAuthStore()
const router = useRouter()

const email    = ref('')
const password = ref('')

const submit = async () => {
  const ok = await auth.login(email.value, password.value)
  if (ok) router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-fl-dark px-4"
       style="background-image: radial-gradient(ellipse at 30% 60%, rgba(45,106,79,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(29,53,87,0.10) 0%, transparent 60%)">

    <div class="w-full max-w-md animate-slide-up">

      <!-- Logo -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary mb-4 shadow-glow-green"
             style="clip-path: polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)">
          <span class="font-orbitron font-black text-fl-mint text-xl">FL</span>
        </div>
        <h1 class="font-orbitron font-bold text-2xl text-fl-green-l text-glow tracking-widest">FLOWLYTICS</h1>
        <p class="font-rajdhani text-fl-mint/50 text-sm uppercase tracking-widest mt-1">IoT Occupancy System</p>
      </div>

      <!-- Card -->
      <div class="card p-8 circuit-border">
        <h2 class="font-orbitron text-sm font-semibold text-fl-mint/70 uppercase tracking-widest mb-6">
          Acceso al sistema
        </h2>

        <form @submit.prevent="submit" class="space-y-5">
          <div>
            <label class="block font-rajdhani text-xs uppercase tracking-widest text-fl-mint/50 mb-2">
              Email
            </label>
            <input
              v-model="email"
              type="email"
              class="input"
              placeholder="usuario@empresa.com"
              required
              autocomplete="email"
            />
          </div>

          <div>
            <label class="block font-rajdhani text-xs uppercase tracking-widest text-fl-mint/50 mb-2">
              Contraseña
            </label>
            <input
              v-model="password"
              type="password"
              class="input"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </div>

          <!-- Error -->
          <p v-if="auth.error" class="text-fl-danger text-xs font-rajdhani">
            ⚠ {{ auth.error }}
          </p>

          <FlButton
            type="submit"
            variant="primary"
            :loading="auth.loading"
            class="w-full mt-2"
          >
            Iniciar sesión
          </FlButton>
        </form>
      </div>

      <p class="text-center text-fl-mint/20 text-xs font-rajdhani mt-6 uppercase tracking-widest">
        v2.0 · Hono · Vue 3 · PostgreSQL
      </p>
    </div>
  </div>
</template>
