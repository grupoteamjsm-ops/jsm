# Flowlytics — Frontend

Interfaz web de **Flowlytics**, el sistema IoT de monitorización de ocupación y optimización energética. Diseño Tech-Fintech, responsive para escritorio, tablet y móvil.

## Stack

- **Vue 3** — Composition API
- **Vite** — bundler
- **TypeScript**
- **Pinia** — gestión de estado
- **Vue Router 4** — navegación
- **Tailwind CSS 3** — estilos
- **Chart.js + vue-chartjs** — gráficas
- **Axios** — cliente HTTP con interceptor JWT

---

## Arrancar

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # build de producción
```

Requiere el backend corriendo en `http://localhost:3000` (configurable en `.env`).

---

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email | `admin@iot.com` |
| Contraseña | `admin123` |

---

## Variables de entorno

```env
VITE_API_URL=http://localhost:3000
```

---

## Estructura

```
src/
├── assets/
│   └── main.css              Design system completo (Tailwind + clases custom)
├── components/
│   ├── charts/
│   │   ├── BarChart.vue
│   │   ├── DoughnutChart.vue
│   │   └── LineChart.vue
│   ├── layout/
│   │   └── AppLayout.vue     Sidebar + topbar responsive
│   └── ui/
│       └── FlButton.vue      Botón con variantes + animación de circuito
├── router/
│   └── index.ts              Rutas + guard de autenticación + control de roles
├── services/
│   └── api.ts                Axios + interceptor JWT + auto-refresh
├── stores/
│   ├── auth.ts               Login, logout, perfil, tokens
│   └── dashboard.ts          Datos de ocupación, gráficas, KPIs
└── views/
    ├── auth/
    │   └── LoginView.vue
    ├── analytics/
    │   └── AnalyticsView.vue  Estadísticas, gráficas históricas, filtros de fecha
    ├── dashboard/
    │   └── DashboardView.vue  Tiempo real, KPIs, gráficas, tabla de lecturas
    ├── energy/
    │   └── EnergyView.vue     Control de sistemas energéticos
    ├── users/
    │   └── UsersView.vue      Gestión de usuarios (solo admin)
    ├── zones/
    │   └── ZonesView.vue      Gestión de zonas
    └── ButtonDemo.vue         Demo del design system (/demo/buttons)
```

---

## Vistas

### Dashboard (`/dashboard`)
- KPIs en tiempo real: personas, zonas ocupadas, máximo del día, sistemas ON
- Gráfica de línea: evolución temporal de ocupación
- Donut: distribución de personas por zona
- Barras: patrón horario (media por hora del día)
- Tabla de zonas con estado energético
- Tabla de últimas lecturas de sensores
- Filtros: Hoy / 7 días / 30 días + zona
- Actualización automática via SSE + polling cada 60s

### Analíticas (`/analytics`)
- Personas detectadas por día (línea)
- Movimiento detectado vs sin movimiento (donut)
- Patrón horario por zona (barras)
- Comparativa media vs máximo por zona
- Tabla completa de estadísticas por zona
- Filtro por rango de fechas personalizado + zona

### Zonas (`/zones`)
- Listado de zonas con estado
- Crear zona (admin)
- Activar / desactivar zona

### Energía (`/energy`)
- Tarjetas de control por sistema y zona
- Encender / apagar / ajustar al 50%
- Solo admin y operador pueden ejecutar acciones

### Usuarios (`/users`) — solo admin
- Listado de usuarios
- Cambiar rol (admin / operador / viewer)
- Activar / desactivar cuenta

---

## Design System

Paleta **Tech-Fintech**:

| Token | Color | Uso |
|-------|-------|-----|
| `fl-dark` | `#081C15` | Fondo principal |
| `fl-green` | `#2D6A4F` | Verde primario |
| `fl-green-l` | `#52B788` | Verde claro / acento |
| `fl-mint` | `#F1FAEE` | Texto principal |
| `fl-blue` | `#1D3557` | Azul medianoche (bordes) |
| `fl-warn` | `#F4A261` | Naranja advertencia |
| `fl-danger` | `#E63946` | Rojo alerta |

Fuentes: **Orbitron** (títulos) · **Rajdhani** (etiquetas) · **Inter** (cuerpo)

### Botones (`FlButton`)
- `variant="primary"` — gradiente verde + glow + clip-path diagonal + animación de circuito en hover
- `variant="secondary"` — outline `#1D3557` + hover verde
- `variant="danger"` — rojo con glow
- `variant="icon"` — cuadrado mínimo
- Estados: hover (glow aumentado), active (scale 0.98), disabled (#081C15 50%)
- Demo en `/demo/buttons`

---

## Responsive

| Breakpoint | Comportamiento |
|-----------|---------------|
| Móvil (`< lg`) | Sidebar oculto, hamburger en topbar, columnas apiladas |
| Tablet (`md`) | Grid 2 columnas, algunas columnas de tabla visibles |
| Escritorio (`lg+`) | Sidebar colapsable a iconos, grid 3 columnas |
