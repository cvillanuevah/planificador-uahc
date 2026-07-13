from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from database import Base


class Block(Base):
    __tablename__ = "blocks"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True)
    start_time = Column(String)
    end_time = Column(String)


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String)  # "theoretical" | "lab"
    location = Column(String, nullable=True)
    capacity = Column(Integer, nullable=True)


class AcademicSemester(Base):
    __tablename__ = "academic_semesters"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    period = Column(Integer)  # 1 or 2
    label = Column(String, unique=True)  # "2026-2"
    is_active = Column(Boolean, default=False)

    curriculum_mappings = relationship("SemesterPlanMapping", back_populates="academic_semester", cascade="all, delete-orphan")
    assignments = relationship("SubjectAssignment", back_populates="academic_semester", cascade="all, delete-orphan")


class SemesterPlanMapping(Base):
    __tablename__ = "semester_plan_mappings"
    id = Column(Integer, primary_key=True, index=True)
    academic_semester_id = Column(Integer, ForeignKey("academic_semesters.id"))
    curriculum_semester_number = Column(Integer)

    academic_semester = relationship("AcademicSemester", back_populates="curriculum_mappings")

    __table_args__ = (UniqueConstraint("academic_semester_id", "curriculum_semester_number"),)


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    curriculum_semester = Column(Integer)
    formation_line = Column(String)  # "especialidad"|"interdisciplinar"|"general"|"basica"
    room_type = Column(String, default="theoretical")  # "theoretical"|"lab"|"mix"
    blocks_per_week = Column(Integer, default=4)
    is_taller_digital = Column(Boolean, default=False)

    assignments = relationship("SubjectAssignment", back_populates="subject")


class Professor(Base):
    __tablename__ = "professors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    rut = Column(String, nullable=True)
    professor_type = Column(String, default="honorary")  # "honorary"|"regular"
    is_active = Column(Boolean, default=True)

    availability = relationship("ProfessorAvailability", back_populates="professor", cascade="all, delete-orphan")
    assignments = relationship("SubjectAssignment", back_populates="professor")


class ProfessorAvailability(Base):
    __tablename__ = "professor_availability"
    id = Column(Integer, primary_key=True, index=True)
    professor_id = Column(Integer, ForeignKey("professors.id"))
    day = Column(Integer)       # 0=Lunes ... 5=Sábado
    block_number = Column(Integer)  # 1-18
    available = Column(Boolean, default=True)

    professor = relationship("Professor", back_populates="availability")

    __table_args__ = (UniqueConstraint("professor_id", "day", "block_number"),)


class SubjectAssignment(Base):
    __tablename__ = "subject_assignments"
    id = Column(Integer, primary_key=True, index=True)
    professor_id = Column(Integer, ForeignKey("professors.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    academic_semester_id = Column(Integer, ForeignKey("academic_semesters.id"))
    room_type_override = Column(String, nullable=True)

    professor = relationship("Professor", back_populates="assignments")
    subject = relationship("Subject", back_populates="assignments")
    academic_semester = relationship("AcademicSemester", back_populates="assignments")
    scheduled_blocks = relationship("ScheduledBlock", back_populates="assignment", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("subject_id", "academic_semester_id"),)


class ProtectedBlock(Base):
    __tablename__ = "protected_blocks"
    id = Column(Integer, primary_key=True, index=True)
    day = Column(Integer)
    block_number = Column(Integer)
    reason = Column(String, nullable=True)

    __table_args__ = (UniqueConstraint("day", "block_number"),)


class LabBlockedSlot(Base):
    __tablename__ = "lab_blocked_slots"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    day = Column(Integer)
    block_number = Column(Integer)
    subject_name = Column(String, nullable=True)

    room = relationship("Room")

    __table_args__ = (UniqueConstraint("room_id", "day", "block_number"),)


class ScheduledBlock(Base):
    __tablename__ = "scheduled_blocks"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("subject_assignments.id"))
    day = Column(Integer)
    block_number = Column(Integer)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    room_type_used = Column(String, default="theoretical")

    assignment = relationship("SubjectAssignment", back_populates="scheduled_blocks")
    room = relationship("Room")

    __table_args__ = (UniqueConstraint("assignment_id", "day", "block_number"),)
