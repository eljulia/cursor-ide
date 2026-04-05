# 📊 Análisis Técnico: Sistema de Ratings (1-5 Estrellas)

## 🧩 Problema

Platziflix carece de un mecanismo para que los usuarios expresen su satisfacción con los cursos. Necesitamos agregar un sistema de ratings numérico (1-5 estrellas) que permita registrar valoraciones y mostrar el promedio por curso, respetando la arquitectura Clean Architecture existente y el flujo API → Service → Repository → Database.

---

## ⚡ Impacto Arquitectural

- **Backend**: nueva tabla `ratings`, nuevo modelo SQLAlchemy, nuevos métodos en `CourseService`, dos endpoints nuevos, modificación del endpoint de detalle de curso
- **Frontend**: nuevos tipos TypeScript, dos nuevos componentes React, modificación del componente `CourseDetail` y de la página de detalle
- **Base de datos**: nueva tabla `ratings` con FK a `courses`, índice en `course_id` para optimizar el `AVG()` agrupado

---

## 🏗️ Propuesta de Solución

### Esquema de la nueva tabla

```
ratings
├── id              INTEGER   PK (heredado de BaseModel)
├── course_id       INTEGER   FK → courses.id  NOT NULL  INDEX
├── rating          INTEGER   NOT NULL  CHECK(rating >= 1 AND rating <= 5)
├── created_at      TIMESTAMP (heredado)
├── updated_at      TIMESTAMP (heredado)
└── deleted_at      TIMESTAMP (heredado, soft delete)
```

### Contratos de API

**Nuevo endpoint — Crear rating:**
```
POST /courses/{slug}/ratings
Body:  { "rating": 4 }
Response 201: { "id": 1, "course_id": 1, "rating": 4, "created_at": "..." }
Response 422: rating fuera de rango (1-5)
Response 404: curso no encontrado
```

**Nuevo endpoint — Listar ratings:**
```
GET /courses/{slug}/ratings
Response 200: [{ "id": 1, "course_id": 1, "rating": 4, "created_at": "..." }, ...]
Response 404: curso no encontrado
```

**Modificación de endpoint existente:**
```
GET /courses/{slug}
Response 200 (campos nuevos agregados):
{
  ...campos actuales...,
  "average_rating": 4.5,   ← nuevo (null si no hay ratings)
  "rating_count": 120       ← nuevo
}
```

### Validación en capas (defensa en profundidad)

| Capa | Mecanismo | Descripción |
|---|---|---|
| PostgreSQL | `CHECK(rating >= 1 AND rating <= 5)` | Fuente de verdad absoluta |
| FastAPI/Pydantic | `Field(ge=1, le=5)` | Respuesta temprana antes de tocar la DB |
| React | Guard en `useState` | Evita submit sin selección válida en UI |

---

## 🚀 Plan de Implementación

### FASE 1 — Base de Datos y Modelo ORM

#### Paso 1 — Crear el modelo SQLAlchemy `Rating`

**Archivo a crear**: `Backend/app/models/rating.py`

```python
class Rating(BaseModel):
    __tablename__ = "ratings"

    course_id: Mapped[int]     # FK → courses.id, index=True
    rating: Mapped[int]        # CHECK constraint 1-5
    course: Mapped["Course"]   # relationship, back_populates="ratings"
```

Además, en `Backend/app/models/course.py` agregar la relación inversa:

```python
ratings: Mapped[List["Rating"]]  # back_populates="course", cascade="all, delete-orphan"
```

---

#### Paso 2 — Registrar el modelo en el sistema de migraciones

**Archivos a modificar**:
- `Backend/app/models/__init__.py` — agregar `from .rating import Rating`

> Sin esta importación, Alembic no detecta el modelo al hacer autogenerate.

---

#### Paso 3 — Generar y revisar la migración Alembic

```bash
cd Backend
uv run alembic revision --autogenerate -m "add_ratings_table"
```

