# Plan de Implementación: Sistema de Ratings — Backend

## Contexto arquitectónico

Observaciones críticas del código existente que condicionan las decisiones:

1. **`test_main.py` tiene tests de "campos exactos"** (`test_course_detail_contract_fields_only`). Al agregar `average_rating` y `rating_count` al detalle del curso, ese test fallará y debe actualizarse.
2. **`CourseService.get_course_by_slug` construye el dict manualmente**. Los campos nuevos se agregan ahí, no en el modelo ORM.
3. **`alembic/env.py` usa `from app.models import *`** para el autogenerado. Basta con importar el nuevo modelo en `__init__.py` para que Alembic lo detecte.

---

## FASE 1 — Modelo de Datos ✅

### Paso 1.1 — Crear `Backend/app/models/rating.py`

- Archivo nuevo.
- Definir clase `Rating` heredando de `BaseModel` (igual que `Course` y `Lesson`).
- Columna `course_id`: `Integer`, `ForeignKey('courses.id')`, `nullable=False`, `index=True`.
- Columna `rating`: `Integer`, `nullable=False`, `CheckConstraint('rating >= 1 AND rating <= 5')`.
- `__tablename__ = 'ratings'`.
- La relación bidireccional con `Course` es opcional; omitirla evita carga lazy no controlada.
- **Dependencias:** ninguna. Es el paso fundacional.

### Paso 1.2 — Modificar `Backend/app/models/__init__.py`

- Agregar `from .rating import Rating`.
- Agregar `'Rating'` a la lista `__all__`.
- **Dependencias:** Paso 1.1.
- **Crítico:** sin este import, `alembic revision --autogenerate` no verá la tabla `ratings`.

---

## FASE 2 — Migración de Base de Datos ✅

### Paso 2.1 — Generar migración con Alembic

- Ejecutar `uv run alembic revision --autogenerate -m "add_ratings_table"`.
- Archivo generado en `Backend/app/alembic/versions/`.
- El `down_revision` debe apuntar a `'d18a08253457'` para encadenar correctamente.
- Verificar manualmente en el archivo generado:
  - `op.create_table("ratings", ...)` con todas las columnas.
  - `op.create_index` para `ix_ratings_id` (patrón BaseModel) e `ix_ratings_course_id`.
  - `sa.CheckConstraint("rating >= 1 AND rating <= 5")` — Alembic no siempre lo infiere.
  - `downgrade()` elimina índices primero y luego la tabla.
- **Dependencias:** Pasos 1.1 y 1.2.
- **Riesgo:** si se corre el autogenerado sin haber importado `Rating` en `__init__.py`, Alembic generará una migración vacía.

### Paso 2.2 — Aplicar la migración

- Ejecutar `uv run alembic upgrade head`.
- **Dependencias:** Paso 2.1.

---

## FASE 3 — Lógica de Negocio

### Paso 3.1 — Modificar `Backend/app/services/course_service.py`

**3.1.a — Agregar imports**

- `from app.models.rating import Rating` junto a los imports de modelos.
- `from sqlalchemy import func` junto al import de `Session`.
- **Dependencias:** Paso 1.1.

**3.1.b — Agregar método `create_rating(self, course_id: int, rating: int)`**

- Guard clause: verificar que el curso existe (query con `deleted_at.is_(None)`). Si no, lanzar `HTTPException(404)`.
- Guard clause: validar rango 1-5 explícitamente con `HTTPException(422)` — necesario para el test `test_create_rating_invalid_range`.
- Crear instancia `Rating`, `db.add()`, `db.commit()`, `db.refresh()`.
- Retornar dict con los datos del rating.

**3.1.c — Agregar método `get_ratings_by_course(self, course_id: int)`**

- Query sobre `Rating` filtrando `course_id` y `deleted_at.is_(None)`.
- Ordenar por `created_at` descendente.
- Retornar lista de dicts.

**3.1.d — Agregar método `get_average_rating(self, course_id: int)`**

