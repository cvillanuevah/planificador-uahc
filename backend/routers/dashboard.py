from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import get_db

router = APIRouter()


@router.get("/{sem_id}")
def get_dashboard(sem_id: int, db: Session = Depends(get_db)):
    sem = db.query(models.AcademicSemester).filter_by(id=sem_id).first()
    if not sem:
        raise HTTPException(404, "Semestre no encontrado")

    curriculum_sems = [m.curriculum_semester_number for m in sem.curriculum_mappings]

    # Subjects that should be offered (by curriculum semester)
    subjects_in_plan = db.query(models.Subject).filter(
        models.Subject.curriculum_semester.in_(curriculum_sems)
    ).all() if curriculum_sems else []

    total_subjects = len(subjects_in_plan)

    # Assignments
    assignments = db.query(models.SubjectAssignment).filter_by(academic_semester_id=sem_id).all()
    assigned_subject_ids = {a.subject_id for a in assignments}
    total_assigned = len(assigned_subject_ids)

    # Subjects with professor
    with_professor = sum(1 for a in assignments if a.professor_id is not None)

    # Subjects with at least one block scheduled
    with_blocks = sum(1 for a in assignments if len(a.scheduled_blocks) > 0)

    # Total professors involved
    prof_ids = {a.professor_id for a in assignments if a.professor_id}
    total_professors = len(prof_ids)

    # Subjects with all blocks filled
    fully_scheduled = 0
    for a in assignments:
        subject = next((s for s in subjects_in_plan if s.id == a.subject_id), None)
        if subject and subject.blocks_per_week > 0:
            if len(a.scheduled_blocks) >= subject.blocks_per_week:
                fully_scheduled += 1

    # Conflict check
    from collections import defaultdict
    all_blocks = (
        db.query(
            models.ScheduledBlock.day,
            models.ScheduledBlock.block_number,
            models.Subject.curriculum_semester,
        )
        .select_from(models.ScheduledBlock)
        .join(models.SubjectAssignment, models.ScheduledBlock.assignment_id == models.SubjectAssignment.id)
        .join(models.Subject, models.SubjectAssignment.subject_id == models.Subject.id)
        .filter(models.SubjectAssignment.academic_semester_id == sem_id)
        .all()
    )
    slot_map = defaultdict(int)
    for row in all_blocks:
        slot_map[(row[0], row[1], row[2])] += 1
    total_conflicts = sum(1 for v in slot_map.values() if v > 1)

    return {
        "semester": {"id": sem.id, "label": sem.label, "is_active": sem.is_active},
        "curriculum_semesters": sorted(curriculum_sems),
        "total_subjects": total_subjects,
        "total_assigned": total_assigned,
        "with_professor": with_professor,
        "with_blocks": with_blocks,
        "fully_scheduled": fully_scheduled,
        "total_professors": total_professors,
        "total_conflicts": total_conflicts,
        "progress_pct": round(fully_scheduled / total_subjects * 100, 1) if total_subjects else 0,
    }
