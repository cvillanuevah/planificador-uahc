from sqlalchemy.orm import Session
import models

BLOCKS = [
    (1,  "08:30", "09:10"),
    (2,  "09:10", "09:50"),
    (3,  "10:05", "10:45"),
    (4,  "10:45", "11:25"),
    (5,  "11:40", "12:20"),
    (6,  "12:20", "13:00"),
    (7,  "13:15", "13:55"),
    (8,  "13:55", "14:35"),
    (9,  "14:50", "15:30"),
    (10, "15:30", "16:10"),
    (11, "16:25", "17:05"),
    (12, "17:05", "17:45"),
    (13, "18:30", "19:10"),
    (14, "19:10", "19:50"),
    (15, "20:05", "20:45"),
    (16, "20:45", "21:25"),
    (17, "21:40", "22:20"),
    (18, "22:20", "23:00"),
]

ROOMS = [
    ("Sala Teórica A", "theoretical", "Edificio Principal", 40),
    ("Sala Teórica B", "theoretical", "Edificio Principal", 40),
    ("Sala Teórica C", "theoretical", "Edificio Principal", 35),
    ("Laboratorio Alameda", "lab", "Alameda", 30),
    ("Laboratorio Sanfuentes", "lab", "Sanfuentes", 30),
]

# (name, curriculum_semester, formation_line, room_type, blocks_per_week, is_taller_digital)
SUBJECTS = [
    # ── SEMESTRE 1 ──────────────────────────────────────────────────────────
    ("Matemáticas para la Ingeniería I",          1, "especialidad",      "theoretical", 4, False),
    ("Física I",                                   1, "especialidad",      "theoretical", 4, False),
    ("Estadística I",                              1, "especialidad",      "theoretical", 4, False),
    ("Álgebra I",                                  1, "especialidad",      "theoretical", 4, False),
    ("Introducción a la Ingeniería Civil Industrial", 1, "especialidad",   "theoretical", 2, False),
    ("Fundamentos de Ciencias de Datos",           1, "interdisciplinar",  "theoretical", 4, False),
    ("Estrategias para la Vida Académica I",       1, "basica",            "theoretical", 2, False),
    # ── SEMESTRE 2 ──────────────────────────────────────────────────────────
    ("Matemáticas para la Ingeniería II",          2, "especialidad",      "theoretical", 4, False),
    ("Física II",                                  2, "especialidad",      "theoretical", 4, False),
    ("Estadística II",                             2, "especialidad",      "theoretical", 4, False),
    ("Álgebra II",                                 2, "especialidad",      "theoretical", 4, False),
    ("Fundamentos de Programación en Python",      2, "especialidad",      "lab",         4, True),
    ("Metodología de la Investigación",            2, "interdisciplinar",  "theoretical", 4, False),
    ("Inglés I",                                   2, "basica",            "theoretical", 4, False),
    ("Estrategias para la Vida Académica II",      2, "basica",            "theoretical", 2, False),
    # ── SEMESTRE 3 ──────────────────────────────────────────────────────────
    ("Matemáticas para la Ingeniería III",         3, "especialidad",      "theoretical", 4, False),
    ("Física III",                                 3, "especialidad",      "theoretical", 4, False),
    ("Estadística III",                            3, "especialidad",      "theoretical", 4, False),
    ("Métodos y Modelación de Datos",              3, "especialidad",      "lab",         4, True),
    ("Políticas Públicas",                         3, "interdisciplinar",  "theoretical", 4, False),
    ("Derechos Humanos, Género e Interculturalidad", 3, "general",         "theoretical", 4, False),
    ("Inglés II",                                  3, "basica",            "theoretical", 4, False),
    # ── SEMESTRE 4 ──────────────────────────────────────────────────────────
    ("Gestión y Comportamiento Organizacional en un Mundo Global", 4, "especialidad", "theoretical", 4, False),
    ("Economía Global Geopolítica",                4, "especialidad",      "theoretical", 4, False),
    ("Ingeniería de Procesos y Lean 5.0",          4, "especialidad",      "theoretical", 4, False),
    ("Machine Learning Aplicado",                  4, "especialidad",      "lab",         4, True),
    ("Investigación de Operaciones",               4, "especialidad",      "theoretical", 4, False),
    ("Metodologías de la Investigación para Ingeniería", 4, "especialidad", "theoretical", 4, False),
    ("Laboratorio de Ciencias de Datos para Problemas Sociales", 4, "interdisciplinar", "lab", 4, False),
    ("Ética y Debates Contemporáneos",             4, "general",           "theoretical", 4, False),
    ("Inglés III",                                 4, "basica",            "theoretical", 4, False),
    # ── SEMESTRE 5 ──────────────────────────────────────────────────────────
    ("Ingeniería Económica y Modelos Financieros", 5, "especialidad",      "theoretical", 4, False),
    ("Contabilidad y Gestión Financiera",          5, "especialidad",      "theoretical", 4, False),
    ("Excelencia Operacional",                     5, "especialidad",      "theoretical", 4, False),
    ("Simulación y Digital Twins",                 5, "especialidad",      "lab",         4, False),
    ("Machine Learning Analítica Avanzada",        5, "especialidad",      "lab",         4, True),
    ("Gestión de Proyectos Ágiles",                5, "especialidad",      "theoretical", 4, False),
    ("Optativo de Profesionalización I",           5, "interdisciplinar",  "theoretical", 4, False),
    # ── SEMESTRE 6 ──────────────────────────────────────────────────────────
    ("Finanzas Corporativas",                      6, "especialidad",      "theoretical", 4, False),
    ("Logística Global y Supply Chain",            6, "especialidad",      "theoretical", 4, False),
    ("Automatización Inteligente",                 6, "especialidad",      "lab",         4, False),
    ("Investigación Operativa Avanzada Lean 5.0",  6, "especialidad",      "theoretical", 4, False),
    ("Seminario de Grado I",                       6, "especialidad",      "theoretical", 2, False),
    # ── SEMESTRE 7 ──────────────────────────────────────────────────────────
    ("Marketing y Estrategias de Mercado",         7, "especialidad",      "theoretical", 4, False),
    ("Formulación y Gestión de Proyectos",         7, "especialidad",      "theoretical", 4, False),
    ("Prospectiva y Estrategia Global",            7, "especialidad",      "theoretical", 4, False),
    ("Seminario de Grado II",                      7, "especialidad",      "theoretical", 2, False),
    # ── SEMESTRE 8 ──────────────────────────────────────────────────────────
    ("Gestión Estratégica Global",                 8, "especialidad",      "theoretical", 4, False),
    ("Innovación y Emprendimiento",                8, "especialidad",      "theoretical", 4, False),
    ("Evaluación y Gestión de Proyectos",          8, "especialidad",      "theoretical", 4, False),
    ("Sostenibilidad, IA y Robótica",              8, "especialidad",      "lab",         4, False),
    ("Optativo de Profesionalización II",          8, "interdisciplinar",  "theoretical", 4, False),
    # ── SEMESTRE 9 ──────────────────────────────────────────────────────────
    ("Industria 5.0",                              9, "especialidad",      "theoretical", 4, False),
    ("Dirección de Equipos Globales",              9, "especialidad",      "theoretical", 4, False),
    ("Ingeniería Económica, Financiamiento e Innovación", 9, "especialidad", "theoretical", 4, False),
    ("Innovación y Diseño de Soluciones Tecnológicas", 9, "especialidad",  "lab",         4, True),
    ("Práctica Inicial",                           9, "especialidad",      "theoretical", 0, False),
    ("Optativo de Profesionalización III",         9, "interdisciplinar",  "theoretical", 4, False),
    # ── SEMESTRE 10 ─────────────────────────────────────────────────────────
    ("Lean 5.0",                                  10, "especialidad",      "theoretical", 4, False),
    ("Práctica Profesional",                       10, "especialidad",      "theoretical", 0, False),
    ("Seminario de Integración Tecnológica",       10, "especialidad",      "theoretical", 4, False),
    ("Innovación Aplicada",                        10, "especialidad",      "lab",         4, False),
]

