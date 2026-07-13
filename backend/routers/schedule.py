from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
import models, schemas
from database import get_db

router = APIRouter()


# ─── Assignments ──────────────────────────────────────────────────────────────

@router.get("/{sem_id}/assignments", response_model=List[schemas.AssignmentOut])
def get_assignments(sem_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.SubjectAssignment)
        .options(
            joinedload(models.SubjectAssignment.professor),
            joinedload(models.SubjectAssignment.subject),
            joinedload(models.SubjectAssignment.scheduled_blocks),
        )
        .filter_by(academic_semester_id=sem_id)
        .all()
    )


@router.post("/assignments", response_model=schemas.AssignmentOut, status_code=201)
def create_assignment(data: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    existing = db.query(models.SubjectAssignment).filter_by(
        subject_id=data.subject_id, academic_semester_id=data.academic_semester_id
    ).first()
    if existing:
        raise HTTPException(400, "Esta asignatura ya tiene asignación en este semestre")
    assignment = models.SubjectAssignment(**data.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return (
        db.query(models.SubjectAssignment)
        .options(
            joinedload(models.SubjectAssignment.professor),
            joinedload(models.SubjectAssignment.subject),
            joinedload(models.SubjectAssignment.scheduled_blocks),
        )
        .filter_by(id=assignment.id)
        .first()
    )


@router.put("/assignments/{assignment_id}", response_model=schemas.AssignmentOut)
def update_assignment(assignment_id: int, data: schemas.AssignmentUpdate, db: Session = Depends(get_db)):
    assignment = db.query(models.SubjectAssignment).filter_by(id=assignment_id).first()
    if not assignment:
        raise HTTPException(404, "Asignación no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(assignment, k, v)
    db.commit()
    db.refresh(assignment)
    return (
        db.query(models.SubjectAssignment)
        .options(
            joinedload(models.SubjectAssignment.professor),
            joinedload(models.SubjectAssignment.subject),
            joinedload(models.SubjectAssignment.scheduled_blocks),
        )
        .filter_by(id=assignment_id)
        .first()
    )


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(models.SubjectAssignment).filter_by(id=assignment_id).first()
    if not assignment:
        raise HTTPException(404, "Asignación no encontrada")
    db.delete(assignment)
    db.commit()


# ─── Scheduled blocks ─────────────────────────────────────────────────────────

@router.post("/blocks", response_model=schemas.ScheduledBlockOut, status_code=201)
def add_block(data: schemas.ScheduledBlockCreate, db: Session = Depends(get_db)):
    assignment = (
        db.query(models.SubjectAssignment)
        .options(joinedload(models.SubjectAssignment.subject))
        .filter_by(id=data.assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(404, "Asignación no encontrada")

    # Conflict check: no two subjects from the same curriculum semester at the same time
    same_sem_conflicts = (
        db.query(models.ScheduledBlock)
        .select_from(models.ScheduledBlock)
        .join(models.SubjectAssignment, models.ScheduledBlock.assignment_id == models.SubjectAssignment.id)
        .join(models.Subject, models.SubjectAssignment.subject_id == models.Subject.id)
        .filter(
            models.SubjectAssignment.academic_semester_id == assignment.academic_semester_id,
            models.SubjectAssignment.id != data.assignment_id,
            models.Subject.curriculum_semester == assignment.subject.curriculum_semester,
            models.ScheduledBlock.day == data.day,
            models.ScheduledBlock.block_number == data.block_number,
        )
        .first()
    )
    if same_sem_conflicts:
        raise HTTPException(409, "Conflicto: otro ramo del mismo semestre de malla ocupa ese bloque")

    # Duplicate block check
    existing = db.query(models.ScheduledBlock).filter_by(
        assignment_id=data.assignment_id, day=data.day, block_number=data.block_number
    ).first()
    if existing:
        raise HTTPException(400, "Este bloque ya está asignado")

    block = models.ScheduledBlock(**data.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.delete("/blocks/{block_id}", status_code=204)
def remove_block(block_id: int, db: Session = Depends(get_db)):
    block = db.query(models.ScheduledBlock).filter_by(id=block_id).first()
    if not block:
        raise HTTPException(404, "Bloque no encontrado")
    db.delete(block)
    db.commit()


# ─── Available blocks for an assignment ───────────────────────────────────────

@router.get("/assignments/{assignment_id}/available-blocks")
def get_available_blocks(assignment_id: int, db: Session = Depends(get_db)):
    assignment = (
        db.query(models.SubjectAssignment)
        .options(
            joinedload(models.SubjectAssignment.subject),
            joinedload(models.SubjectAssignment.professor).joinedload(models.Professor.availability),
            joinedload(models.SubjectAssignment.scheduled_blocks),
        )
        .filter_by(id=assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(404)

    subject = assignment.subject
    professor = assignment.professor
    sem_id = assignment.academic_semester_id

    # Blocks already scheduled for this assignment
    self_blocks: set = {(sb.day, sb.block_number) for sb in assignment.scheduled_blocks}

    # Occupied by OTHER assignments in the SAME curriculum semester (conflict)
    conflict_rows = (
        db.query(models.ScheduledBlock.day, models.ScheduledBlock.block_number)
        .select_from(models.ScheduledBlock)
        .join(models.SubjectAssignment, models.ScheduledBlock.assignment_id == models.SubjectAssignment.id)
        .join(models.Subject, models.SubjectAssignment.subject_id == models.Subject.id)
        .filter(
            models.SubjectAssignment.academic_semester_id == sem_id,
            models.SubjectAssignment.id != assignment_id,
            models.Subject.curriculum_semester == subject.curriculum_semester,
        )
        .all()
    )
    conflict_blocks: set = {(r.day, r.block_number) for r in conflict_rows}

    # Professor busy in other assignments (same academic semester, different subject)
    prof_busy: set = set()
    if professor:
        busy_rows = (
            db.query(models.ScheduledBlock.day, models.ScheduledBlock.block_number)
            .select_from(models.ScheduledBlock)
            .join(models.SubjectAssignment, models.ScheduledBlock.assignment_id == models.SubjectAssignment.id)
            .filter(
                models.SubjectAssignment.academic_semester_id == sem_id,
                models.SubjectAssignment.professor_id == professor.id,
                models.SubjectAssignment.id != assignment_id,
            )
            .all()
        )
        prof_busy = {(r.day, r.block_number) for r in busy_rows}

    # Professor availability (only mark unavailable if the professor HAS set availability)
    prof_available: set = set()
    has_availability = professor and len(professor.availability) > 0
    if has_availability:
        prof_available = {(a.day, a.block_number) for a in professor.availability if a.available}

    # Protected blocks
    protected = {(pb.day, pb.block_number) for pb in db.query(models.ProtectedBlock).all()}

    # Lab blocked slots (if subject uses lab)
    room_type = assignment.room_type_override or subject.room_type
    lab_blocked: set = set()
    if room_type in ("lab", "mix"):
        rows = db.query(models.LabBlockedSlot.day, models.LabBlockedSlot.block_number).all()
        lab_blocked = {(r.day, r.block_number) for r in rows}

    result = []
    for day in range(6):
        for block in range(1, 19):
            slot = (day, block)
            if slot in self_blocks:
                status = "occupied_self"
            elif slot in protected:
                status = "protected"
            elif slot in lab_blocked:
                status = "lab_blocked"
            elif slot in conflict_blocks:
                status = "conflict"
            elif has_availability and slot not in prof_available:
                status = "professor_unavailable"
            elif slot in prof_busy:
                status = "professor_busy"
            else:
                status = "available"
            result.append({"day": day, "block_number": block, "status": status})

    return result


# ─── Conflicts for a semester ─────────────────────────────────────────────────

@router.get("/{sem_id}/conflicts")
def get_conflicts(sem_id: int, db: Session = Depends(get_db)):
    """Returns conflicting block pairs in this semester."""
    # Find same-curriculum-semester collisions
    all_blocks = (
        db.query(
            models.ScheduledBlock.day,
            models.ScheduledBlock.block_number,
            models.Subject.curriculum_semester,
            models.Subject.name,
            models.SubjectAssignment.id,
        )
        .select_from(models.ScheduledBlock)
        .join(models.SubjectAssignment, models.ScheduledBlock.assignment_id == models.SubjectAssignment.id)
        .join(models.Subject, models.SubjectAssignment.subject_id == models.Subject.id)
        .filter(models.SubjectAssignment.academic_semester_id == sem_id)
        .all()
    )

    from collections import defaultdict
    slot_map = defaultdict(list)
    for row in all_blocks:
        key = (row.day, row.block_number, row.curriculum_semester)
        slot_map[key].append({"subject": row.name, "assignment_id": row[4]})

    conflicts = []
    for (day, block, cs), subjects in slot_map.items():
        if len(subjects) > 1:
            conflicts.append({
                "day": day,
                "block_number": block,
                "curriculum_semester": cs,
                "subjects": subjects,
            })
    return conflicts
