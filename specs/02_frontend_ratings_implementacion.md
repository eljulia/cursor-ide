# Plan de Implementación: Sistema de Ratings — Frontend

## Contexto arquitectónico

Observaciones críticas del código existente que condicionan las decisiones:

1. **Todos los componentes actuales son Server Components** (sin `"use client"`). `CourseDetailComponent` recibe datos como props desde `page.tsx`, que hace el fetch en el servidor.
2. **`CourseDetail` en `types/index.ts`** extiende `Course` y actualmente solo agrega `description` y `classes`. No tiene campos de ratings.
3. **`page.tsx`** tipea la respuesta directamente como `CourseDetail`. TypeScript dará error hasta que el tipo sea actualizado.
4. **Patrón de testing:** Vitest + React Testing Library. Server Components sincrónicos se testean con `render()`. Server Components asíncronos con `renderToString()` y mocks de `fetch` vía `vi.fn()`.
5. **SCSS modules:** patrón `ComponentName.module.scss` co-ubicados con el componente, importando `vars.scss` con `@import '../../styles/vars.scss'`.

---

## FASE 1 — Tipos TypeScript

### Paso 1.1 — Modificar `Frontend/src/types/index.ts`

- Agregar interfaz `Rating`: campos `id` (number), `course_id` (number), `rating` (number, 1-5), `created_at` (string ISO 8601).
- Extender `CourseDetail` con `average_rating: number | null` y `rating_count: number`.
- **Dependencias:** ninguna. Todos los pasos siguientes dependen de este.
- **Riesgo:** usar `string` (no `Date`) para `created_at` — FastAPI con Pydantic serializa fechas como strings ISO por defecto; `Date` causaría problemas de hidratación.
- **Riesgo:** `rating_count` como `number` (no `number | null`) implica que el backend siempre enviará el campo, al menos con valor `0`.

---

## FASE 2 — Componente StarRating (Server Component)

### Paso 2.1 — Crear `Frontend/src/components/StarRating/StarRating.tsx`

- Crear directorio `StarRating/` y el archivo del componente.
- **Sin `"use client"`** — es un componente de solo visualización.
- Props: `rating: number | null`, `count: number`, `maxStars?: number` (default 5).
- Lógica: calcular estrellas llenas vs vacías con redondeo al entero más cercano.
- Cuando `rating !== null`: mostrar estrellas + número con `toFixed(1)` + conteo entre paréntesis.
- Cuando `rating === null`: mostrar literal "Sin valoraciones".
- Implementar estrellas con caracteres Unicode ★/☆ (sin dependencias externas, consistente con la complejidad actual del proyecto).
- **Dependencias:** Paso 1.1.

### Paso 2.2 — Crear `Frontend/src/components/StarRating/StarRating.module.scss`

- Importar con `@import '../../styles/vars.scss'` (misma profundidad que `CourseDetail/`).
- Clases para: contenedor de estrellas, estrella llena, estrella vacía, texto de puntuación, mensaje "Sin valoraciones".
- **Dependencias:** Paso 2.1.

### Paso 2.3 — Crear `Frontend/src/components/StarRating/__test__/StarRating.test.tsx`

- Seguir el patrón de `Course/__test__/Course.test.tsx`.
- Usar `render()` directo (Server Component síncrono, sin mocks de fetch).
- Casos de test:
  1. Muestra "Sin valoraciones" cuando `rating` es `null`.
  2. Muestra el número correcto de estrellas llenas para un rating dado.
  3. Muestra el valor con 1 decimal.
  4. Muestra el conteo entre paréntesis.
  5. Respeta el valor de `maxStars` si se provee.
- **Dependencias:** Pasos 2.1 y 2.2.

---

## FASE 3 — Componente RatingForm (Client Component)

### Paso 3.1 — Crear `Frontend/src/components/RatingForm/RatingForm.tsx`

- Crear directorio `RatingForm/` y el archivo del componente.
- **`"use client"` como primera línea**, antes de cualquier import — obligatorio por uso de `useState` y `fetch`.
- Props: `courseSlug: string`, `onRatingSubmitted?: () => void`.
- Estados internos con `useState`:
  - `selectedRating: number | null` — estrella seleccionada, null si no hay selección.
  - `isSubmitting: boolean` — bloquea el formulario durante el POST.
  - `error: string | null` — mensaje de error para mostrar al usuario.
  - `submitted: boolean` — muestra confirmación post-envío.
- Flujo de submit:
  1. Guard: `selectedRating !== null`, si no no hacer nada.
  2. `fetch` POST a `http://localhost:8000/courses/${courseSlug}/ratings` con body `{ rating: selectedRating }`.
  3. Éxito → `setSubmitted(true)`, llamar `onRatingSubmitted?.()`.
  4. Error → `setError("mensaje descriptivo")`.
- UI: 5 estrellas clickeables, botón deshabilitado si sin selección o `isSubmitting`, mensaje de error, mensaje de éxito.
- **Dependencias:** Paso 1.1.
- **Restricción crítica:** `onRatingSubmitted` **no puede pasarse desde `CourseDetailComponent`** (Server Component) porque las funciones no son serializables. El prop debe omitirse en la integración. Solo es usable si `RatingForm` se consume desde otro Client Component.
- **Riesgo:** URL hardcodeada `http://localhost:8000` — consistente con el patrón actual del proyecto (`page.tsx` usa la misma URL).

