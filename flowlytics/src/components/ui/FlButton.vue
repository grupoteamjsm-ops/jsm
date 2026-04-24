<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'icon'
  type?:    'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?:  boolean
  size?:     'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <button
    :type="type || 'button'"
    :disabled="disabled || loading"
    :class="[
      'fl-btn',
      variant === 'secondary' ? 'fl-btn--secondary' : '',
      variant === 'danger'    ? 'fl-btn--danger'    : '',
      variant === 'icon'      ? 'fl-btn--icon'      : '',
      (!variant || variant === 'primary') ? 'fl-btn--primary' : '',
      size === 'sm' ? 'fl-btn--sm' : '',
      size === 'lg' ? 'fl-btn--lg' : '',
    ]"
  >
    <!-- Spinner de carga -->
    <span v-if="loading" class="fl-spinner" aria-hidden="true" />

    <!-- Contenido -->
    <span v-else class="fl-btn__content">
      <slot />
    </span>

    <!--
      Animación de perímetro tipo circuito.
      Usa 4 líneas SVG que recorren cada lado del botón.
      Solo visible en primario y secundario.
    -->
    <span
      v-if="variant !== 'icon'"
      class="fl-btn__circuit"
      aria-hidden="true"
    >
      <svg class="fl-btn__circuit-svg" xmlns="http://www.w3.org/2000/svg">
        <!-- Top -->
        <line class="fl-circuit-top"    x1="0"    y1="0"    x2="100%" y2="0" />
        <!-- Right -->
        <line class="fl-circuit-right"  x1="100%" y1="0"    x2="100%" y2="100%" />
        <!-- Bottom -->
        <line class="fl-circuit-bottom" x1="100%" y1="100%" x2="0"    y2="100%" />
        <!-- Left -->
        <line class="fl-circuit-left"   x1="0"    y1="100%" x2="0"    y2="0" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
/* ─── Base ──────────────────────────────────────────────────── */
.fl-btn {
  position:        relative;
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  gap:             0.5rem;
  padding:         0.75rem 1.5rem;
  font-family:     'Orbitron', monospace;
  font-size:       0.75rem;
  font-weight:     600;
  letter-spacing:  0.1em;
  text-transform:  uppercase;
  color:           #F1FAEE;
  border:          none;
  outline:         none;
  cursor:          pointer;
  overflow:        hidden;
  transition:      transform 150ms ease, box-shadow 200ms ease, background 200ms ease;

  /* Esquinas cortadas en diagonal — estilo futurista */
  clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
}

.fl-btn:focus-visible {
  outline:        2px solid #52B788;
  outline-offset: 3px;
}

/* ─── Primario ───────────────────────────────────────────────── */
.fl-btn--primary {
  background: linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%);
  box-shadow: 0 0 10px rgba(45, 106, 79, 0.5),
              0 0 20px rgba(45, 106, 79, 0.2);
}

.fl-btn--primary:hover:not(:disabled) {
  box-shadow: 0 0 18px rgba(82, 183, 136, 0.8),
              0 0 36px rgba(45, 106, 79, 0.5),
              0 0 60px rgba(45, 106, 79, 0.2);
  transform: translateY(-1px);
}

.fl-btn--primary:active:not(:disabled) {
  transform:  scale(0.98);
  box-shadow: 0 0 10px rgba(45, 106, 79, 0.5);
}

/* ─── Secundario ─────────────────────────────────────────────── */
.fl-btn--secondary {
  background:  transparent;
  border:      2px solid #1D3557;
  color:       #2D6A4F;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  clip-path:   polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
}

.fl-btn--secondary:hover:not(:disabled) {
  border-color: #2D6A4F;
  color:        #F1FAEE;
  background:   rgba(45, 106, 79, 0.1);
  box-shadow:   0 0 12px rgba(29, 53, 87, 0.6);
}

.fl-btn--secondary:active:not(:disabled) {
  transform: scale(0.98);
}

/* ─── Danger ─────────────────────────────────────────────────── */
.fl-btn--danger {
  background:  rgba(230, 57, 70, 0.85);
  border:      1px solid #E63946;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  clip-path:   polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
}