# Lab blocked slots from Excel: (room_name, day, block_number, subject_name)
# day: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado
LAB_BLOCKS = [
    # ─ Laboratorio Alameda ─────────────────────────────────────────────────
    ("Laboratorio Alameda", 0, 1,  "Estadística y Ciencias de Datos (s1)"),
    ("Laboratorio Alameda", 0, 2,  "Estadística y Ciencias de Datos (s1)"),
    ("Laboratorio Alameda", 0, 3,  "Estadística y Ciencias de Datos (s2)"),
    ("Laboratorio Alameda", 0, 4,  "Estadística y Ciencias de Datos (s2)"),
    ("Laboratorio Alameda", 0, 5,  "Diseño y Construcción Datos Cuantitativos I"),
    ("Laboratorio Alameda", 0, 6,  "Diseño y Construcción Datos Cuantitativos I"),
    ("Laboratorio Alameda", 0, 7,  "Diseño y Construcción Datos Cuantitativos I"),
    ("Laboratorio Alameda", 0, 8,  "Diseño y Construcción Datos Cuantitativos I"),
    ("Laboratorio Alameda", 0, 9,  "Metodología de la Investigación (s1)"),
    ("Laboratorio Alameda", 0, 10, "Metodología de la Investigación (s1)"),
    ("Laboratorio Alameda", 0, 11, "Metodología de la Investigación (s2)"),
    ("Laboratorio Alameda", 0, 12, "Metodología de la Investigación (s2)"),
    ("Laboratorio Alameda", 1, 1,  "Lenguaje de Programación"),
    ("Laboratorio Alameda", 1, 2,  "Lenguaje de Programación"),
    ("Laboratorio Alameda", 1, 3,  "Lenguaje de Programación"),
    ("Laboratorio Alameda", 1, 4,  "Lenguaje de Programación"),
    ("Laboratorio Alameda", 1, 9,  "Laboratorio de Ciencia de Datos"),
    ("Laboratorio Alameda", 1, 10, "Laboratorio de Ciencia de Datos"),
    ("Laboratorio Alameda", 1, 11, "Laboratorio de Ciencia de Datos"),
    ("Laboratorio Alameda", 1, 12, "Laboratorio de Ciencia de Datos"),
    ("Laboratorio Alameda", 2, 1,  "Diseño Digital I"),
    ("Laboratorio Alameda", 2, 2,  "Diseño Digital I"),
    ("Laboratorio Alameda", 2, 3,  "Laboratorio de Materiales"),
    ("Laboratorio Alameda", 2, 4,  "Laboratorio de Materiales"),
    ("Laboratorio Alameda", 2, 5,  "Laboratorio de Materiales"),
    ("Laboratorio Alameda", 2, 6,  "Laboratorio de Materiales"),
    ("Laboratorio Alameda", 2, 9,  "Fundamentos de Programación en Python (otra carrera)"),
    ("Laboratorio Alameda", 2, 10, "Fundamentos de Programación en Python (otra carrera)"),
    ("Laboratorio Alameda", 2, 11, "Fundamentos de Programación en Python (otra carrera)"),
    ("Laboratorio Alameda", 2, 12, "Fundamentos de Programación en Python (otra carrera)"),
    ("Laboratorio Alameda", 3, 3,  "Minería de Datos y Big Data"),
    ("Laboratorio Alameda", 3, 4,  "Minería de Datos y Big Data"),
    ("Laboratorio Alameda", 3, 5,  "Minería de Datos y Big Data"),
    ("Laboratorio Alameda", 3, 6,  "Minería de Datos y Big Data"),
    ("Laboratorio Alameda", 3, 9,  "Técnicas de Optimización"),
    ("Laboratorio Alameda", 3, 10, "Técnicas de Optimización"),
    ("Laboratorio Alameda", 3, 11, "Técnicas de Optimización"),
    ("Laboratorio Alameda", 3, 12, "Técnicas de Optimización"),
    ("Laboratorio Alameda", 4, 1,  "Diseño Digital III"),
    ("Laboratorio Alameda", 4, 2,  "Diseño Digital III"),
    ("Laboratorio Alameda", 4, 5,  "Story Telling – Periodismo"),
    ("Laboratorio Alameda", 4, 6,  "Story Telling – Periodismo"),
    ("Laboratorio Alameda", 4, 7,  "Story Telling – Periodismo"),
    ("Laboratorio Alameda", 4, 8,  "Story Telling – Periodismo"),
    ("Laboratorio Alameda", 4, 9,  "Televisión"),
    ("Laboratorio Alameda", 4, 10, "Televisión"),
    ("Laboratorio Alameda", 4, 11, "Televisión"),
    ("Laboratorio Alameda", 4, 12, "Televisión"),
    # ─ Laboratorio Sanfuentes ──────────────────────────────────────────────
    ("Laboratorio Sanfuentes", 0, 1,  "Taller Metodología V (Antropo)"),
    ("Laboratorio Sanfuentes", 0, 2,  "Taller Metodología V (Antropo)"),
    ("Laboratorio Sanfuentes", 0, 3,  "Taller y Construcción de Datos Cualitativos II"),
    ("Laboratorio Sanfuentes", 0, 4,  "Taller y Construcción de Datos Cualitativos II"),
    ("Laboratorio Sanfuentes", 0, 5,  "Metodología Cualitativa (CP) s1"),
    ("Laboratorio Sanfuentes", 0, 6,  "Metodología Cualitativa (CP) s1"),
    ("Laboratorio Sanfuentes", 0, 7,  "Metodología Cualitativa (CP) s2"),
    ("Laboratorio Sanfuentes", 0, 8,  "Metodología Cualitativa (CP) s2"),
    ("Laboratorio Sanfuentes", 0, 9,  "Análisis de Datos"),
    ("Laboratorio Sanfuentes", 0, 10, "Análisis de Datos"),
    ("Laboratorio Sanfuentes", 0, 11, "Metodología de la Investigación (s3)"),
    ("Laboratorio Sanfuentes", 0, 12, "Metodología de la Investigación (s3)"),
    ("Laboratorio Sanfuentes", 1, 3,  "Programación de Aprendizaje Automático"),
    ("Laboratorio Sanfuentes", 1, 4,  "Programación de Aprendizaje Automático"),
    ("Laboratorio Sanfuentes", 1, 5,  "Programación de Aprendizaje Automático"),
    ("Laboratorio Sanfuentes", 1, 6,  "Programación de Aprendizaje Automático"),
    ("Laboratorio Sanfuentes", 1, 9,  "Taller y Construcción de Datos Cualitativos II (Martes)"),
    ("Laboratorio Sanfuentes", 1, 10, "Taller y Construcción de Datos Cualitativos II (Martes)"),
    ("Laboratorio Sanfuentes", 3, 3,  "Estructura de Datos y Algoritmos"),
    ("Laboratorio Sanfuentes", 3, 4,  "Estructura de Datos y Algoritmos"),
    ("Laboratorio Sanfuentes", 3, 5,  "Estructura de Datos y Algoritmos"),
    ("Laboratorio Sanfuentes", 3, 6,  "Estructura de Datos y Algoritmos"),
    ("Laboratorio Sanfuentes", 4, 1,  "Estadística II"),
    ("Laboratorio Sanfuentes", 4, 2,  "Estadística II"),
    ("Laboratorio Sanfuentes", 4, 3,  "Estadística II"),
    ("Laboratorio Sanfuentes", 4, 4,  "Estadística II"),
    ("Laboratorio Sanfuentes", 4, 5,  "Laboratorio Análisis Electoral (CP)"),
    ("Laboratorio Sanfuentes", 4, 6,  "Laboratorio Análisis Electoral (CP)"),
    ("Laboratorio Sanfuentes", 4, 7,  "Laboratorio Análisis Electoral (CP)"),
    ("Laboratorio Sanfuentes", 4, 8,  "Laboratorio Análisis Electoral (CP)"),
    ("Laboratorio Sanfuentes", 4, 9,  "Estadística IV (Sociología)"),
    ("Laboratorio Sanfuentes", 4, 10, "Estadística IV (Sociología)"),
    ("Laboratorio Sanfuentes", 4, 11, "Estadística IV (Sociología)"),
    ("Laboratorio Sanfuentes", 4, 12, "Estadística IV (Sociología)"),
]