### Paso 3.2 — Crear `Frontend/src/components/RatingForm/RatingForm.module.scss`

- Importar con `@import '../../styles/vars.scss'`.
- Clases para: contenedor del formulario, estrellas interactivas (estados hover y selected), botón de envío, mensaje de error, mensaje de confirmación.
- **Consideración de diseño:** el efecto hover acumulativo en estrellas (relleno de izquierda a cursor) se implementa con el selector CSS `~` usando orden DOM inverso y `flex-direction: row-reverse`. Esta decisión afecta el HTML generado y debe tomarse antes de escribir los tests.
- **Dependencias:** Paso 3.1.

### Paso 3.3 — Crear `Frontend/src/components/RatingForm/__test__/RatingForm.test.tsx`

- Seguir el patrón de `VideoPlayer.test.tsx` para componentes con estado e interacciones.
- Mock de `global.fetch` con `vi.fn()` (igual que en `page.test.tsx`).
- Usar `waitFor` o queries `findBy*` para estados asíncronos post-submit.
- Casos de test:
  1. Renderiza 5 estrellas interactivas inicialmente.
  2. El botón está deshabilitado sin rating seleccionado.
  3. Click en una estrella actualiza la selección visual.
  4. Submit llama a `fetch` con el endpoint y body correctos.
  5. Muestra mensaje de éxito tras submit exitoso.
  6. Muestra mensaje de error si el fetch falla.
  7. El botón está deshabilitado durante `isSubmitting`.
- **Dependencias:** Pasos 3.1 y 3.2.
- **Riesgo:** verificar que `@testing-library/user-event` está instalado; si no, usar `fireEvent` de `@testing-library/react` como alternativa.

---

## FASE 4 — Integración en CourseDetail

### Paso 4.1 — Modificar `Frontend/src/components/CourseDetail/CourseDetail.tsx`

- Importar `StarRating` desde `'../StarRating/StarRating'`.
- Importar `RatingForm` desde `'../RatingForm/RatingForm'`.
- Renderizar `<StarRating rating={course.average_rating} count={course.rating_count} />` dentro de `div.courseInfo`, después del bloque `div.stats`.
- Renderizar `<RatingForm courseSlug={course.slug} />` como último hijo de `div.container`, después de `div.classesSection`.
- **No pasar `onRatingSubmitted`** — `CourseDetailComponent` es Server Component y no puede serializar funciones.
- **Dependencias:** Pasos 2.1, 3.1 y 1.1 completos.
- **Nota arquitectónica:** importar un Client Component (`RatingForm`) dentro de un Server Component crea automáticamente una "client boundary" en Next.js App Router — es el patrón estándar y no requiere configuración adicional.

### Paso 4.2 — Modificar `Frontend/src/components/CourseDetail/CourseDetail.module.scss`

- Agregar clases de espaciado para los nuevos elementos (ej. `.ratingSection` con `margin-top`).
- **Dependencias:** Paso 4.1.

---

## FASE 5 — Verificación de page.tsx

### Paso 5.1 — Verificar `Frontend/src/app/course/[slug]/page.tsx`

- **Sin cambios de código** — solo verificación.
- Después del Paso 1.1, `CourseDetail` ya incluye `average_rating` y `rating_count`. TypeScript no generará errores de compilación porque `response.json()` retorna `any` implícitamente.
- **Riesgo runtime:** si el backend aún no envía los campos, `StarRating` recibirá `undefined`. El componente debe manejar `rating == null` (con `==` que cubre `undefined`) en lugar de `rating === null` estrictamente.

---

## Resumen de archivos afectados

| Archivo | Acción | Fase |
|---------|--------|------|
| `Frontend/src/types/index.ts` | Modificar | 1 |
| `Frontend/src/components/StarRating/StarRating.tsx` | Crear | 2 |
| `Frontend/src/components/StarRating/StarRating.module.scss` | Crear | 2 |
| `Frontend/src/components/StarRating/__test__/StarRating.test.tsx` | Crear | 2 |
| `Frontend/src/components/RatingForm/RatingForm.tsx` | Crear | 3 |
| `Frontend/src/components/RatingForm/RatingForm.module.scss` | Crear | 3 |
| `Frontend/src/components/RatingForm/__test__/RatingForm.test.tsx` | Crear | 3 |
| `Frontend/src/components/CourseDetail/CourseDetail.tsx` | Modificar | 4 |
| `Frontend/src/components/CourseDetail/CourseDetail.module.scss` | Modificar | 4 |
| `Frontend/src/app/course/[slug]/page.tsx` | Verificar (sin cambios) | 5 |

## Orden de dependencias

```
Paso 1.1 (tipos)
    |
    +---> Fase 2 (StarRating: tsx → scss → test)  ─┐
    |                                               │
    +---> Fase 3 (RatingForm: tsx → scss → test)  ─┤
                                                    │
                                          Fase 4 (integración CourseDetail)
                                                    │
                                          Fase 5 (verificación page.tsx)
```

Las Fases 2 y 3 son paralelas entre sí. Dentro de cada fase, los pasos son secuenciales (tsx → scss → test).
