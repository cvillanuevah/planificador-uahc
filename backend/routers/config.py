from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db

router = APIRouter()


# ─── Protected blocks ─────────────────────────────────────────────────────────

@router.get("/protected-blocks", response_model=List[schemas.ProtectedBlockOut])
def list_protected(db: Session = Depends(get_db)):
    return db.query(models.ProtectedBlock).all()


@router.post("/protected-blocks", response_model=schemas.ProtectedBlockOut, status_code=201)
def create_protected(data: schemas.ProtectedBlockCreate, db: Session = Depends(get_db)):
    existing = db.query(models.ProtectedBlock).filter_by(day=data.day, block_number=data.block_number).first()
    if existing:
        raise HTTPException(400, "Ese bloque ya está protegido")
    pb = models.ProtectedBlock(**data.model_dump())
    db.add(pb)
    db.commit()
    db.refresh(pb)
    return pb


@router.delete("/protected-blocks/{pb_id}", status_code=204)
def delete_protected(pb_id: int, db: Session = Depends(get_db)):
    pb = db.query(models.ProtectedBlock).filter_by(id=pb_id).first()
    if not pb:
        raise HTTPException(404)
    db.delete(pb)
    db.commit()


# ─── Lab blocked slots ────────────────────────────────────────────────────────

@router.get("/lab-blocks", response_model=List[schemas.LabBlockedSlotOut])
def list_lab_blocks(room_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.LabBlockedSlot)
    if room_id:
        q = q.filter_by(room_id=room_id)
    return q.all()


@router.post("/lab-blocks", response_model=schemas.LabBlockedSlotOut, status_code=201)
def create_lab_block(data: schemas.LabBlockedSlotCreate, db: Session = Depends(get_db)):
    existing = db.query(models.LabBlockedSlot).filter_by(
        room_id=data.room_id, day=data.day, block_number=data.block_number
    ).first()
    if existing:
        raise HTTPException(400, "Ese bloque ya está bloqueado para este laboratorio")
    lb = models.LabBlockedSlot(**data.model_dump())
    db.add(lb)
    db.commit()
    db.refresh(lb)
    return lb


@router.delete("/lab-blocks/{lb_id}", status_code=204)
def delete_lab_block(lb_id: int, db: Session = Depends(get_db)):
    lb = db.query(models.LabBlockedSlot).filter_by(id=lb_id).first()
    if not lb:
        raise HTTPException(404)
    db.delete(lb)
    db.commit()
