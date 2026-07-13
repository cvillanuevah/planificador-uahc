from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.BlockOut])
def list_blocks(db: Session = Depends(get_db)):
    return db.query(models.Block).order_by(models.Block.number).all()


@router.put("/{block_id}", response_model=schemas.BlockOut)
def update_block(block_id: int, data: schemas.BlockUpdate, db: Session = Depends(get_db)):
    block = db.query(models.Block).filter_by(id=block_id).first()
    if not block:
        raise HTTPException(404, "Bloque no encontrado")
    block.start_time = data.start_time
    block.end_time = data.end_time
    db.commit()
    db.refresh(block)
    return block
