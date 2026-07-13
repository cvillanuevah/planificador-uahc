export interface Block {
  id: number
  number: number
  start_time: string
  end_time: string
}

export interface Room {
  id: number
  name: string
  type: 'theoretical' | 'lab'
  location?: string
  capacity?: number
}

export interface Professor {
  id: number
  name: string
  email?: string
  phone?: string
  rut?: string
  professor_type: 'honorary' | 'regular'
  is_active: boolean
}

export interface AvailabilitySlot {
  day: number
  block_number: number
  available: boolean
}

export type FormationLine = 'especialidad' | 'interdisciplinar' | 'general' | 'basica'
export type RoomType = 'theoretical' | 'lab' | 'mix'

export interface Subject {
  id: number
  name: string
  curriculum_semester: number
  formation_line: FormationLine
  room_type: RoomType
  blocks_per_week: number
  is_taller_digital: boolean
}

export interface AcademicSemester {
  id: number
  year: number
  period: number
  label: string
  is_active: boolean
  curriculum_semester_numbers: number[]
}

export interface ScheduledBlock {
  id: number
  day: number
  block_number: number
  room_id?: number
  room_type_used: string
}

export interface Assignment {
  id: number
  professor_id?: number
  subject_id: number
  academic_semester_id: number
  room_type_override?: string
  professor?: Professor
  subject: Subject
  scheduled_blocks: ScheduledBlock[]
}

export type BlockStatus =
  | 'available'
  | 'occupied_self'
  | 'occupied_other'
  | 'protected'
  | 'lab_blocked'
  | 'professor_unavailable'
  | 'professor_busy'
  | 'conflict'
  | 'no_assignment'

export interface BlockSlot {
  day: number
  block_number: number
  status: BlockStatus
}

export interface ProtectedBlock {
  id: number
  day: number
  block_number: number
  reason?: string
}

export interface LabBlockedSlot {
  id: number
  room_id: number
  day: number
  block_number: number
  subject_name?: string
}

export interface DashboardData {
  semester: { id: number; label: string; is_active: boolean }
  curriculum_semesters: number[]
  total_subjects: number
  total_assigned: number
  with_professor: number
  with_blocks: number
  fully_scheduled: number
  total_professors: number
  total_conflicts: number
  progress_pct: number
}

// Constants
export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export const FORMATION_LINE_LABELS: Record<FormationLine, string> = {
  especialidad: 'Especialidad',
  interdisciplinar: 'Interdisciplinar',
  general: 'General',
  basica: 'Básica',
}

export const FORMATION_LINE_COLORS: Record<FormationLine, { bg: string; text: string; border: string }> = {
  especialidad:    { bg: 'bg-blue-900/40',   text: 'text-blue-300',   border: 'border-blue-700/50' },
  interdisciplinar:{ bg: 'bg-violet-900/40', text: 'text-violet-300', border: 'border-violet-700/50' },
  general:         { bg: 'bg-emerald-900/40',text: 'text-emerald-300',border: 'border-emerald-700/50' },
  basica:          { bg: 'bg-amber-900/40',  text: 'text-amber-300',  border: 'border-amber-700/50' },
}

export const SUBJECT_COLORS = [
  { bg: '#1d4ed8', light: '#93c5fd' },
  { bg: '#7c3aed', light: '#c4b5fd' },
  { bg: '#0f766e', light: '#5eead4' },
  { bg: '#b45309', light: '#fcd34d' },
  { bg: '#be185d', light: '#f9a8d4' },
  { bg: '#0369a1', light: '#7dd3fc' },
  { bg: '#15803d', light: '#86efac' },
  { bg: '#c2410c', light: '#fdba74' },
  { bg: '#6d28d9', light: '#a78bfa' },
  { bg: '#0e7490', light: '#67e8f9' },
  { bg: '#b91c1c', light: '#fca5a5' },
  { bg: '#1e40af', light: '#93c5fd' },
]
