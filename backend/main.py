from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
import models
from seed import seed_initial_data

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Planificador de Asignaturas UAHC", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
]

import os
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    ALLOWED_ORIGINS.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()


from routers import blocks, rooms, professors, subjects, semesters, schedule, config, dashboard

app.include_router(blocks.router,     prefix="/api/blocks",      tags=["Bloques"])
app.include_router(rooms.router,      prefix="/api/rooms",       tags=["Salas"])
app.include_router(professors.router, prefix="/api/professors",  tags=["Profesores"])
app.include_router(subjects.router,   prefix="/api/subjects",    tags=["Asignaturas"])
app.include_router(semesters.router,  prefix="/api/semesters",   tags=["Semestres"])
app.include_router(schedule.router,   prefix="/api/schedule",    tags=["Planificación"])
app.include_router(config.router,     prefix="/api/config",      tags=["Configuración"])
app.include_router(dashboard.router,  prefix="/api/dashboard",   tags=["Dashboard"])


@app.get("/")
def root():
    return {"status": "ok", "app": "Planificador de Asignaturas UAHC"}