.fl-btn--danger:hover:not(:disabled) {
  background: #E63946;
  box-shadow: 0 0 14px rgba(230, 57, 70, 0.6);
}

.fl-btn--danger:active:not(:disabled) {
  transform: scale(0.98);
}

/* ─── Icon ───────────────────────────────────────────────────── */
.fl-btn--icon {
  padding:    0;
  width:      2.25rem;
  height:     2.25rem;
  background: rgba(45, 106, 79, 0.1);
  border:     1px solid rgba(45, 106, 79, 0.3);
  clip-path:  none;
  border-radius: 2px;
  color:      #52B788;
}

.fl-btn--icon:hover:not(:disabled) {
  background:  rgba(45, 106, 79, 0.2);
  border-color: #2D6A4F;
  color:       #F1FAEE;
  box-shadow:  0 0 10px rgba(45, 106, 79, 0.5);
}

/* ─── Tamaños ────────────────────────────────────────────────── */
.fl-btn--sm {
  padding:     0.5rem 1rem;
  font-size:   0.65rem;
  clip-path:   polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
}

.fl-btn--lg {
  padding:     1rem 2rem;
  font-size:   0.875rem;
  clip-path:   polygon(14px 0%, 100% 0%, calc(100% - 14px) 100%, 0% 100%);
}

/* ─── Disabled ───────────────────────────────────────────────── */
.fl-btn:disabled {
  background:  rgba(8, 28, 21, 0.5) !important;
  border-color: transparent !important;
  color:       rgba(241, 250, 238, 0.3) !important;
  box-shadow:  none !important;
  cursor:      not-allowed;
  transform:   none !important;
}

/* ─── Contenido ──────────────────────────────────────────────── */
.fl-btn__content {
  position:    relative;
  z-index:     1;
  display:     inline-flex;
  align-items: center;
  gap:         0.4rem;
}

/* ─── Spinner ────────────────────────────────────────────────── */
.fl-spinner {
  display:      inline-block;
  width:        1rem;
  height:       1rem;
  border:       2px solid rgba(241, 250, 238, 0.2);
  border-top:   2px solid #52B788;
  border-radius: 50%;
  animation:    spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Animación de perímetro (circuito) ──────────────────────── */
.fl-btn__circuit {
  position:       absolute;
  inset:          0;
  pointer-events: none;
  z-index:        2;
  opacity:        0;
  transition:     opacity 150ms ease;
}

.fl-btn:hover:not(:disabled) .fl-btn__circuit {
  opacity: 1;
}

.fl-btn__circuit-svg {
  position: absolute;
  inset:    0;
  width:    100%;
  height:   100%;
  overflow: visible;
}

/* Propiedades comunes de las líneas del circuito */
.fl-btn__circuit-svg line {
  stroke:           #52B788;
  stroke-width:     1.5;
  fill:             none;
  stroke-linecap:   round;
}

/* Cada línea tiene su propia longitud y animación */
.fl-circuit-top {
  stroke-dasharray:  200;
  stroke-dashoffset: 200;
  animation: none;
}
.fl-circuit-right {
  stroke-dasharray:  60;
  stroke-dashoffset: 60;
  animation: none;
}
.fl-circuit-bottom {
  stroke-dasharray:  200;
  stroke-dashoffset: 200;
  animation: none;
}
.fl-circuit-left {
  stroke-dasharray:  60;
  stroke-dashoffset: 60;
  animation: none;
}

/* Al hacer hover, las 4 líneas recorren el perímetro en secuencia */
.fl-btn:hover:not(:disabled) .fl-circuit-top {
  animation: drawLine 0.3s ease-out 0s    forwards;
}
.fl-btn:hover:not(:disabled) .fl-circuit-right {
  animation: drawLine 0.2s ease-out 0.3s  forwards;
}
.fl-btn:hover:not(:disabled) .fl-circuit-bottom {
  animation: drawLine 0.3s ease-out 0.5s  forwards;
}
.fl-btn:hover:not(:disabled) .fl-circuit-left {
  animation: drawLine 0.2s ease-out 0.8s  forwards;
}

@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}
</style>
