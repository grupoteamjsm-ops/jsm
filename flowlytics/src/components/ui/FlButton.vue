<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'icon'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <button
    :type="type || 'button'"
    :disabled="disabled || loading"
    :class="[
      variant === 'primary'   ? 'btn-primary'   : '',
      variant === 'secondary' ? 'btn-secondary' : '',
      variant === 'danger'    ? 'btn-danger'    : '',
      variant === 'icon'      ? 'btn-icon'      : '',
      !variant                ? 'btn-primary'   : '',
      size === 'sm' ? '!px-4 !py-2 !text-xs' : '',
      size === 'lg' ? '!px-8 !py-4 !text-base' : '',
    ]"
  >
    <!-- Loading spinner -->
    <span v-if="loading" class="spinner !w-4 !h-4" />

    <!-- Contenido del slot -->
    <slot v-else />

    <!-- Micro-animación de circuito en hover (solo primario) -->
    <span
      v-if="variant === 'primary' || !variant"
      class="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <span class="circuit-line" />
    </span>
  </button>
</template>

<style scoped>
.circuit-line {
  position: absolute;
  top: 0; left: -100%;
  width: 60%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(82,183,136,0.8), transparent);
  transition: none;
}

button:hover .circuit-line {
  animation: sweep 0.6s ease-out forwards;
}

@keyframes sweep {
  from { left: -60%; }
  to   { left: 140%; }
}
</style>
