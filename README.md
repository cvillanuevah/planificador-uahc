# Planificador de Asignaturas — UAHC

Herramienta interna para planificar horarios semanales de la carrera de **Ingeniería Civil Industrial** de la Universidad Academia de Humanismo Cristiano (UAHC).

---

## Características

- **Dashboard** con progreso general, distribución semanal y alertas de conflictos
- **Planificación visual** con grilla semanal interactiva — clic para asignar/quitar bloques
- **Detección automática de conflictos** de horario entre asignaturas del mismo semestre de malla
- **Gestión de profesores** con disponibilidad horaria configurable
- **Malla curricular** organizada por línea de formación (Especialidad, Interdisciplinar, General, Básica)
- **Configuración** de salas, bloques protegidos y bloqueos de laboratorio
- Filtros por semestre de malla, asignaturas incompletas y conflictos
- Badge de conflictos en el sidebar visible desde cualquier página

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Estilos | Tailwind CSS v3 |
| Estado/queries | TanStack React Query v5 |
| Backend | FastAPI (Python) |
| Base de datos | SQLite + SQLAlchemy ORM |
| Íconos | Lucide React |

## Estructura del proyecto

```
planificador-asignaturas-uahc/
├── backend/
│   ├── main.py            # FastAPI app + CORS
│   ├── models.py          # Modelos SQLAlchemy
│   ├── schemas.py         # Esquemas Pydantic
│   ├── database.py        # Configuración SQLite
│   ├── seed.py            # Datos iniciales de la malla
│   ├── requirements.txt
│   └── routers/
│       ├── schedule.py    # Asignaciones y bloques horarios
│       ├── professors.py  # Profesores y disponibilidad
│       ├── subjects.py    # Asignaturas
│       ├── semesters.py   # Semestres académicos
│       ├── dashboard.py   # Estadísticas
│       ├── rooms.py       # Salas
│       ├── blocks.py      # Bloques horarios
│       └── config.py      # Bloques protegidos y laboratorio
└── frontend/
    └── src/
        ├── pages/         # Dashboard, Planificacion, Profesores, etc.
        ├── components/    # Layout, Sidebar, Modal
        ├── api/           # Cliente HTTP (Axios)
        └── types/         # Tipos TypeScript
```

## Instalación local

### Requisitos previos

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
python seed.py                  # Carga malla curricular inicial
uvicorn main:app --reload --port 8001
```

El backend queda disponible en `http://localhost:8001`.  
Documentación automática en `http://localhost:8001/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

> También puedes usar los scripts `start-backend.bat` y `start-frontend.bat` en Windows.

## API principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/schedule/{sem_id}/assignments` | Asignaciones del semestre |
| POST | `/schedule/assignments` | Crear asignación |
| POST | `/schedule/blocks` | Asignar bloque horario |
| GET | `/schedule/assignments/{id}/available-blocks` | Bloques disponibles |
| GET | `/schedule/{sem_id}/conflicts` | Conflictos de horario |
| GET | `/dashboard/{sem_id}` | Estadísticas del semestre |
| GET | `/professors/` | Listado de profesores |
| GET | `/semesters/` | Semestres académicos |

## Lógica de negocio destacada

- Un **bloque** no puede asignarse si otra asignatura del **mismo semestre de malla** ya ocupa ese slot (conflicto curricular)
- Los bloques **protegidos** bloquean toda la institución (ej: reuniones de facultad)
- Los **bloqueos de laboratorio** aplican solo a asignaturas con modalidad `lab` o `mix`
- La **disponibilidad del profesor** solo restringe si el profesor tiene al menos un slot configurado; si no tiene ninguno, se asume disponible siempre

## Licencia

Uso interno — Universidad Academia de Humanismo Cristiano · Ingeniería Civil Industrial.
