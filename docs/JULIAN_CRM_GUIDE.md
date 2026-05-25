# BlackScale Nexus — Guía del Módulo de Marketing para Julian

> Guía completa para dominar el módulo de Marketing del CRM.
> Enfocada 100% en marketing: cómo nutrir leads, gestionar campañas, calificar audiencia,
> hacer handoff a ventas y medir el impacto real en revenue.

---

## Tabla de contenidos

1. [Cómo entrar al módulo de Marketing](#1-cómo-entrar)
2. [Mapa del módulo — qué hace cada sección](#2-mapa-del-módulo)
3. [Conceptos que debes dominar](#3-conceptos-clave)
4. [Engagement Board — tu pantalla de inicio](#4-engagement-board)
5. [Campañas](#5-campañas)
6. [Contactos de marketing](#6-contactos)
7. [Handoff Center — el corazón del trabajo M+S](#7-handoff-center)
8. [Re-engagement Queue](#8-re-engagement-queue)
9. [Audience Intelligence (Segment Health, ICP, Smart Segments, Funnel)](#9-audience-intelligence)
10. [Pipeline Visibility (Vista Pipeline, Lead Velocity)](#10-pipeline-visibility)
11. [Performance 360 (Analytics, Intelligence)](#11-performance-360)
12. [Content & Planning (Calendario, ABM)](#12-content--planning)
13. [Reportes (Forecast, Atribución Multi-Touch, Digest, ROI, Exportar)](#13-reportes)
14. [Integraciones](#14-integraciones)
15. [Flujos de trabajo diarios de marketing](#15-flujos-diarios)
16. [Tips para sacarle el máximo](#16-tips)
17. [Glosario de marketing](#17-glosario)

---

## 1. Cómo entrar

- En la barra lateral principal del CRM, clic en **Marketing**.
- Esto abre el módulo de marketing con su propia barra lateral interna a la izquierda.
- El módulo tiene su propia apariencia (tema configurable independiente del resto del CRM).

---

## 2. Mapa del módulo

La barra lateral interna de Marketing se organiza en grupos:

```
Marketing
├── (Principal)
│   ├── Engagement Board     ← Inicio: estado de la audiencia
│   ├── Campañas             ← Crear y medir campañas
│   ├── Contactos            ← Base de leads de marketing
│   ├── Atribución           ← Qué canal genera resultados
│   ├── Handoff Center       ← Pasar leads listos a ventas  [badge: # listos]
│   └── Re-engagement        ← Leads devueltos por ventas
│
├── Audience Intelligence
│   ├── Segment Health       ← Salud de cada segmento
│   ├── ICP Insights         ← Qué tan cerca del cliente ideal
│   ├── Smart Segments       ← Constructor de segmentos
│   └── Funnel               ← Embudo de marketing
│
├── Pipeline Visibility
│   ├── Vista Pipeline       ← Ver el pipeline de ventas (solo lectura)
│   └── Lead Velocity        ← Velocidad de avance de leads
│
├── Performance 360
│   ├── Analytics            ← Métricas de desempeño
│   └── Intelligence         ← Insights automáticos
│
├── Content & Planning
│   ├── Calendario           ← Calendario de contenido/campañas
│   └── ABM Board            ← Account-Based Marketing
│
├── Reportes
│   ├── Forecast             ← Proyección 30/60/90 días
│   ├── Atrib. Multi-Touch   ← Atribución por 5 modelos
│   ├── Digest Semanal       ← Resumen por email
│   ├── ROI                  ← Retorno de inversión por campaña
│   └── Exportar             ← Exportar datos
│
└── Integraciones           ← Conexión con Google Workspace, Apollo y otros
```

---

## 3. Conceptos clave

Antes de operar, domina estos términos — son la base de todo el módulo:

### Engagement Status (estado de engagement)
Cada contacto tiene uno de estos cuatro estados según su interacción con tus emails:
| Estado | Qué significa | Qué hacer |
|--------|---------------|-----------|
| **hot** | Abre y hace clic activamente | Considerar handoff a ventas |
| **warm** | Interactúa de vez en cuando | Seguir nutriendo |
| **cold** | Casi no interactúa | Campaña de reactivación |
| **dead** | No interactúa hace mucho / rebotó | Limpiar o re-engagement agresivo |

### Score
Puntuación 0–100 de qué tan calificado está el lead. Combina engagement, fuente, industry y fit con el ICP.

### Tier
Nivel de prioridad del contacto (1 = máxima prioridad). Útil para segmentar esfuerzos.

### readyForSales / passedToSalesAt
- **readyForSales**: bandera que indica que el lead está listo para ventas (MQL).
- **passedToSalesAt**: fecha en que se hizo el handoff. Si está vacío, aún no se ha pasado.

### MQL vs SQL
- **MQL** (Marketing Qualified Lead): marketing lo califica como listo.
- **SQL** (Sales Qualified Lead): ventas confirma que vale la pena trabajarlo.
- Tu trabajo en marketing es producir MQLs de calidad que ventas acepte como SQLs.

### Engagement local
El engagement (aperturas, clics, status hot/warm/cold) se calcula de forma nativa en el CRM a partir del correo enviado por BlackScale — sin depender de plataformas externas.

---

## 4. Engagement Board

**Tu pantalla de inicio en marketing.** Muestra el estado vivo de toda la audiencia.

Qué ves:
- Distribución de contactos por engagement status (hot/warm/cold/dead)
- Quién está más activo (aperturas, clics)
- Acciones sugeridas según el comportamiento

Cómo usarlo:
1. Al empezar el día, mira cuántos contactos están **hot** — son candidatos a handoff.
2. Revisa cuántos cayeron a **cold/dead** — necesitan re-engagement.
3. Cada contacto muestra su `engagementStatus` como etiqueta. Clic para ver el detalle completo (fuente, industry, aperturas, clics, notas de marketing).

---

## 5. Campañas

Sección **Campañas** (Campaign Wall).

### Qué es una campaña
Un esfuerzo de nutrición con: nombre, segmento objetivo, tipo de cadencia, canal, fechas y métricas.

### Métricas por campaña
| Métrica | Qué mide |
|---------|----------|
| Open rate | % que abrió los emails |
| Click rate | % que hizo clic |
| Reply rate | % que respondió |
| Total contacts | Cuántos contactos recibieron |
| Conversions | Cuántos convirtieron (handoff/deal) |

### Cómo trabajar campañas
1. Crear campaña → definir segmento objetivo, canal y cadencia.
2. Monitorear open/click/reply rate. Si el open rate es bajo (<15%), revisa el asunto/copy.
4. Lo importante no es el open rate — es **cuántas conversiones (handoffs y deals)** genera. Una campaña con 20% open pero 5 handoffs vale más que una con 50% open y 0 handoffs.

---

## 6. Contactos

Sección **Contactos** — la base de leads vista desde marketing.

Campos de marketing relevantes en cada contacto:
- **engagementStatus**, **score**, **tier**, **temperature**
- **emailOpens**, **emailClicks** — comportamiento de email
- **source** y **leadSourceDetail** — de dónde vino
- **industry**, **jobTitle**, **companySize**, **location** — datos de firmografía
- **emailVerified / emailBounced / emailUnsubscribed** — salud del email
- **marketingNotes** — tus notas internas
- **readyForSales** — si ya está marcado para handoff

### Higiene de datos (crítico para marketing)
- **emailBounced = true** → el email no sirve, no lo cuentes en métricas de envío.
- **emailUnsubscribed = true** → NO le envíes más, es legal y de reputación.
- **emailVerified = false** → verifica antes de incluirlo en campañas grandes.

Mantén la lista limpia: una base con muchos bounces/unsubscribes daña la reputación de envío de TODOS tus emails.

---

## 7. Handoff Center

**La sección más importante para la alineación M+S.** Aquí pasas leads calificados a ventas.

El badge junto a "Handoff Center" en la barra muestra cuántos leads están listos (`readyForSales`).

### Cómo hacer un handoff
1. Entra a **Handoff Center**.
2. Verás los contactos marcados como listos para ventas.
3. Revisa que cada uno cumpla el criterio del SLA (score, engagement, fit).
4. Confirma el handoff — esto setea `passedToSalesAt` y el lead pasa al pipeline de ventas como MQL.

### Regla del SLA
- Existe un **SLA (acuerdo de nivel de servicio)** entre Marketing y Ventas. Define cuántas horas tiene ventas para contactar un MQL (por defecto 24h).
- Tu responsabilidad: solo pasar MQLs que **realmente** cumplan el ICP. Si pasas basura, ventas la devuelve y baja el Health Score M+S.
- Puedes ver el SLA vigente en el **Command Center** del CRM (banner superior).

### Qué hace un buen handoff
- El lead tiene engagement hot o warm
- Score suficiente (revisa el umbral del SLA)
- Email verificado y datos de firmografía completos
- Una nota de marketing que le da contexto a ventas (qué le interesó, de qué campaña vino)

---

## 8. Re-engagement Queue

Sección **Re-engagement**. Aquí caen los leads que **ventas devolvió a marketing**.

### Por qué un lead vuelve
Ventas devuelve un lead cuando no está listo para cerrar. Las razones típicas:
- No es buen fit
- Mal timing
- Necesita educación
- Duplicado
- Sin presupuesto

### Qué hacer con ellos
1. Lee la **razón de retorno** — te dice por qué no cerró.
2. Según la razón, decide la estrategia:
   - *Mal timing* → nurturing de largo plazo, recontactar en X meses
   - *Necesita educación* → secuencia de contenido educativo
   - *Sin presupuesto* → nurturing hasta que el presupuesto se libere
   - *No es buen fit* → considerar sacarlo del nurturing activo
3. Re-asigna a una campaña de re-engagement.

### Aprende del patrón
Si muchos leads vuelven con la misma razón (ej. "no es buen fit"), tu segmentación o targeting está mal. Ajústalo. Los motivos de retorno también se ven agregados en el **Command Center**.

---

## 9. Audience Intelligence

### Segment Health
Salud de cada segmento de tu audiencia:
- **Engagement rate** del segmento (% hot+warm)
- Cuántos contactos están **dead**
- **Acción sugerida** automática:
  - Engagement <15% → "Revisar copy" (tu mensaje no conecta)
  - Conversión 0% pero engagement >30% → "Revisar handoff" (interactúan pero no pasan a ventas)

Úsalo para diagnosticar dónde está el problema: ¿es el mensaje o es el proceso de handoff?

### ICP Insights / ICP Scorer
Mide qué tan cerca está tu audiencia del **Perfil de Cliente Ideal**:
- Por industry, tamaño de empresa, cargo, ubicación.
- Te dice qué segmentos tienen mejor fit → enfoca presupuesto ahí.

### Smart Segments
Constructor de segmentos dinámicos. Crea un segmento con filtros (engagement, score, fuente, industry) y nómbralo. El segmento se actualiza solo conforme los contactos cambian.

### Funnel
El embudo de marketing: cuántos contactos hay en cada etapa (lead → MQL → SQL → ...). Identifica dónde se atascan los leads.

---

## 10. Pipeline Visibility

### Vista Pipeline
Vista de **solo lectura** del pipeline de ventas. Sirve para que marketing vea qué pasa con los leads que pasó: en qué etapa están, cuáles avanzan, cuáles se estancan. No editas deals desde aquí — solo observas.

### Lead Velocity
Mide la **velocidad** con la que los leads avanzan por las etapas. Un lead velocity alto = tu nurturing está funcionando. Si los leads se mueven lento, hay fricción en algún punto.

---

## 11. Performance 360

### Analytics
Métricas de desempeño del marketing: tendencias de engagement, crecimiento de la base, rendimiento por canal y fuente.

### Intelligence
Insights generados automáticamente. El sistema detecta patrones (ej. "los leads de LinkedIn convierten 3× más que los de eventos") y te los presenta como recomendaciones accionables.

---

## 12. Content & Planning

### Calendario
Calendario de contenido y campañas. Planea cuándo sale cada email/campaña y visualiza el cronograma del mes.

### ABM Board (Account-Based Marketing)
Tablero para trabajar cuentas estratégicas de forma personalizada (no leads individuales, sino empresas objetivo completas). Útil para deals grandes donde varias personas de la misma empresa están involucradas.

---

## 13. Reportes

### Forecast
Proyección de marketing a **30, 60 y 90 días**:
- Basado en tasas históricas de conversión (últimos 180 días).
- Proyecta cuántos leads → MQLs → SQLs → clientes esperas generar.
- Úsalo en planeación mensual para comprometerte con números realistas.

### Atribución Multi-Touch
Distribuye el revenue entre las campañas que tocaron a cada cliente, según 5 modelos:
| Modelo | Lógica | Cuándo usarlo |
|--------|--------|---------------|
| **First touch** | 100% al primer canal | Evaluar canales de adquisición |
| **Last touch** | 100% al último canal | Evaluar canales de cierre |
| **Linear** | Igual entre todos los toques | Vista balanceada |
| **U-shaped** | 40% primer toque, 40% handoff, 20% resto | Referencia principal |
| **W-shaped** | 30% primer toque, 30% MQL, 30% cierre, 10% resto | Ciclos largos B2B |

**Recomendación:** usa **U-shaped** como tu modelo principal. Compara con first-touch para ver qué canales atraen, y con last-touch para ver qué canales cierran.

### Digest Semanal
Resumen automático por email del desempeño de marketing de la semana. Configúralo para recibirlo o enviárselo al equipo.

### ROI
Retorno de inversión por campaña: cuánto costó vs cuánto revenue atribuido generó. La métrica que justifica tu presupuesto.

### Exportar
Exporta contactos y datos de marketing a CSV para reportes externos o análisis en hojas de cálculo.

---

## 14. Integraciones

- Conecta el CRM con **Google Workspace** (Calendar + Gmail) para sincronizar el calendario y enviar secuencias de email desde tu bandeja.
- **Apollo** para enriquecimiento e importación de leads.
- **Google Analytics 4** y **Search Console** para métricas de tráfico.
- Desde aquí gestionas cada conexión y su estado.

---

## 15. Flujos diarios

### Inicio del día (10 min)
1. **Engagement Board** → ¿cuántos contactos están hot hoy? Son candidatos a handoff.
2. **Handoff Center** → revisa el badge. Si hay leads listos, califícalos y pásalos a ventas (cumpliendo el SLA).
3. **Re-engagement** → ¿ventas devolvió algo? Lee las razones y re-asígnalos.

### Gestión de campañas (semanal)
1. **Campañas** → revisa open/click/reply de las campañas activas.
2. **Segment Health** → ¿qué segmentos están sanos y cuáles muriendo?
3. Ajusta copy o segmentación según las acciones sugeridas.

### Cierre de mes
1. **Forecast** → ¿el pipeline de marketing cubre el objetivo del próximo mes?
2. **Atribución Multi-Touch** + **ROI** → qué campañas y canales valieron la pena.
3. **Funnel** → dónde se atascaron leads para mejorar el mes siguiente.
4. Limpia la base: revisa bounces, unsubscribes y contactos dead.

### Alineación con ventas (semanal, vía Command Center)
1. Abre el **Command Center** del CRM.
2. Revisa el **Health Score M+S** — tu objetivo es mantenerlo sobre 65.
3. Revisa **motivos de retorno** — ¿qué tipo de leads te está rebotando ventas?
4. Ajusta tu criterio de handoff para subir la tasa de aceptación.

---

## 16. Tips

### La calidad del handoff es tu reputación
Un handoff de basura le cuesta tiempo a ventas y baja el Health Score. **Es mejor pasar 5 MQLs excelentes que 20 mediocres.** Ventas confiará en tus handoffs y los trabajará rápido.

### Open rate no es el objetivo
El open rate mide si tu asunto funciona, no si el negocio crece. Optimiza para **conversiones (handoffs y deals atribuidos)**, no para vanity metrics.

### Usa los motivos de retorno como brújula
Cada lead devuelto es feedback gratis sobre tu targeting. Si el 40% vuelve por "no es buen fit", tu ICP o tu segmentación necesita ajuste urgente.

### Segmenta antes de enviar
Nunca envíes la misma campaña a toda la base. Usa **Smart Segments** para crear segmentos por engagement + industry + score, y personaliza el mensaje. Un segmento de 50 hot vale más que un blast de 5000.

### Re-engagement antes de descartar
Un lead cold no está muerto. Antes de sacarlo, méltelo en una campaña de re-engagement con un ángulo distinto. Muchos "muertos" reviven con el mensaje correcto.

### Notas de marketing = contexto para ventas
Cuando hagas handoff, deja una **marketingNote** con: de qué campaña vino, qué contenido le interesó, y cualquier señal de intención. Ventas cierra más rápido cuando tiene contexto.

### Mira el Lead Velocity, no solo el volumen
Generar muchos leads que avanzan lento es peor que pocos que avanzan rápido. Lead Velocity te dice si tu nurturing realmente mueve la aguja.

### ABM para los peces gordos
Para cuentas objetivo grandes, usa el **ABM Board** en lugar de tratarlas como leads sueltos. Coordina toques a varios contactos de la misma empresa.

---

## 17. Glosario de marketing

| Término | Significado |
|---------|-------------|
| MQL | Marketing Qualified Lead — lead calificado por marketing |
| SQL | Sales Qualified Lead — lead aceptado por ventas |
| ICP | Ideal Customer Profile — perfil de cliente ideal |
| Engagement status | hot / warm / cold / dead según interacción con emails |
| Handoff | Transferir un lead calificado de marketing a ventas |
| Nurturing | Nutrir un lead con contenido hasta que esté listo |
| Re-engagement | Reactivar leads fríos o devueltos |
| Open rate | % de emails abiertos |
| Click rate | % de clics sobre emails enviados |
| Reply rate | % de respuestas |
| Bounce | Email que no se pudo entregar |
| Unsubscribe | Contacto que se dio de baja — no enviar más |
| Atribución | Asignar crédito de revenue a las campañas/canales |
| Lead velocity | Velocidad con que los leads avanzan por el funnel |
| Tier | Nivel de prioridad del contacto (1 = máxima) |
| Score | Puntuación 0-100 de calificación del lead |
| SLA | Acuerdo de tiempos de respuesta entre M+S |
| ABM | Account-Based Marketing — marketing por cuenta |
| Health Score M+S | Puntuación de alineación marketing-ventas |

---

*Última actualización: Mayo 2026 — BlackScale Nexus · Módulo de Marketing*