**Verificar manualmente en el archivo generado**:
- `op.create_table("ratings", ...)` con todos los campos
- `op.create_index("ix_ratings_course_id", "ratings", ["course_id"])`
- `sa.CheckConstraint("rating >= 1 AND rating <= 5")` — Alembic no siempre lo infiere automáticamente
- `downgrade()` hace `op.drop_table("ratings")` y elimina el índice

---

#### Paso 4 — Aplicar la migración

```bash
uv run alembic upgrade head
```

---

### FASE 2 — Lógica de Negocio

#### Paso 5 — Agregar métodos en `CourseService`

**Archivo a modificar**: `Backend/app/services/course_service.py`

```python
def create_rating(self, course_id: int, rating: int) -> Rating:
    # Valida rango 1-5, crea y persiste Rating
    # Lanza ValueError si fuera de rango
    # Lanza HTTPException 404 si course_id no existe

def get_ratings_by_course(self, course_id: int) -> list[Rating]:
    # Retorna ratings no soft-deleted, ordenados por created_at DESC

def get_average_rating(self, course_id: int) -> dict:
    # Usa func.avg() y func.count() — NO cargar en memoria
    # Retorna {"average": float | None, "count": int}
```

> `get_average_rating` debe usar SQL (`func.avg()`, `func.count()`) directamente, nunca cargar todos los registros en memoria para calcular en Python.

---

### FASE 3 — API Endpoints

#### Paso 6 — Definir schemas Pydantic

**Archivo a modificar/crear**: `Backend/app/main.py` o nuevo `Backend/app/schemas.py`

```python
class RatingCreate(BaseModel):
    rating: int  # Field(ge=1, le=5)

class RatingResponse(BaseModel):
    id: int
    course_id: int
    rating: int
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2

class CourseRatingSummary(BaseModel):
    average_rating: float | None
    rating_count: int
```

---

#### Paso 7 — Agregar endpoints y modificar el existente

**Archivo a modificar**: `Backend/app/main.py`

```python
@app.post("/courses/{slug}/ratings", response_model=RatingResponse, status_code=201)
async def create_course_rating(slug: str, rating_data: RatingCreate, ...): ...

@app.get("/courses/{slug}/ratings", response_model=list[RatingResponse])
async def get_course_ratings(slug: str, ...): ...
```

`GET /courses/{slug}` — extender el schema de respuesta con:
```python
average_rating: float | None = None
rating_count: int = 0
```

---

### FASE 4 — Tests del Backend

#### Paso 8 — Actualizar `app/test_main.py`

```python
def test_create_rating_valid()         # POST válido → 201
def test_create_rating_invalid_range() # rating=6 → 422
def test_create_rating_course_not_found() # slug inválido → 404
def test_get_course_ratings()          # GET lista → 200
def test_get_course_detail_includes_rating_summary() # average_rating y rating_count en respuesta
```

Seguir el patrón existente: `TestClient` + `dependency_overrides` para mockear `CourseService`.

---

### FASE 5 — Frontend: Tipos y Componentes Base

#### Paso 9 — Actualizar tipos TypeScript

**Archivo a modificar**: `Frontend/src/types/index.ts`

```typescript
interface Rating {
  id: number;
  course_id: number;
  rating: number;       // 1-5
  created_at: string;   // ISO 8601
}

// Modificar CourseDetail — agregar:
average_rating: number | null;
rating_count: number;
```

---

#### Paso 10 — Crear `StarRating` (display, Server Component)

**Archivo a crear**: `Frontend/src/components/StarRating/StarRating.tsx`

```typescript
interface StarRatingProps {
  rating: number | null;  // promedio (ej: 3.7)
  count: number;
  maxStars?: number;      // default 5
}
```

- Renderiza estrellas llenas/vacías según el promedio
- Muestra el número con 1 decimal y el conteo entre paréntesis
- Con `rating=null` muestra "Sin valoraciones"

**Test**: `Frontend/src/components/StarRating/StarRating.test.tsx`

---

