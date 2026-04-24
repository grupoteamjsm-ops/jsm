<script setup lang="ts">
import FlButton from '@/components/ui/FlButton.vue'
import { ref } from 'vue'

const loading = ref(false)
const simulateLoad = () => {
  loading.value = true
  setTimeout(() => loading.value = false, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-fl-dark p-10 space-y-12"
       style="background-image: radial-gradient(ellipse at 20% 50%, rgba(45,106,79,0.08) 0%, transparent 60%)">

    <div>
      <h1 class="font-orbitron text-2xl font-bold text-fl-green-l text-glow tracking-widest mb-1">
        FLOWLYTICS
      </h1>
      <p class="font-rajdhani text-fl-mint/40 text-sm uppercase tracking-widest">
        Button Design System
      </p>
    </div>

    <!-- Primario -->
    <section class="space-y-4">
      <h2 class="font-rajdhani text-xs uppercase tracking-widest text-fl-mint/40 border-b border-fl-green/20 pb-2">
        Botón Primario — Gradiente + Glow + Clip-path + Circuito
      </h2>
      <div class="flex flex-wrap gap-4 items-center">
        <FlButton variant="primary" size="sm">Acción pequeña</FlButton>
        <FlButton variant="primary">Acción principal</FlButton>
        <FlButton variant="primary" size="lg">Acción grande</FlButton>
        <FlButton variant="primary" :loading="loading" @click="simulateLoad">
          {{ loading ? '' : 'Con loading' }}
        </FlButton>
        <FlButton variant="primary" disabled>Deshabilitado</FlButton>
      </div>
      <p class="font-rajdhani text-xs text-fl-mint/30">
        ↑ Pasa el ratón para ver el circuito recorrer el perímetro
      </p>
    </section>

    <!-- Secundario -->
    <section class="space-y-4">
      <h2 class="font-rajdhani text-xs uppercase tracking-widest text-fl-mint/40 border-b border-fl-green/20 pb-2">
        Botón Secundario — Outline #1D3557 + Hover verde
      </h2>
      <div class="flex flex-wrap gap-4 items-center">
        <FlButton variant="secondary" size="sm">Cancelar</FlButton>
        <FlButton variant="secondary">Acción secundaria</FlButton>
        <FlButton variant="secondary" size="lg">Ver más</FlButton>
        <FlButton variant="secondary" disabled>Deshabilitado</FlButton>
      </div>
    </section>

    <!-- Danger -->
    <section class="space-y-4">
      <h2 class="font-rajdhani text-xs uppercase tracking-widest text-fl-mint/40 border-b border-fl-green/20 pb-2">
        Botón Danger — Rojo con glow
      </h2>
      <div class="flex flex-wrap gap-4 items-center">
        <FlButton variant="danger" size="sm">Eliminar</FlButton>
        <FlButton variant="danger">Desactivar sistema</FlButton>
        <FlButton variant="danger" disabled>Deshabilitado</FlButton>
      </div>
    </section>

    <!-- Icon -->
    <section class="space-y-4">
      <h2 class="font-rajdhani text-xs uppercase tracking-widest text-fl-mint/40 border-b border-fl-green/20 pb-2">
        Botón Icon
      </h2>
      <div class="flex flex-wrap gap-4 items-center">
        <FlButton variant="icon">⚡</FlButton>
        <FlButton variant="icon">◈</FlButton>
        <FlButton variant="icon">⬡</FlButton>
        <FlButton variant="icon" disabled>✕</FlButton>
      </div>
    </section>

    <!-- Estados -->
    <section class="space-y-4">
      <h2 class="font-rajdhani text-xs uppercase tracking-widest text-fl-mint/40 border-b border-fl-green/20 pb-2">
        Estados visuales
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div class="space-y-2">
          <FlButton variant="primary" class="w-full">Normal</FlButton>
          <p class="font-rajdhani text-xs text-fl-mint/30">Default</p>
        </div>
        <div class="space-y-2">
          <FlButton variant="primary" class="w-full" style="box-shadow: 0 0 18px rgba(82,183,136,0.8), 0 0 36px rgba(45,106,79,0.5)">
            Hover
          </FlButton>
          <p class="font-rajdhani text-xs text-fl-mint/30">Hover (glow aumentado)</p>
        </div>
        <div class="space-y-2">
          <FlButton variant="primary" class="w-full" style="transform: scale(0.98)">
            Active
          </FlButton>
          <p class="font-rajdhani text-xs text-fl-mint/30">Active (scale 0.98)</p>
        </div>
        <div class="space-y-2">
          <FlButton variant="primary" class="w-full" disabled>Disabled</FlButton>
          <p class="font-rajdhani text-xs text-fl-mint/30">Disabled (#081C15 50%)</p>
        </div>
      </div>
    </section>

    <!-- Uso en contexto -->
    <section class="space-y-4">
      <h2 class="font-rajdhani text-xs uppercase tracking-widest text-fl-mint/40 border-b border-fl-green/20 pb-2">
        Uso en contexto — Card con acciones
      </h2>
      <div class="max-w-sm" style="
        background: rgba(4,14,10,0.8);
        border: 1px solid rgba(45,106,79,0.2);
        clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
        padding: 1.5rem;
      ">
        <h3 class="font-orbitron text-sm text-fl-green-l mb-1">Zona: Oficina A</h3>
        <p class="font-rajdhani text-fl-mint/50 text-xs uppercase tracking-wider mb-4">
          3 personas · Iluminación 75%
        </p>
        <div class="flex gap-3">
          <FlButton variant="primary" size="sm">Encender</FlButton>
          <FlButton variant="secondary" size="sm">Ajustar</FlButton>
          <FlButton variant="danger" size="sm">Apagar</FlButton>
        </div>
      </div>
    </section>

  </div>
</template>
