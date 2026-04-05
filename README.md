# Platziflix

> Plataforma de cursos online estilo Netflix — proyecto full-stack construido con las tecnologias mas modernas del mercado.

---

## Stack Tecnologico

### Backend
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

### Frontend
![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![SASS](https://img.shields.io/badge/SASS-CC6699?style=for-the-badge&logo=sass&logoColor=white)

### Mobile
![Swift](https://img.shields.io/badge/Swift-FA7343?style=for-the-badge&logo=swift&logoColor=white)
![SwiftUI](https://img.shields.io/badge/SwiftUI-0D96F6?style=for-the-badge&logo=swift&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)
![Jetpack Compose](https://img.shields.io/badge/Jetpack_Compose-4285F4?style=for-the-badge&logo=jetpackcompose&logoColor=white)

---

## Estructura del Proyecto

```
platziflix/
├── Backend/      # API REST con FastAPI + PostgreSQL
├── Frontend/     # Web App con Next.js 15 + TypeScript
└── Mobile/       # iOS (SwiftUI) + Android (Jetpack Compose)
```

---

## Levantar el proyecto

### Backend

```bash
cd Backend

# Con Docker (recomendado)
docker-compose up --build

# Sin Docker
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API disponible en `http://localhost:8000`

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Web disponible en `http://localhost:3000`

---

## Endpoints principales

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/` | Bienvenida |
| GET | `/health` | Estado del servidor y DB |
| GET | `/courses` | Lista todos los cursos |
| GET | `/courses/{slug}` | Detalle de un curso |

---

## Tests

```bash
# Backend
cd Backend && uv run pytest app/test_main.py

# Frontend
cd Frontend && npm run test
```

---

## Autor

Hecho con dedicacion por **eljulia**
