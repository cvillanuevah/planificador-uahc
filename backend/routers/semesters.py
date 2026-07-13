from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter()


def _build_out(sem: models.AcademicSemester) -> dict:
    return {
        "id": sem.id,
        "year": sem.year,
        "period": sem.period,
        "label": sem.label,
        "is_active": sem.is_active,
        "curriculum_semester_numbers": [m.curriculum_semester_number for m in sem.curriculum_mappings],
    }


@router.get("/", response_model=List[schemas.AcademicSemesterOut])
def list_semesters(db: Session = Depends(get_db)):
    sems = db.query(models.AcademicSemester).order_by(models.AcademicSemester.year.desc(), models.AcademicSemester.period.desc()).all()
    return [_build_out(s) for s in sems]


@router.post("/", response_model=schemas.AcademicSemesterOut, status_code=201)
def create_semester(data: schemas.AcademicSemesterCreate, db: Session = Depends(get_db)):
    if db.query(models.AcademicSemester).filter_by(label=data.label).first():
        raise HTTPException(400, f"Ya existe el semestre {data.label}")
    sem = models.AcademicSemester(year=data.year, period=data.period, label=data.label)
    db.add(sem)
    db.commit()
    db.refresh(sem)
    return _build_out(sem)


@router.delete("/{sem_id}", status_code=204)
def delete_semester(sem_id: int, db: Session = Depends(get_db)):
    sem = db.query(models.AcademicSemester).filter_by(id=sem_id).first()
    if not sem:
        raise HTTPException(404, "Semestre no encontrado")
    db.delete(sem)
    db.commit()


@router.post("/{sem_id}/activate")
def activate_semester(sem_id: int, db: Session = Depends(get_db)):
    sem = db.query(models.AcademicSemester).filter_by(id=sem_id).first()
    if not sem:
        raise HTTPException(404, "Semestre no encontrado")
    db.query(models.AcademicSemester).update({"is_active": False})
    sem.is_active = True
    db.commit()
    return {"status": "ok", "active": sem.label}


@router.get("/{sem_id}/mappings")
def get_mappings(sem_id: int, db: Session = Depends(get_db)):
    sem = db.query(models.AcademicSemester).filter_by(id=sem_id).first()
    if not sem:
        raise HTTPException(404)
    return [m.curriculum_semester_number for m in sem.curriculum_mappings]


@router.put("/{sem_id}/mappings")
def update_mappings(sem_id: int, data: schemas.SemesterMappingUpdate, db: Session = Depends(get_db)):
    sem = db.query(models.AcademicSemester).filter_by(id=sem_id).first()
    if not sem:
        raise HTTPException(404, "Semestre no encontrado")
    db.query(models.SemesterPlanMapping).filter_by(academic_semester_id=sem_id).delete()
    for cs in set(data.curriculum_semester_numbers):
        db.add(models.SemesterPlanMapping(academic_semester_id=sem_id, curriculum_semester_number=cs))
    db.commit()
    return {"status": "ok", "mappings": data.curriculum_semester_numbers}
