from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter()


@router.get("", response_model=List[schemas.RoomOut])
def list_rooms(db: Session = Depends(get_db)):
    return db.query(models.Room).all()


@router.post("", response_model=schemas.RoomOut, status_code=201)
def create_room(data: schemas.RoomCreate, db: Session = Depends(get_db)):
    room = models.Room(**data.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.put("/{room_id}", response_model=schemas.RoomOut)
def update_room(room_id: int, data: schemas.RoomUpdate, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(id=room_id).first()
    if not room:
        raise HTTPException(404, "Sala no encontrada")
    for k, v in data.model_dump().items():
        setattr(room, k, v)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(id=room_id).first()
    if not room:
        raise HTTPException(404, "Sala no encontrada")
    db.delete(room)
    db.commit()
