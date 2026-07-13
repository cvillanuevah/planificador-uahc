from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.ProfessorOut])
def list_professors(db: Session = Depends(get_db)):
    return db.query(models.Professor).filter_by(is_active=True).order_by(models.Professor.name).all()


@router.post("/", response_model=schemas.ProfessorOut, status_code=201)
def create_professor(data: schemas.ProfessorCreate, db: Session = Depends(get_db)):
    prof = models.Professor(**data.model_dump())
    db.add(prof)
    db.commit()
    db.refresh(prof)
    return prof


@router.get("/{prof_id}", response_model=schemas.ProfessorOut)
def get_professor(prof_id: int, db: Session = Depends(get_db)):
    prof = db.query(models.Professor).filter_by(id=prof_id).first()
    if not prof:
        raise HTTPException(404, "Profesor no encontrado")
    return prof


@router.put("/{prof_id}", response_model=schemas.ProfessorOut)
def update_professor(prof_id: int, data: schemas.ProfessorUpdate, db: Session = Depends(get_db)):
    prof = db.query(models.Professor).filter_by(id=prof_id).first()
    if not prof:
        raise HTTPException(404, "Profesor no encontrado")
    for k, v in data.model_dump().items():
        setattr(prof, k, v)
    db.commit()
    db.refresh(prof)
    return prof


@router.delete("/{prof_id}", status_code=204)
def delete_professor(prof_id: int, db: Session = Depends(get_db)):
    prof = db.query(models.Professor).filter_by(id=prof_id).first()
    if not prof:
        raise HTTPException(404, "Profesor no encontrado")
    prof.is_active = False
    db.commit()


@router.get("/{prof_id}/availability")
def get_availability(prof_id: int, db: Session = Depends(get_db)):
    prof = db.query(models.Professor).filter_by(id=prof_id).first()
    if not prof:
        raise HTTPException(404, "Profesor no encontrado")
    slots = db.query(models.ProfessorAvailability).filter_by(professor_id=prof_id).all()
    return [{"day": s.day, "block_number": s.block_number, "available": s.available} for s in slots]


@router.post("/{prof_id}/availability")
def save_availability(prof_id: int, data: schemas.ProfessorAvailabilityUpdate, db: Session = Depends(get_db)):
    prof = db.query(models.Professor).filter_by(id=prof_id).first()
    if not prof:
        raise HTTPException(404, "Profesor no encontrado")

    # Delete all current availability for this professor
    db.query(models.ProfessorAvailability).filter_by(professor_id=prof_id).delete()

    # Insert new
    for slot in data.slots:
        db.add(models.ProfessorAvailability(
            professor_id=prof_id,
            day=slot.day,
            block_number=slot.block_number,
            available=slot.available,
        ))
    db.commit()
    return {"status": "ok", "saved": len(data.slots)}
