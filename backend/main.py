import os
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

# Capture import errors so the app can still start
_import_error = None
try:
    from database import engine, SessionLocal
    import models
    from seed import seed_initial_data
    from routers import blocks, rooms, professors, subjects, semesters, schedule, config, dashboard
    _routers_ok = True
except Exception as e:
    _import_error = traceback.format_exc()
    _routers_ok = False
    print("IMPORT ERROR:", _import_error, flush=True)

app = FastAPI(title="Planificador de Asignaturas UAHC", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "https://cvillanuevah.github.io",
]
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

_startup_error = None

@app.on_event("startup")
async def startup():
    global _startup_error
    if not _routers_ok:
        return
    try:
        models.Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()
    except Exception as e:
        _startup_error = traceback.format_exc()
        print("STARTUP ERROR:", _startup_error, flush=True)


if _routers_ok:
    app.include_router(blocks.router,     prefix="/api/blocks",      tags=["Bloques"])
    app.include_router(rooms.router,      prefix="/api/rooms",       tags=["Salas"])
    app.include_router(professors.router, prefix="/api/professors",  tags=["Profesores"])
    app.include_router(subjects.router,   prefix="/api/subjects",    tags=["Asignaturas"])
    app.include_router(semesters.router,  prefix="/api/semesters",   tags=["Semestres"])
    app.include_router(schedule.router,   prefix="/api/schedule",    tags=["Planificación"])
    app.include_router(config.router,     prefix="/api/config",      tags=["Configuración"])
    app.include_router(dashboard.router,  prefix="/api/dashboard",   tags=["Dashboard"])


@app.get("/health")
def health():
    return {"status": "ok"}



# Serve React frontend if static/dist exists (Databricks App mode)
_static_dir = Path(__file__).parent / "static"
if _static_dir.exists():
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index = _static_dir / "index.html"
        return FileResponse(str(index))
else:
    @app.get("/")
    def root():
        return {"status": "ok", "app": "Planificador de Asignaturas UAHC"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("DATABRICKS_APP_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
