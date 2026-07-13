from pydantic import BaseModel
from typing import Optional, List


# ─── Blocks ───────────────────────────────────────────────────────────────────

class BlockOut(BaseModel):
    id: int
    number: int
    start_time: str
    end_time: str
    model_config = {"from_attributes": True}

class BlockUpdate(BaseModel):
    start_time: str
    end_time: str


# ─── Rooms ────────────────────────────────────────────────────────────────────

class RoomCreate(BaseModel):
    name: str
    type: str
    location: Optional[str] = None
    capacity: Optional[int] = None

class RoomUpdate(RoomCreate):
    pass

class RoomOut(RoomCreate):
    id: int
    model_config = {"from_attributes": True}


# ─── Professors ───────────────────────────────────────────────────────────────

class ProfessorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    rut: Optional[str] = None
    professor_type: str = "honorary"

class ProfessorUpdate(ProfessorCreate):
    pass

class ProfessorOut(ProfessorCreate):
    id: int
    is_active: bool
    model_config = {"from_attributes": True}

class AvailabilitySlot(BaseModel):
    day: int
    block_number: int
    available: bool

class ProfessorAvailabilityUpdate(BaseModel):
    slots: List[AvailabilitySlot]


# ─── Subjects ─────────────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str
    curriculum_semester: int
    formation_line: str
    room_type: str = "theoretical"
    blocks_per_week: int = 4
    is_taller_digital: bool = False

class SubjectUpdate(SubjectCreate):
    pass

class SubjectOut(SubjectCreate):
    id: int
    model_config = {"from_attributes": True}


# ─── Semesters ────────────────────────────────────────────────────────────────

class AcademicSemesterCreate(BaseModel):
    year: int
    period: int
    label: str

class AcademicSemesterOut(AcademicSemesterCreate):
    id: int
    is_active: bool
    curriculum_semester_numbers: List[int] = []
    model_config = {"from_attributes": True}

class SemesterMappingUpdate(BaseModel):
    curriculum_semester_numbers: List[int]


# ─── Schedule ─────────────────────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    professor_id: Optional[int] = None
    subject_id: int
    academic_semester_id: int
    room_type_override: Optional[str] = None

class AssignmentUpdate(BaseModel):
    professor_id: Optional[int] = None
    room_type_override: Optional[str] = None

class ScheduledBlockCreate(BaseModel):
    assignment_id: int
    day: int
    block_number: int
    room_id: Optional[int] = None
    room_type_used: str = "theoretical"

class ScheduledBlockOut(BaseModel):
    id: int
    day: int
    block_number: int
    room_id: Optional[int] = None
    room_type_used: str
    model_config = {"from_attributes": True}

class AssignmentOut(BaseModel):
    id: int
    professor_id: Optional[int]
    subject_id: int
    academic_semester_id: int
    room_type_override: Optional[str]
    professor: Optional[ProfessorOut]
    subject: SubjectOut
    scheduled_blocks: List[ScheduledBlockOut] = []
    model_config = {"from_attributes": True}

class BlockSlotStatus(BaseModel):
    day: int
    block_number: int
    status: str  # available|occupied_self|occupied_other|protected|lab_blocked|professor_unavailable|conflict
    assignment_id: Optional[int] = None
    subject_name: Optional[str] = None


# ─── Config ───────────────────────────────────────────────────────────────────

class ProtectedBlockCreate(BaseModel):
    day: int
    block_number: int
    reason: Optional[str] = None

class ProtectedBlockOut(ProtectedBlockCreate):
    id: int
    model_config = {"from_attributes": True}

class LabBlockedSlotCreate(BaseModel):
    room_id: int
    day: int
    block_number: int
    subject_name: Optional[str] = None

class LabBlockedSlotOut(LabBlockedSlotCreate):
    id: int
    model_config = {"from_attributes": True}