- Query con `func.avg(Rating.rating)` y `func.count(Rating.id)` en una sola consulta SQL.
- Filtrar por `course_id` y `deleted_at.is_(None)`.
- Retornar dict con `average_rating` (float redondeado o `None`) y `rating_count` (int).
- **Crítico:** nunca cargar todos los ratings en memoria para calcular en Python.

**3.1.e — Modificar `get_course_by_slug`**

- Después de construir el dict existente, llamar a `self.get_average_rating(course.id)` e incorporar `average_rating` y `rating_count`.
- **Riesgo de regresión:** `test_course_detail_contract_fields_only` fallará — se corrige en Fase 5.

---

## FASE 4 — API Endpoints

### Paso 4.1 — Modificar `Backend/app/main.py`

**4.1.a — Agregar schema Pydantic**

- Definir clase `RatingCreate(BaseModel)` con campo `rating: int = Field(ge=1, le=5)` inline en `main.py` (el proyecto no tiene `schemas.py` separado).

**4.1.b — Agregar `POST /courses/{slug}/ratings`**

- Handler `async def create_course_rating(slug, body, course_service)`.
- Resolver slug a curso para obtener `course_id` (query previa).
- Llamar a `course_service.create_rating(course_id, body.rating)`.
- Retornar `status_code=201`.
- Si slug no existe, retornar 404.

**4.1.c — Agregar `GET /courses/{slug}/ratings`**

- Handler `async def get_course_ratings(slug, course_service)`.
- Resolver slug a curso, llamar a `course_service.get_ratings_by_course(course_id)`.
- Retornar lista con `status_code=200`.
- Si slug no existe, retornar 404.

> **Nota sobre orden de rutas:** los dos nuevos endpoints `/courses/{slug}/ratings` no generan conflicto con `GET /courses/{slug}` porque el sufijo `/ratings` los diferencia. No hay problema de shadowing.

---

## FASE 5 — Tests

### Paso 5.1 — Modificar `Backend/app/test_main.py`

**5.1.a — Actualizar datos mock existentes**

- `MOCK_COURSE_DETAIL`: agregar `average_rating` (ej. `4.5`) y `rating_count` (ej. `10`).
- Agregar constante `MOCK_RATINGS_LIST` con datos de ejemplo.

**5.1.b — Actualizar test de contrato que fallará**

- En `TestContractCompliance.test_course_detail_contract_fields_only`: ampliar `expected_course_fields` para incluir `"average_rating"` y `"rating_count"`.

**5.1.c — Agregar clase `TestRatingsEndpoints`**

- `test_create_rating_valid` — POST con `{"rating": 4}`, mock retorna datos válidos, verifica status 201 y estructura.
- `test_create_rating_invalid_range` — mock lanza `HTTPException(422)`, POST con `{"rating": 6}`, verifica 422.
- `test_create_rating_course_not_found` — mock lanza `HTTPException(404)`, verifica 404.
- `test_get_course_ratings` — mock retorna lista, GET al endpoint, verifica 200 y estructura de lista.
- `test_get_course_detail_includes_rating_summary` — mock retorna `MOCK_COURSE_DETAIL` actualizado, verifica que `average_rating` y `rating_count` estén presentes con tipos correctos.

Todos los tests siguen el patrón existente: `TestClient` + `dependency_overrides` para mockear `CourseService`.

---

## Resumen de archivos y orden de ejecución

| Orden | Archivo | Acción | Estado |
|-------|---------|--------|--------|
| 1 | `Backend/app/models/rating.py` | Crear | ✅ |
| 2 | `Backend/app/models/__init__.py` | Modificar | ✅ |
| 3 | `Backend/app/alembic/versions/<nueva>.py` | Generar + verificar | ✅ |
| 4 | `Backend/app/services/course_service.py` | Modificar (3 métodos nuevos + 1 modificado) | ⬜ |
| 5 | `Backend/app/main.py` | Modificar (schema + 2 endpoints) | ⬜ |
| 6 | `Backend/app/test_main.py` | Modificar (5 tests nuevos + 2 actualizados) | ⬜ |

El orden es estricto: 4 y 5 dependen de 1 y 2; 3 depende de 1 y 2; 6 puede escribirse antes pero solo pasa una vez que 4 y 5 están completos.
