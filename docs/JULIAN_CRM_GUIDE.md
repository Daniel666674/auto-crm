# BlackScale Nexus CRM — Guía de Uso para Julian

> Guía práctica para dominar el CRM desde el primer día.
> Cubre navegación, módulos, flujos de trabajo y tips de uso diario.

---

## Tabla de contenidos

1. [Primeros pasos](#1-primeros-pasos)
2. [Estructura del CRM — qué vive dónde](#2-estructura-del-crm)
3. [Contactos y leads](#3-contactos-y-leads)
4. [Pipeline de ventas](#4-pipeline-de-ventas)
5. [Deals](#5-deals)
6. [Actividades y seguimiento](#6-actividades-y-seguimiento)
7. [Dashboard — tu pantalla de inicio](#7-dashboard)
8. [Command Center M+S](#8-command-center-ms)
9. [Marketing](#9-marketing)
10. [Módulos de inteligencia (Forecast, Deal Intel, NBA)](#10-módulos-de-inteligencia)
11. [Ajustes clave que debes conocer](#11-ajustes-clave)
12. [Flujos de trabajo diarios recomendados](#12-flujos-de-trabajo-diarios)
13. [Errores comunes y cómo evitarlos](#13-errores-comunes)
14. [Tips avanzados](#14-tips-avanzados)

---

## 1. Primeros pasos

### Acceso
- URL de producción: `nexus.blackscale.consulting`
- Inicia sesión con tu email y contraseña asignados.
- Tu rol determina qué módulos ves. Roles disponibles: **Superadmin**, **Marketing**, **Sales**.

### Orientación inicial
Al entrar verás el **Dashboard principal** (Sales). Las tres cosas más importantes al inicio del día:

1. **Próximas Acciones** (NBA) — contacts que requieren atención hoy
2. **Leads Calientes** — quién tiene temperatura hot y score alto
3. **KPIs del pipeline** — abierto, ponderado, ticket promedio, ganado este mes

---

## 2. Estructura del CRM

```
Barra lateral izquierda
├── Dashboard              ← Inicio de ventas
├── Command Center         ← Vista unificada M+S
├── Pipeline               ← Kanban de deals
├── Contactos              ← Base de leads
├── Deals                  ← Lista plana de deals
├── Actividades            ← Todas las interacciones
├── Calendario             ← Vista de actividades por fecha
│
├── REVENUE INTELLIGENCE
│   ├── Forecast           ← Proyecciones 30/60/90d
│   ├── Revenue Intel      ← Análisis de ingresos
│   ├── Deal Intelligence  ← Salud de deals individuales
│   └── Win / Loss         ← Análisis de cierres
│
├── PROSPECTING ENGINE
│   ├── ICP Scorer         ← Calificador de perfil ideal
│   ├── Secuencias         ← Cadencias de outreach
│   └── Radar              ← Leads en el radar
│
├── ACCOUNT MANAGEMENT
│   ├── Clientes           ← Cuentas activas
│   ├── Renovaciones       ← Pipeline de renovaciones
│   └── Entregables        ← Gestión de entregables
│
├── PROPUESTAS & PRECIOS
│   ├── Propuestas         ← Generador de propuestas
│   └── Calculadora        ← Calculadora de precios
│
├── REPORTES INTERNOS
│   ├── Revenue / Métricas / Pipeline Health
│   ├── Marketing          ← Módulo de marketing completo
│   └── Analytics          ← Datos de tráfico/GA4
│
└── Ajustes
```

---

## 3. Contactos y leads

### Crear un contacto
1. Ir a **Contactos** → botón **Nuevo contacto** (arriba a la derecha)
2. Campos clave:
   - **Nombre** (requerido)
   - **Email** — sin email no se puede nutrir digitalmente
   - **Empresa** — agrupa el contacto en la vista de Cuentas
   - **Fuente** — de dónde vino (web, referido, linkedin, etc.)
   - **Etapa del ciclo de vida** — lead / MQL / SQL / opportunity / customer
   - **Temperatura** — cold / warm / hot

### Etapas del ciclo de vida
| Etapa | Qué significa |
|-------|---------------|
| Lead | Contacto nuevo, sin calificar |
| MQL | Marketing Qualified Lead — listo para ventas |
| SQL | Sales Qualified Lead — ventas confirmó interés |
| Opportunity | Deal abierto, negociando |
| Customer | Cerró como cliente |

**Regla importante:** No saltar etapas. Un lead no pasa de Lead a Opportunity sin ser MQL y SQL primero. Esto mantiene las métricas del embudo limpias.

### Score y temperatura
- El **score** (0–100) lo calcula automáticamente el sistema basado en interacciones, fuente, industry, etc.
- La **temperatura** refleja nivel de interés: cold → warm → hot.
- Puedes ajustar ambos manualmente desde el detalle del contacto.

### Devolver un contacto a marketing
Cuando ventas determina que un lead no está listo para cerrar:
1. Abrir el contacto → botón **Devolver a Marketing**
2. Seleccionar la razón (no es buen fit, mal timing, etc.)
3. El contacto desaparece del pipeline, deals y dashboard de ventas automáticamente.
4. Marketing lo ve en su módulo para re-nutrir.

**No elimines contactos** — devuélvelos. La historia se preserva.

### Búsqueda y filtros
- Barra de búsqueda global (arriba) busca por nombre, email, empresa.
- En la lista de Contactos puedes filtrar por temperatura, fuente, lifecycle stage.

---

## 4. Pipeline de ventas

### Vista Kanban
- Cada columna es una etapa del pipeline (Prospecto → Contactado → Propuesta → Negociación → Cerrado).
- Las tarjetas muestran: nombre del contacto, valor del deal, temperatura, días en etapa, score.
- **Arrastra y suelta** tarjetas entre columnas para mover deals.

### Columnas Cerrado Ganado y Cerrado Perdido
- Mover un deal a **Cerrado Ganado** crea automáticamente un registro en **Clientes**.
- Mover a **Cerrado Perdido** registra la pérdida para análisis Win/Loss.

### Agregar un deal desde el pipeline
- Clic en **+ Deal** en cualquier columna.
- Selecciona el contacto, pon título, valor y fecha de cierre esperada.
- El deal aparece inmediatamente en esa etapa.

### Métricas del pipeline (barra superior)
| Métrica | Qué muestra |
|---------|-------------|
| Pipeline abierto | Suma de todos los deals activos |
| Ponderado | Valor × probabilidad de cierre |
| Ticket promedio | Valor medio de deals activos |
| Ganado este mes | Ingresos cerrados en el mes actual |

### Embudo por etapa (parte inferior)
Gráfico de barras que muestra cuántos deals hay en cada etapa. Úsalo para detectar cuellos de botella.

---

## 5. Deals

### Lista de deals
- **Deals** en la barra lateral muestra todos los deals en formato tabla.
- Puedes ordenar por valor, etapa, fecha de cierre.
- Clic en un deal para ver su detalle completo.

### Detalle de un deal
- Historial de cambios de etapa
- Actividades asociadas
- Valor, probabilidad, fecha esperada de cierre
- Notas

### Deals vs Pipeline
- El **Pipeline** (kanban) es la vista visual para gestión diaria.
- **Deals** (lista) es para buscar, filtrar y exportar.
- Ambos muestran los mismos datos.

---

## 6. Actividades y seguimiento

### Tipos de actividad
| Tipo | Cuándo usarlo |
|------|---------------|
| Llamada | Después de una llamada telefónica |
| Email | Registro de email enviado/recibido |
| Reunión | Después de una reunión (presencial o virtual) |
| Nota | Cualquier observación interna |
| Follow-up | Recordatorio de seguimiento futuro |

### Registrar una actividad
1. Abrir el contacto o deal → sección **Actividades**
2. Clic en **Agregar actividad**
3. Seleccionar tipo, escribir descripción, marcar fecha

### Follow-ups
- Al crear un follow-up, aparece en el **Calendario** y en la sección de follow-ups pendientes.
- Los follow-ups vencidos aparecen en rojo en el Dashboard bajo "Seguimientos".
- **Regla de oro:** Nunca termines una interacción sin crear el siguiente follow-up.

### Completar una actividad
- Desde la lista de actividades del contacto → clic en el check ✓
- Las actividades completadas se mueven al historial pero no se pierden.

---

## 7. Dashboard

El dashboard es tu cockpit diario. Se divide en:

### KPIs principales (fila superior)
- Pipeline abierto, Ponderado, Ticket promedio, Ganado este mes
- Los valores se calculan en tiempo real — lo que ves es lo que hay.

### Leads calientes
- Contactos con temperatura **hot** — los 5 más recientes.
- Clic en cualquiera para ir directo al detalle.

### Follow-ups vencidos
- Seguimientos que ya pasaron su fecha sin completarse.
- Prioridad máxima — resuélvelos primero.

### Próximas Acciones (NBA)
- Lista priorizada automáticamente por el motor de inteligencia.
- Urgencia alta (rojo) = actúa hoy.
- Urgencia media (amarillo) = esta semana.
- Urgencia baja (gris) = cuando puedas.

### Pipeline por etapa
- Barras horizontales con el valor total en cada etapa.

---

## 8. Command Center M+S

Acceso: barra lateral → **Command Center**

Vista unificada para que Marketing y Ventas estén alineados. Muestra:

### Health Score M+S
Puntuación 0–100 de la alineación entre Marketing y Ventas. Calculada sobre:
- Tasa de aceptación de handoffs MQL→SQL
- Tasa de retorno de leads
- Conversión MQL→SQL
- Leads estancados
- Volumen de nuevos leads

**Objetivo:** mantener el score sobre 65. Bajo 45 es crítico.

### Banner SLA
Muestra la versión activa del SLA y cuántas horas tiene ventas para responder a un MQL. Si hay incumplimientos, aparece en rojo con el conteo.

- Editar el SLA: **Ajustes → SLA** (o clic en "Editar SLA →" en el banner)

### Breaches SLA
Lista de MQLs que llevan más horas de las permitidas sin ser contactados. Prioridad urgente.

### Embudo de ciclo de vida
Distribución de todos los contactos por etapa. Identifica dónde se acumulan leads sin avanzar.

### Leads estancados
Contactos en lead/MQL/SQL con más de 14 días sin actualización. Son pérdidas potenciales.

### Motivos de retorno
Los top 6 motivos por los que ventas devolvió leads a marketing en los últimos 30 días. Úsalos para mejorar la calidad de los MQLs.

---

## 9. Marketing

Acceso: barra lateral → **Marketing**

El módulo de marketing tiene secciones en la barra lateral izquierda interna:

### Campañas
- Crear y gestionar campañas de nurturing.
- Cada campaña tiene: nombre, segmento objetivo, cadencia, status.
- Ver métricas: handoffs generados, deals, revenue atribuido.

### Forecast de marketing
- Proyecciones a 30, 60 y 90 días basadas en tasas históricas de conversión.
- Embudo proyectado: cuántos leads → MQLs → SQLs → clientes esperados.
- Úsalo en reuniones de planeación mensual.

### Atribución Multi-touch
Muestra cuánto revenue atribuir a cada campaña según 5 modelos:
| Modelo | Lógica |
|--------|--------|
| First touch | 100% al primer canal que tocó al lead |
| Last touch | 100% al último canal antes de cerrar |
| Linear | Distribuido igual entre todos los toques |
| U-shaped | 40% primer toque, 40% handoff, 20% resto |
| W-shaped | 30% primer toque, 30% MQL, 30% cierre, 10% resto |

**Tip:** Usa U-shaped como referencia principal. First touch para evaluar canales de adquisición, last touch para evaluar canales de cierre.

### Listas
Segmentos de contactos para campañas. Se crean por filtros (temperatura, score, fuente, etc.).

### Secuencias (desde Prospecting Engine)
Cadencias de emails/mensajes automatizadas para nutrición de leads.

---

## 10. Módulos de inteligencia

### Próximas Acciones (NBA) — Motor de prioridad
El sistema evalúa todos los contactos activos contra 6 reglas y genera una lista priorizada:

| Regla | Condición | Acción sugerida | Urgencia |
|-------|-----------|-----------------|----------|
| 1 | Score ≥70 + sin actividad 3 días | Llamar hoy | Alta |
| 2 | MQL estancado ≥7 días | Asignar a ventas | Alta |
| 3 | Deal abierto + sin movimiento 5 días | Confirmar propuesta | Alta |
| 4 | Temperatura hot + sin contacto 2 días | Email follow-up | Media |
| 5 | Warm + score ≥55 + 2 interacciones recientes | Llamar esta semana | Media |
| 6 | Sin email capturado | Capturar email | Baja |

### Forecast
- Proyecta revenue a 30/60/90 días basado en el pipeline actual y tasas históricas.
- Ver en: **Revenue Intelligence → Forecast**

### Deal Intelligence
- Analiza la salud de cada deal individual.
- Detecta deals en riesgo (sin actividad, estancados, overdue).

### Win / Loss
- Análisis de deals ganados vs perdidos.
- Por fuente, por etapa de pérdida, por razón de pérdida.

### ICP Scorer
- Calcula qué tan cerca está un contacto del perfil de cliente ideal (ICP).
- Considera: industry, tamaño, fuente, comportamiento.

---

## 11. Ajustes clave

Acceso: barra lateral → **Ajustes**

### SLA (Ajustes → SLA)
Define el acuerdo de nivel de servicio entre Marketing y Ventas:
- **Horas de respuesta a MQL** — cuánto tiene ventas para contactar un MQL nuevo
- **Horas de calificación de formulario** — tiempo para calificar leads de formulario
- **Máx. retornos por mes** — límite de devoluciones a marketing
- **Razones permitidas de retorno** — lista editable

Tanto Marketing como Ventas deben "Aceptar" el SLA activo. Cada cambio genera una nueva versión con historial.

### Automatizaciones (Ajustes → Automatizaciones)
**Reglas de auto-handoff:**
- Avanza contactos automáticamente entre etapas cuando cumplen condiciones.
- Ejemplo: "Lead caliente con score ≥60 → promover a MQL automáticamente"
- Se ejecutan manualmente con "Ejecutar ahora" o se pueden programar.
- Siempre revisa los resultados después de ejecutar.

**Workflows:**
- Disparan acciones (webhooks, notificaciones Slack, logs) cuando ocurren eventos en el CRM.

### Scoring ICP (Ajustes → Scoring ICP)
Pesos de los factores que determinan el score de un contacto:
- Puedes ajustar qué tanto pesa la fuente, la industria, el engagement, etc.
- Cambios aplican al siguiente recálculo de scores.

### Usuarios (Ajustes → Usuarios — solo Superadmin)
- Crear, editar, activar/desactivar usuarios.
- Cambiar roles: superadmin / marketing / sales.

### Pipeline (Ajustes → Pipeline)
- Configurar etapas del pipeline: nombre, color, probabilidad por defecto.
- Las etapas "Cerrado Ganado" e "Cerrado Perdido" son especiales — no eliminar.

---

## 12. Flujos de trabajo diarios

### Inicio del día (10 min)
1. Abrir **Dashboard** → revisar Próximas Acciones urgentes (urgencia alta primero)
2. Revisar **Follow-ups vencidos** → resolverlos o reprogramarlos
3. Abrir **Command Center** → verificar breaches SLA. Si hay MQLs sin contactar, llamarlos primero.

### Gestión de leads nuevos (según llegan)
1. El lead entra como **Lead** (manual o vía formulario web)
2. Calificar: ¿cumple el ICP? Si sí → mover a **MQL** manualmente o esperar auto-handoff
3. Registrar primer contacto como actividad (llamada/email)
4. Si hay interés → crear deal, mover a **SQL** y mover deal a "Contactado"
5. Crear follow-up para el próximo paso

### Cierre de semana (30 min)
1. Revisar todos los deals sin actividad en los últimos 7 días → agregar nota o follow-up
2. Revisar **Deal Intelligence** → identificar deals en riesgo
3. Actualizar probabilidades de deals si cambiaron las circunstancias
4. Revisar **Forecast** → ¿el pipeline cubre el objetivo del mes?

### Reunión semanal M+S (usando Command Center)
1. Abrir **Command Center** → revisar Health Score
2. Revisar embudo de ciclo de vida: ¿dónde se acumulan leads?
3. Revisar motivos de retorno: ¿hay patrones? ¿qué tipo de leads está mandando marketing?
4. Ajustar SLA si es necesario (Ajustes → SLA)

---

## 13. Errores comunes

### "Eliminé un contacto por error"
No hay papelera de reciclaje. **Nunca elimines contactos activos.** Si un lead no sirve, usa "Devolver a Marketing" o cambia su temperatura a cold.

### "El pipeline muestra deals que ya cerramos"
Verifica que los deals estén en la etapa "Cerrado Ganado" o "Cerrado Perdido". Si siguen en etapas activas, muévelos manualmente.

### "El score no cambia aunque registro actividades"
El score se recalcula en eventos clave (nuevo deal, cambio de etapa, etc.). Puedes forzarlo desde Ajustes → Scoring ICP → "Recalcular scores".

### "Un contacto devuelto a marketing sigue apareciendo"
Después de devolverlo, la página debe recargarse. Si sigue apareciendo tras recargar, es un bug — reportar.

### "Creé un deal con el contacto equivocado"
Edita el deal → cambia el contactId. Si no puedes editarlo, elimina el deal y créalo de nuevo con el contacto correcto.

### "Las métricas del dashboard no cuadran con lo que veo en Pipeline"
El Dashboard usa datos calculados en el momento de la carga. Recarga la página para actualizar. Si aún no cuadran, verifica que no haya deals en stages especiales (Won/Lost) que excluyan del conteo abierto.

---

## 14. Tips avanzados

### Atajos de navegación
- La barra de búsqueda global (Ctrl/Cmd + K desde cualquier página) busca contactos y deals.
- Desde un contacto puedes crear deal, actividad o devolverlo a marketing sin salir del detalle.

### Usar temperatura estratégicamente
- **Cold** = lead nuevo o inactivo. Bajo nurturing.
- **Warm** = mostró interés. Merece seguimiento activo.
- **Hot** = listo para comprar o en conversación activa. Prioridad máxima.
- Actualiza la temperatura después de cada interacción significativa.

### Score como guía, no como regla absoluta
El score es una ayuda, no una sentencia. Un lead con score 45 puede cerrar si el timing es perfecto. Úsalo para priorizar tu tiempo, no para descartar.

### Notas con contexto
Al registrar una nota, incluye siempre:
- Qué se habló
- Cuál es el siguiente paso acordado
- Quién es el decisor real en la empresa

### Sequencias para leads fríos
Los leads con temperatura cold que no responden al outreach manual → meterlos en una Secuencia automatizada de nurturing (Prospecting Engine → Secuencias). Así marketing los trabaja mientras ventas se enfoca en los hot/warm.

### Portal del cliente (Ajustes → Cliente)
Puedes crear un portal personalizado para cada cliente activo donde verán sus métricas, el avance de sus deals y reportes. Configura los widgets que quieres mostrar y envíales el enlace.

### Exportar datos
- Contactos y deals se pueden exportar como CSV desde la API (/api/export?type=contacts o ?type=deals).
- Útil para reportes en Google Sheets o presentaciones.

### Sincronización con Apollo
Si usas Apollo.io para prospección, puedes sincronizar contactos vía **Sincronizar Apollo CSV** (al fondo de la barra lateral).

---

## Glosario rápido

| Término | Significado |
|---------|-------------|
| MQL | Marketing Qualified Lead — calificado por marketing |
| SQL | Sales Qualified Lead — calificado por ventas |
| ICP | Ideal Customer Profile — perfil del cliente ideal |
| NBA | Next Best Action — próxima acción recomendada |
| SLA | Service Level Agreement — acuerdo de tiempos entre M+S |
| Handoff | Transferencia de un lead de marketing a ventas |
| Pipeline | Embudo de ventas con sus etapas |
| Deal | Oportunidad de venta concreta con valor monetario |
| Score | Puntuación 0-100 de calidad e interés del lead |
| Temperatura | Nivel de interés: cold / warm / hot |
| Retorno | Devolver un lead de ventas a marketing para re-nutrir |
| Health Score M+S | Puntuación de alineación entre los dos equipos |

---

*Última actualización: Mayo 2026 — BlackScale Nexus v1.x*