# Default academic semester: 2026-2 with curriculum semester 2
DEFAULT_SEMESTER = {"year": 2026, "period": 2, "label": "2026-2", "curriculum_semesters": [2]}


def seed_initial_data(db: Session):
    # Only seed if blocks table is empty
    if db.query(models.Block).count() > 0:
        return

    # Blocks
    for number, start, end in BLOCKS:
        db.add(models.Block(number=number, start_time=start, end_time=end))

    # Rooms
    room_map = {}
    for name, rtype, location, capacity in ROOMS:
        r = models.Room(name=name, type=rtype, location=location, capacity=capacity)
        db.add(r)
        db.flush()
        room_map[name] = r.id

    # Subjects
    for name, sem, line, rtype, bpw, taller in SUBJECTS:
        db.add(models.Subject(
            name=name,
            curriculum_semester=sem,
            formation_line=line,
            room_type=rtype,
            blocks_per_week=bpw,
            is_taller_digital=taller,
        ))

    # Lab blocked slots
    for room_name, day, block_number, subject_name in LAB_BLOCKS:
        rid = room_map.get(room_name)
        if rid:
            db.add(models.LabBlockedSlot(
                room_id=rid, day=day, block_number=block_number, subject_name=subject_name
            ))

    # Default active semester
    sem = models.AcademicSemester(
        year=DEFAULT_SEMESTER["year"],
        period=DEFAULT_SEMESTER["period"],
        label=DEFAULT_SEMESTER["label"],
        is_active=True,
    )
    db.add(sem)
    db.flush()
    for cs in DEFAULT_SEMESTER["curriculum_semesters"]:
        db.add(models.SemesterPlanMapping(
            academic_semester_id=sem.id,
            curriculum_semester_number=cs,
        ))

    db.commit()