#### Paso 11 — Crear `RatingForm` (Client Component — `"use client"`)

**Archivo a crear**: `Frontend/src/components/RatingForm/RatingForm.tsx`

```typescript
interface RatingFormProps {
  courseSlug: string;
  onRatingSubmitted?: (newRating: Rating) => void;
}
```

Estado interno:
```typescript
const [selectedRating, setSelectedRating] = useState<number | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
const [submitted, setSubmitted] = useState(false);
```

Flujo de submit:
1. Validar `selectedRating !== null`
2. `fetch("http://localhost:8000/courses/{slug}/ratings", { method: "POST" })`
3. Éxito → `setSubmitted(true)`, llamar `onRatingSubmitted`
4. Error → `setError("mensaje descriptivo")`

**Test**: `Frontend/src/components/RatingForm/RatingForm.test.tsx`

---

### FASE 6 — Frontend: Integración

#### Paso 12 — Modificar `CourseDetail`

**Archivo a modificar**: `Frontend/src/components/CourseDetail/CourseDetail.tsx`

- Agregar `<StarRating rating={course.average_rating} count={course.rating_count} />` en el header
- Agregar `<RatingForm courseSlug={course.slug} />` al final del componente

> `CourseDetail` puede seguir siendo Server Component. `RatingForm` tiene su propio `"use client"` — Next.js maneja la frontera automáticamente.

---

#### Paso 13 — Verificar la page de detalle

**Archivo a revisar**: `Frontend/src/app/course/[slug]/page.tsx`

Confirmar que el tipo del resultado del fetch incluya `average_rating` y `rating_count`. Si hay un cast manual (`as CourseDetail`), actualizarlo — no debería requerir cambios de lógica.

---

## 📐 Diagrama de Flujo

```
[Usuario] → RatingForm → POST /courses/{slug}/ratings
                               ↓
                          CourseService.create_rating()
                               ↓
                          ratings table (PostgreSQL)

[Página del curso] ← GET /courses/{slug}
                          ↓ (incluye average_rating + rating_count)
                     CourseDetail
                          ├── StarRating (display del promedio)
                          └── RatingForm (submit de nuevo rating)
```

---

## 🔢 Orden de Dependencias

```
Paso 1 (Modelo Rating)
  └─ Paso 2 (Registrar en __init__)
       └─ Paso 3 (Generar migración)
            └─ Paso 4 (Aplicar migración)
                 └─ Paso 5 (CourseService métodos)
                      └─ Paso 6 (Schemas Pydantic) ──┐
                           └─ Paso 7 (Endpoints)     │ contrato definido
                                └─ Paso 8 (Tests)    │
                                                      ▼
                                          Paso 9 (Tipos TS)
                                               └─ Paso 10 (StarRating)
                                                    └─ Paso 11 (RatingForm)
                                                         └─ Paso 12 (CourseDetail)
                                                              └─ Paso 13 (Verificar page)
```

---

## ⚠️ Decisiones de Diseño y Restricciones Actuales

| Decisión | Detalle |
|---|---|
| Sin autenticación | No se puede restringir duplicados por usuario; se implementará cuando exista auth |
| Rating solo numérico | Sin campo de texto/review para mantener el scope acotado |
| Múltiples ratings permitidos | Sin unique constraint por ahora; agregar `(course_id, user_id)` cuando haya usuarios |
| Promedio calculado en DB | `func.avg()` en SQL, no en Python — escalable a millones de ratings |
| Soft delete respetado | `get_average_rating` filtra `deleted_at IS NULL` explícitamente |

---

## 🔮 Consideraciones de Escalabilidad Futura

- **Auth**: agregar `user_id` como columna nullable + unique constraint `(course_id, user_id)` en una nueva migración — el modelo ya está preparado
- **Caching**: el promedio puede cachearse con Redis si el volumen de lecturas es alto
- **Paginación**: `GET /courses/{slug}/ratings` deberá paginar cuando haya muchos ratings
