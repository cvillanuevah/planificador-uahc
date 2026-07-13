from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.SubjectOut])
def list_subjects(
    curriculum_semester: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Subject)
    if curriculum_semester is not None:
        q = q.filter_by(curriculum_semester=curriculum_semester)
    return q.order_by(models.Subject.curriculum_semester, models.Subject.formation_line, models.Subject.name).all()


@router.post("/", response_model=schemas.SubjectOut, status_code=201)
def create_subject(data: schemas.SubjectCreate, db: Session = Depends(get_db)):
    subj = models.Subject(**data.model_dump())
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


@router.put("/{subject_id}", response_model=schemas.SubjectOut)
def update_subject(subject_id: int, data: schemas.SubjectUpdate, db: Session = Depends(get_db)):
    subj = db.query(models.Subject).filter_by(id=subject_id).first()
    if not subj:
        raise HTTPException(404, "Asignatura no encontrada")
    for k, v in data.model_dump().items():
        setattr(subj, k, v)
    db.commit()
    db.refresh(subj)
    return subj


@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subj = db.query(models.Subject).filter_by(id=subject_id).first()
    if not subj:
        raise HTTPException(404, "Asignatura no encontrada")
    db.delete(subj)
    db.commit()
