import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronDown, UserCircle, FlaskConical, Monitor, Layers, X, Plus, AlertTriangle, CheckCircle2, Lock, Beaker, BookOpen, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import {
  getSemesters, getAssignments, createAssignment, deleteAssignment, updateAssignment,
  getAvailableBlocks, addScheduledBlock, removeScheduledBlock,
  getProfessors, getSubjects, getBlocks,
} from '../api/client'
import {
  AcademicSemester, Assignment, Professor, Subject, Block,
  DAYS_SHORT, FORMATION_LINE_COLORS, FORMATION_LINE_LABELS, SUBJECT_COLORS, RoomType, FormationLine,
} from '../types'
import Modal from '../components/ui/Modal'

// ─── Constants ───────────────────────────────────────────────────────────────

const ROOM_TYPE_ICONS: Record<RoomType, React.ElementType> = {
  theoretical: Monitor,
  lab: FlaskConical,
  mix: Layers,
}

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  theoretical: 'Teórico',
  lab: 'Laboratorio',
  mix: 'Mixto',
}

// Inline hex colors for formation lines (for left-border inline styles)
const FORMATION_LINE_HEX: Record<FormationLine, string> = {
  especialidad:     '#1d4ed8',
  interdisciplinar: '#7c3aed',
  general:          '#059669',
  basica:           '#d97706',
}

const FORMATION_LINE_BG_CLASS: Record<FormationLine, string> = {
  especialidad:     'bg-blue-900/40 text-blue-300',
  interdisciplinar: 'bg-violet-900/40 text-violet-300',
  general:          'bg-emerald-900/40 text-emerald-300',
  basica:           'bg-amber-900/40 text-amber-300',
}

const STATUS_STYLES: Record<string, string> = {
  available:             'bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer',
  occupied_self:         'cursor-pointer',
  occupied_other:        'bg-slate-800/60 border-slate-700/50 cursor-not-allowed',
  protected:             'bg-red-900/25 border-red-700/40 cursor-not-allowed',
  lab_blocked:           'bg-orange-900/20 border-orange-600/30 cursor-not-allowed',
  professor_unavailable: 'bg-yellow-900/20 border-yellow-600/30 cursor-not-allowed',
  professor_busy:        'bg-slate-800/60 border-slate-700/50 cursor-not-allowed',
  conflict:              'bg-red-600/30 border-red-500/60 animate-pulse cursor-not-allowed',
  no_assignment:         'bg-slate-900/30 border-slate-800/40',
}

// Build a stable color index per assignment id
function getColor(idx: number) {
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length]
}

// Get professor initials for avatar
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Abbreviate subject name to at most 4 words
function abbreviateSubject(name: string, maxWords = 4): string {
  const words = name.split(' ')
  if (words.length <= maxWords) return name
  return words.slice(0, maxWords).join(' ') + '…'
}

// ─── AssignmentPanel ──────────────────────────────────────────────────────────

function AssignmentPanel({
  semesterId,
  curriculumSemesters,
  selectedAssignmentId,
  onSelect,
  assignments,
  subjects,
  professors,
  isRefetching,
  conflictAssignmentIds,
}: {
  semesterId: number
  curriculumSemesters: number[]
  selectedAssignmentId: number | null
  onSelect: (id: number | null) => void
  assignments: Assignment[]
  subjects: Subject[]
  professors: Professor[]
  isRefetching: boolean
  conflictAssignmentIds: Set<number>
}) {
  const qc = useQueryClient()
  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ subject_id: 0, professor_id: '' })
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)
  const [panelSearch, setPanelSearch] = useState('')
  const [semFilter, setSemFilter] = useState<number | null>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (selectedAssignmentId == null) return
    const el = cardRefs.current.get(selectedAssignmentId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedAssignmentId])

  const subjectsInPlan = subjects.filter(s => curriculumSemesters.includes(s.curriculum_semester))
  const assignedSubjectIds = new Set(assignments.map(a => a.subject_id))

  const totalNeeded    = assignments.reduce((s, a) => s + a.subject.blocks_per_week, 0)
  const totalScheduled = assignments.reduce((s, a) => s + a.scheduled_blocks.length, 0)
  const overallPct     = totalNeeded > 0 ? Math.round((totalScheduled / totalNeeded) * 100) : 0
  const unassignedSubjects = subjectsInPlan.filter(s => !assignedSubjectIds.has(s.id))
  const incompleteCount = assignments.filter(a => a.scheduled_blocks.length < a.subject.blocks_per_week).length
  const conflictCount = assignments.filter(a => conflictAssignmentIds.has(a.id)).length

  const visibleAssignments = assignments.filter(a => {
    if (showIncompleteOnly && a.scheduled_blocks.length >= a.subject.blocks_per_week) return false
    if (showConflictsOnly && !conflictAssignmentIds.has(a.id)) return false
    if (panelSearch && !a.subject.name.toLowerCase().includes(panelSearch.toLowerCase())) return false
    if (semFilter !== null && a.subject.curriculum_semester !== semFilter) return false
    return true
  })

  // Group subjects by formation line for optgroups
  const subjectsByLine = useMemo(() => {
    const lines: Record<string, Subject[]> = {}
    for (const s of subjectsInPlan) {
      if (!lines[s.formation_line]) lines[s.formation_line] = []
      lines[s.formation_line].push(s)
    }
    return lines
  }, [subjectsInPlan])

  // Preview subject in assign modal
  const previewSubject = useMemo(
    () => assignForm.subject_id ? subjects.find(s => s.id === assignForm.subject_id) : null,
    [assignForm.subject_id, subjects]
  )

  const createMut = useMutation({
    mutationFn: () => createAssignment({
      subject_id: assignForm.subject_id,
      professor_id: assignForm.professor_id ? Number(assignForm.professor_id) : null,
      academic_semester_id: semesterId,
    }),
    onSuccess: () => {
      toast.success('Asignación creada')
      qc.invalidateQueries({ queryKey: ['assignments', semesterId] })
      setShowAssign(false)
      setAssignForm({ subject_id: 0, professor_id: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAssignment(id),
    onSuccess: () => {
      toast.success('Asignación eliminada')
      qc.invalidateQueries({ queryKey: ['assignments', semesterId] })
      if (selectedAssignmentId) onSelect(null)
    },
  })

  // Group visible assignments by curriculum semester
  const bySem: Record<number, Assignment[]> = {}
  for (const a of visibleAssignments) {
    const cs = a.subject.curriculum_semester
    if (!bySem[cs]) bySem[cs] = []
    bySem[cs].push(a)
  }

  // Count assigned/total per curriculum semester
  const totalPerSem: Record<number, number> = {}
  for (const s of subjectsInPlan) {
    totalPerSem[s.curriculum_semester] = (totalPerSem[s.curriculum_semester] ?? 0) + 1
  }

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-r border-slate-800 overflow-hidden bg-slate-950">
      {/* Panel header */}
      <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-sm font-bold text-white">Asignaturas</p>
            <p className="text-xs text-slate-500 mt-0.5">{assignments.length} asignadas</p>
          </div>
        <div className="flex items-center gap-1.5">
          {incompleteCount > 0 && (
            <button
              onClick={() => { setShowIncompleteOnly(v => !v); setShowConflictsOnly(false) }}
              title={showIncompleteOnly ? 'Mostrar todas' : 'Mostrar solo incompletas'}
              className={clsx(
                'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all',
                showIncompleteOnly
                  ? 'bg-amber-900/30 border-amber-700/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-700/40'
              )}
            >
              <span className={clsx(
                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black',
                showIncompleteOnly ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400'
              )}>
                {incompleteCount}
              </span>
              Incompletas
            </button>
          )}
          {conflictCount > 0 && (
            <button
              onClick={() => { setShowConflictsOnly(v => !v); setShowIncompleteOnly(false) }}
              title={showConflictsOnly ? 'Mostrar todas' : 'Mostrar solo con conflicto'}
              className={clsx(
                'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all',
                showConflictsOnly
                  ? 'bg-red-900/30 border-red-700/40 text-red-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-700/40'
              )}
            >
              <span className={clsx(
                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black',
                showConflictsOnly ? 'bg-red-500 text-slate-900' : 'bg-slate-700 text-slate-400'
              )}>
                {conflictCount}
              </span>
              Conflictos
            </button>
          )}
        <button
          onClick={() => setShowAssign(true)}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 relative"
        >
          <Plus size={13} />
          Asignar
          {unassignedSubjects.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {unassignedSubjects.length}
            </span>
          )}
        </button>
        </div>
        </div>
        {/* Overall progress */}
        {totalNeeded > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-600">Bloques asignados</span>
              <span className="text-[10px] font-semibold" style={{ color: overallPct >= 100 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#64748b' }}>
                {totalScheduled}/{totalNeeded} · {overallPct}%
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${overallPct}%`,
                  backgroundColor: overallPct >= 100 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#3b82f6',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-950">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="w-full pl-7 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-md text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/50 focus:ring-1 focus:ring-brand-600/30 transition-all"
            placeholder="Buscar asignatura…"
            value={panelSearch}
            onChange={e => setPanelSearch(e.target.value)}
          />
          {panelSearch && (
            <button
              onClick={() => setPanelSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Semester quick filter */}
      {curriculumSemesters.length > 1 && (
        <div className="px-3 py-2 border-b border-slate-800 bg-slate-950 flex gap-1 flex-wrap">
          <button
            onClick={() => setSemFilter(null)}
            className={clsx(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all',
              semFilter === null
                ? 'bg-brand-600/20 border-brand-600/40 text-brand-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300'
            )}
          >
            Todos
          </button>
          {curriculumSemesters.sort((a, b) => a - b).map(cs => (
            <button
              key={cs}
              onClick={() => setSemFilter(semFilter === cs ? null : cs)}
              className={clsx(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all',
                semFilter === cs
                  ? 'bg-brand-600/20 border-brand-600/40 text-brand-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300'
              )}
            >
              Sem {cs}°
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {visibleAssignments.length === 0 && assignments.length > 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-600">Sin resultados</p>
          </div>
        )}
        {curriculumSemesters.sort((a, b) => a - b).map(cs => {
          const csAssigned = bySem[cs]?.length ?? 0
          const csTotal = totalPerSem[cs] ?? 0
          if (csAssigned === 0 && (panelSearch || showIncompleteOnly)) return null

          return (
            <div key={cs}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex-1">
                  Semestre {cs}° de Malla
                </p>
                <span className={clsx(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  csAssigned === csTotal && csTotal > 0
                    ? 'bg-emerald-900/40 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                )}>
                  {csAssigned}/{csTotal}
                </span>
              </div>

              <div className="space-y-2">
                {(bySem[cs] ?? []).map((assignment, idx) => {
                  const color = getColor(idx)
                  const isSelected = selectedAssignmentId === assignment.id
                  const needed = assignment.subject.blocks_per_week
                  const scheduled = assignment.scheduled_blocks.length
                  const complete = needed > 0 && scheduled >= needed
                  const lineColor = FORMATION_LINE_HEX[assignment.subject.formation_line]
                  const RoomIcon = ROOM_TYPE_ICONS[assignment.subject.room_type]
                  const profInitials = assignment.professor ? getInitials(assignment.professor.name) : null
                  const hasConflict = conflictAssignmentIds.has(assignment.id)

                  return (
                    <div
                      key={assignment.id}
                      ref={el => { if (el) cardRefs.current.set(assignment.id, el); else cardRefs.current.delete(assignment.id) }}
                      onClick={() => onSelect(isSelected ? null : assignment.id)}
                      className={clsx(
                        'rounded-lg border cursor-pointer transition-all duration-150 group overflow-hidden',
                        isSelected
                          ? 'shadow-lg ring-1 ring-white/10'
                          : hasConflict
                          ? 'hover:shadow-md'
                          : 'border-slate-700/50 hover:border-slate-600 hover:shadow-md'
                      )}
                      style={{
                        borderLeftWidth: '3px',
                        backgroundColor: isSelected ? color.bg + '20' : hasConflict ? '#2d1515' : '#1e293b',
                        borderTopColor: isSelected ? color.light + '35' : hasConflict ? '#7f1d1d50' : '#334155',
                        borderRightColor: isSelected ? color.light + '35' : hasConflict ? '#7f1d1d50' : '#334155',
                        borderBottomColor: isSelected ? color.light + '35' : hasConflict ? '#7f1d1d50' : '#334155',
                        borderLeftColor: hasConflict ? '#ef4444' : lineColor,
                      }}
                    >
                      <div className="p-2.5">
                        {/* Top row: name + icons */}
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white leading-tight line-clamp-2">
                              {assignment.subject.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            {hasConflict && (
                              <AlertTriangle size={12} className="text-red-400 flex-shrink-0" title="Conflicto de horario detectado" />
                            )}
                            <RoomIcon size={12} className="text-slate-500" />
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (confirm(`¿Eliminar asignación de "${assignment.subject.name}"?`))
                                  deleteMut.mutate(assignment.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-900/30 text-slate-600 hover:text-red-400 transition-all"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Professor row */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {assignment.professor ? (
                            <>
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                style={{ backgroundColor: color.bg + '60', color: color.light }}
                              >
                                {profInitials}
                              </div>
                              <span className="text-[11px] text-slate-400 truncate">{assignment.professor.name}</span>
                            </>
                          ) : (
                            <>
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] bg-amber-900/30 text-amber-500 flex-shrink-0 font-bold">
                                ?
                              </div>
                              <span className="text-[11px] text-amber-500/80">Sin profesor</span>
                            </>
                          )}
                        </div>

                        {/* Formation line badge */}
                        <div className="mt-1.5">
                          <span className={clsx(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-sm',
                            FORMATION_LINE_BG_CLASS[assignment.subject.formation_line]
                          )}>
                            {FORMATION_LINE_LABELS[assignment.subject.formation_line]}
                          </span>
                        </div>

                        {/* Progress bar */}
                        {needed > 0 && (
                          <div className="mt-2">
                            {complete ? (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-2 bg-emerald-900/40 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500 w-full" />
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5 whitespace-nowrap">
                                  <CheckCircle2 size={10} /> Completo
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min((scheduled / needed) * 100, 100)}%`,
                                      backgroundColor: color.light,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                  {scheduled}/{needed} bloq.
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {!(bySem[cs]?.length) && (
                  <p className="text-xs text-slate-700 italic px-2 py-1">Sin asignaturas asignadas</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Assign modal */}
      <Modal open={showAssign} onClose={() => { setShowAssign(false); setAssignForm({ subject_id: 0, professor_id: '' }) }} title="Asignar Asignatura al Semestre">
        <div className="space-y-4">
          <div>
            <label className="label">Asignatura</label>
            <select
              className="input"
              value={assignForm.subject_id}
              onChange={e => setAssignForm(f => ({ ...f, subject_id: Number(e.target.value) }))}
            >
              <option value={0}>— Seleccionar asignatura —</option>
              {(Object.keys(subjectsByLine) as FormationLine[]).sort().map(line => (
                <optgroup key={line} label={`— ${FORMATION_LINE_LABELS[line]} —`}>
                  {subjectsByLine[line].map(s => (
                    <option key={s.id} value={s.id} disabled={assignedSubjectIds.has(s.id)}>
                      {assignedSubjectIds.has(s.id) ? '✓ ' : ''}{s.name} (Sem. {s.curriculum_semester})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Preview card */}
          {previewSubject && (
            <div
              className="rounded-lg p-3 border bg-slate-800/60"
              style={{
                borderLeftWidth: '3px',
                borderTopColor: '#334155',
                borderRightColor: '#334155',
                borderBottomColor: '#334155',
                borderLeftColor: FORMATION_LINE_HEX[previewSubject.formation_line],
              }}
            >
              <p className="text-xs font-semibold text-white mb-1">{previewSubject.name}</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className={clsx('px-1.5 py-0.5 rounded-sm', FORMATION_LINE_BG_CLASS[previewSubject.formation_line])}>
                  {FORMATION_LINE_LABELS[previewSubject.formation_line]}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  {React.createElement(ROOM_TYPE_ICONS[previewSubject.room_type], { size: 11 })}
                  {ROOM_TYPE_LABELS[previewSubject.room_type]}
                </span>
                <span className="text-slate-400">{previewSubject.blocks_per_week} bloq/sem</span>
                <span className="text-slate-500">Sem. {previewSubject.curriculum_semester}</span>
              </div>
            </div>
          )}

          <div>
            <label className="label">Profesor (opcional)</label>
            <select
              className="input"
              value={assignForm.professor_id}
              onChange={e => setAssignForm(f => ({ ...f, professor_id: e.target.value }))}
            >
              <option value="">— Asignar luego —</option>
              {professors.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowAssign(false); setAssignForm({ subject_id: 0, professor_id: '' }) }} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!assignForm.subject_id || createMut.isPending}
              className="btn-primary"
            >
              {createMut.isPending ? 'Creando…' : 'Crear asignación'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── WeeklyGrid ───────────────────────────────────────────────────────────────

function WeeklyGrid({
  blocks,
  assignments,
  selectedAssignmentId,
  availableBlocks,
  onCellClick,
}: {
  blocks: Block[]
  assignments: Assignment[]
  selectedAssignmentId: number | null
  availableBlocks: { day: number; block_number: number; status: string }[]
  onCellClick: (day: number, blockNumber: number) => void
}) {
  // Build a lookup: (day, blockNumber) → assignment info + color idx
  const gridMap = useMemo(() => {
    const m: Record<string, { assignment: Assignment; colorIdx: number; scheduledBlockId: number }[]> = {}
    assignments.forEach((a, idx) => {
      for (const sb of a.scheduled_blocks) {
        const key = `${sb.day}-${sb.block_number}`
        if (!m[key]) m[key] = []
        m[key].push({ assignment: a, colorIdx: idx, scheduledBlockId: sb.id })
      }
    })
    return m
  }, [assignments])

  // Build available blocks set (when selection active)
  const availMap: Record<string, string> = {}
  for (const ab of availableBlocks) {
    availMap[`${ab.day}-${ab.block_number}`] = ab.status
  }

  // Client-side conflict detection: cells where 2+ assignments from the same curriculum semester overlap
  const conflictCells = useMemo(() => {
    const cellBySem: Record<string, Map<number, number[]>> = {}
    assignments.forEach(a => {
      for (const sb of a.scheduled_blocks) {
        const k = `${sb.day}-${sb.block_number}`
        if (!cellBySem[k]) cellBySem[k] = new Map()
        const sem = a.subject.curriculum_semester
        if (!cellBySem[k].has(sem)) cellBySem[k].set(sem, [])
        cellBySem[k].get(sem)!.push(a.id)
      }
    })
    const cells = new Set<string>()
    Object.entries(cellBySem).forEach(([k, semMap]) => {
      semMap.forEach(ids => { if (ids.length > 1) cells.add(k) })
    })
    return cells
  }, [assignments])

  // Group blocks by visual sessions
  const sessions = [
    { label: 'Mañana',     timeRange: '08:30 – 14:35', blocks: blocks.filter(b => b.number <= 8) },
    { label: 'Tarde',      timeRange: '14:50 – 17:45', blocks: blocks.filter(b => b.number >= 9 && b.number <= 12) },
    { label: 'Vespertino', timeRange: '18:30 – 23:00', blocks: blocks.filter(b => b.number >= 13) },
  ]

  // Day column subtle accent colors (alternating)
  const dayAccents = [
    'border-b-blue-700/40',
    'border-b-indigo-700/40',
    'border-b-violet-700/40',
    'border-b-purple-700/40',
    'border-b-sky-700/40',
    'border-b-cyan-700/40',
  ]

  return (
    <div className="flex-1 overflow-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-950 shadow-md">
          <tr>
            <th className="w-28 px-3 py-3 text-left text-slate-600 border-b-2 border-slate-800 font-medium align-bottom">
              <span className="text-[11px]">Bloque</span>
            </th>
            {DAYS_SHORT.map((d, i) => (
              <th
                key={d}
                className={clsx(
                  'px-2 py-3 text-center font-bold min-w-[120px] border-b-2',
                  dayAccents[i],
                  'text-slate-300'
                )}
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map(({ label, timeRange, blocks: sBlocks }) => (
            <React.Fragment key={label}>
              <tr>
                <td colSpan={7} className="px-3 py-2 bg-slate-900/70 border-y border-slate-800/60">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-slate-400 font-bold tracking-wide">{label}</span>
                    <span className="text-[10px] text-slate-600">{timeRange}</span>
                  </div>
                </td>
              </tr>
              {sBlocks.map(block => (
                <tr key={block.number} className="group/row hover:bg-slate-900/20">
                  {/* Block time label */}
                  <td className="px-3 border-b border-slate-800/30 text-slate-600 whitespace-nowrap align-middle">
                    <div className="flex flex-col leading-none py-1">
                      <span className="font-bold text-slate-400 text-[13px]">{block.number}</span>
                      <span className="text-[10px] text-slate-600 mt-0.5">{block.start_time}</span>
                      <span className="text-[9px] text-slate-700 mt-0.5">{block.end_time}</span>
                    </div>
                  </td>
                  {[0, 1, 2, 3, 4, 5].map(day => {
                    const key = `${day}-${block.number}`
                    const cellAssignments = gridMap[key] ?? []
                    const status = selectedAssignmentId ? (availMap[key] ?? 'no_assignment') : 'no_assignment'
                    const isSelf = cellAssignments.some(c => c.assignment.id === selectedAssignmentId)
                    const hasConflict = conflictCells.has(key)

                    let cellStyle = STATUS_STYLES[status] || STATUS_STYLES.no_assignment
                    if (isSelf) cellStyle = STATUS_STYLES.occupied_self

                    return (
                      <td
                        key={day}
                        className={clsx(
                          'px-1.5 py-1 border-b border-slate-800/30 align-middle',
                          cellAssignments.length > 0 && 'cursor-pointer'
                        )}
                        onClick={() => onCellClick(day, block.number)}
                      >
                        {cellAssignments.length > 0 ? (
                          <div className={clsx(
                            'space-y-0.5 relative rounded-md',
                            hasConflict && 'ring-1 ring-red-500/70 ring-inset'
                          )}>
                            {hasConflict && (
                              <div className="absolute top-0.5 right-0.5 z-10 pointer-events-none">
                                <AlertTriangle size={9} className="text-red-400" />
                              </div>
                            )}
                            {cellAssignments.map(({ assignment, colorIdx, scheduledBlockId }) => {
                              const color = getColor(colorIdx)
                              const isThisSelected = assignment.id === selectedAssignmentId
                              const lineColor = FORMATION_LINE_HEX[assignment.subject.formation_line]

                              return (
                                <div
                                  key={scheduledBlockId}
                                  className="flex items-center gap-1.5 rounded-md px-2 h-10 overflow-hidden transition-all duration-100"
                                  style={{
                                    backgroundColor: color.bg + '45',
                                    border: isThisSelected
                                      ? `1.5px solid ${color.light}80`
                                      : `1px solid ${color.bg}70`,
                                    outline: isThisSelected ? `2px solid ${color.light}40` : 'none',
                                    outlineOffset: '1px',
                                  }}
                                  title={`${assignment.subject.name}${assignment.professor ? ` — ${assignment.professor.name}` : ''}`}
                                >
                                  {/* Formation line dot */}
                                  <div
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: lineColor }}
                                  />
                                  <span
                                    className="text-[11px] font-medium leading-tight truncate flex-1"
                                    style={{ color: color.light }}
                                  >
                                    {abbreviateSubject(assignment.subject.name, 3)}
                                  </span>
                                  {assignment.professor && (
                                    <span
                                      className="text-[9px] font-bold flex-shrink-0 px-1 py-0.5 rounded"
                                      style={{ color: color.light, backgroundColor: color.bg + '60', opacity: 0.85 }}
                                    >
                                      {getInitials(assignment.professor.name)}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div
                            className={clsx(
                              'h-10 rounded-md border flex items-center justify-center transition-all duration-100',
                              cellStyle
                            )}
                          >
                            {selectedAssignmentId && status === 'available' && (
                              <Plus size={14} className="text-emerald-400/70" />
                            )}
                            {status === 'protected' && (
                              <Lock size={11} className="text-red-500/50" />
                            )}
                            {status === 'lab_blocked' && (
                              <span className="text-orange-500/60 text-[11px] font-medium select-none">Lab</span>
                            )}
                            {status === 'professor_unavailable' && (
                              <span className="text-yellow-500/50 text-[11px] font-bold select-none">≠</span>
                            )}
                            {status === 'conflict' && (
                              <AlertTriangle size={11} className="text-red-400/70" />
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-800 bg-slate-900/50">
            <td className="px-3 py-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
              Bloques
            </td>
            {[0, 1, 2, 3, 4, 5].map(day => {
              const count = assignments.flatMap(a => a.scheduled_blocks).filter(sb => sb.day === day).length
              return (
                <td key={day} className="px-1.5 py-2 text-center">
                  {count > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600/20 text-brand-300 text-[11px] font-bold">
                      {count}
                    </span>
                  ) : (
                    <span className="text-slate-700 text-[11px]">—</span>
                  )}
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── SelectedSubjectBar ───────────────────────────────────────────────────────

function SelectedSubjectBar({
  assignment,
  professors,
  onDeselect,
  onChangeProfessor,
  onClearBlocks,
}: {
  assignment: Assignment
  professors: Professor[]
  onDeselect: () => void
  onChangeProfessor: (profId: number | null) => void
  onClearBlocks: () => void
}) {
  const [editingProf, setEditingProf] = useState(false)
  const needed = assignment.subject.blocks_per_week
  const scheduled = assignment.scheduled_blocks.length
  const complete = needed > 0 && scheduled >= needed
  const RoomIcon = ROOM_TYPE_ICONS[assignment.subject.room_type]
  const lineColor = FORMATION_LINE_HEX[assignment.subject.formation_line]

  return (
    <div
      className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-700/60 flex-shrink-0 flex-wrap"
      style={{
        background: 'linear-gradient(to right, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)',
        borderTopWidth: '2px',
        borderTopColor: lineColor + '60',
      }}
    >
      {/* Pulse indicator + name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: lineColor }} />
        <span className="text-sm font-bold text-white truncate max-w-[240px]">{assignment.subject.name}</span>
      </div>

      {/* Formation line badge */}
      <span className={clsx(
        'text-[11px] font-semibold px-2 py-0.5 rounded-sm flex-shrink-0',
        FORMATION_LINE_BG_CLASS[assignment.subject.formation_line]
      )}>
        {FORMATION_LINE_LABELS[assignment.subject.formation_line]}
      </span>

      {/* Room type */}
      <span className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
        <RoomIcon size={12} className="text-slate-500" />
        {ROOM_TYPE_LABELS[assignment.subject.room_type]}
      </span>

      {/* Professor (click to edit) */}
      {editingProf ? (
        <select
          className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 outline-none focus:ring-1 focus:ring-brand-500 flex-shrink-0 max-w-[180px]"
          value={assignment.professor_id ?? ''}
          onChange={e => {
            const val = e.target.value
            onChangeProfessor(val ? Number(val) : null)
            setEditingProf(false)
          }}
          onBlur={() => setEditingProf(false)}
          autoFocus
        >
          <option value="">— Sin profesor —</option>
          {professors.filter(p => p.is_active).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      ) : (
        <button
          onClick={() => setEditingProf(true)}
          className="flex items-center gap-1 text-[11px] flex-shrink-0 group/prof hover:bg-slate-700/60 rounded px-1.5 py-0.5 transition-colors"
          title="Cambiar profesor"
        >
          <UserCircle size={13} className="text-slate-500 flex-shrink-0" />
          <span className={assignment.professor ? 'text-slate-300' : 'text-amber-500/80'}>
            {assignment.professor ? assignment.professor.name : 'Sin profesor'}
          </span>
          <Pencil size={9} className="text-slate-600 opacity-0 group-hover/prof:opacity-100 transition-opacity ml-0.5 flex-shrink-0" />
        </button>
      )}

      {/* Blocks progress pill */}
      <span className={clsx(
        'flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0',
        complete
          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40'
          : 'bg-slate-800 text-slate-300 border border-slate-700'
      )}>
        {complete && <CheckCircle2 size={11} />}
        {scheduled} de {needed} bloques
      </span>

      {/* Clear blocks */}
      {scheduled > 0 && (
        <button
          onClick={() => { if (confirm(`¿Quitar los ${scheduled} bloques de "${assignment.subject.name}"?`)) onClearBlocks() }}
          className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-red-400 hover:bg-red-900/20 border border-transparent hover:border-red-800/40 px-2 py-1 rounded-md transition-all flex-shrink-0"
          title="Limpiar todos los bloques"
        >
          <Trash2 size={11} /> Limpiar
        </button>
      )}

      {/* Legend */}
      <div className="hidden xl:flex items-center gap-3 ml-2 flex-shrink-0">
        <LegendItem color="bg-emerald-500/15 border-emerald-500/40" label="Disponible" />
        <LegendItem color="bg-yellow-900/20 border-yellow-600/30" label="Prof. no disponible" />
        <LegendItem color="bg-orange-900/20 border-orange-600/30" label="Lab bloqueado" />
        <LegendItem color="bg-red-900/25 border-red-700/40" label="Protegido" />
        <LegendItem color="bg-slate-800/60 border-slate-700/50" label="Ocupado" />
      </div>

      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] text-slate-600 hidden lg:block">ESC para deseleccionar</span>
        <button
          onClick={onDeselect}
          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/40 transition-colors"
        >
          <X size={12} />
          Deseleccionar
        </button>
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
      <span className={clsx('w-4 h-3 rounded border inline-block flex-shrink-0', color)} />
      {label}
    </span>
  )
}

// ─── NoSelectionHint ──────────────────────────────────────────────────────────

function NoSelectionHint() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-2 border-b border-slate-800/60 flex-shrink-0 bg-slate-900/30">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
      <p className="text-xs text-slate-500">
        Selecciona una asignatura en el panel izquierdo para ver y asignar bloques horarios
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Planificacion() {
  const qc = useQueryClient()
  const { data: semesters = [] } = useQuery<AcademicSemester[]>({ queryKey: ['semesters'], queryFn: getSemesters })
  const active = semesters.find(s => s.is_active) ?? semesters[0]
  const [selectedSemId, setSelectedSemId] = useState<number | null>(null)
  const semId = selectedSemId ?? active?.id ?? null

  const currentSem = semesters.find(s => s.id === semId)

  const { data: assignments = [], isLoading: loadingAssign } = useQuery<Assignment[]>({
    queryKey: ['assignments', semId],
    queryFn: () => getAssignments(semId!),
    enabled: !!semId,
  })

  const { data: professors = [] } = useQuery<Professor[]>({ queryKey: ['professors'], queryFn: getProfessors })
  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ['subjects'], queryFn: () => getSubjects() })
  const { data: blocks = [] } = useQuery<Block[]>({ queryKey: ['blocks'], queryFn: getBlocks })

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)

  const { data: availableBlocks = [] } = useQuery({
    queryKey: ['available-blocks', selectedAssignmentId],
    queryFn: () => getAvailableBlocks(selectedAssignmentId!),
    enabled: !!selectedAssignmentId,
  })

  // Detect which assignments are in conflict (same curriculum semester + same time slot)
  const conflictAssignmentIds = useMemo(() => {
    const cellBySem: Record<string, Map<number, number[]>> = {}
    assignments.forEach(a => {
      for (const sb of a.scheduled_blocks) {
        const k = `${sb.day}-${sb.block_number}`
        if (!cellBySem[k]) cellBySem[k] = new Map()
        const sem = a.subject.curriculum_semester
        if (!cellBySem[k].has(sem)) cellBySem[k].set(sem, [])
        cellBySem[k].get(sem)!.push(a.id)
      }
    })
    const ids = new Set<number>()
    Object.values(cellBySem).forEach(semMap => {
      semMap.forEach(aIds => { if (aIds.length > 1) aIds.forEach(id => ids.add(id)) })
    })
    return ids
  }, [assignments])

  // Keyboard shortcut: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAssignmentId !== null) {
        setSelectedAssignmentId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAssignmentId])

  const addBlockMut = useMutation({
    mutationFn: (data: { day: number; block_number: number }) =>
      addScheduledBlock({
        assignment_id: selectedAssignmentId!,
        day: data.day,
        block_number: data.block_number,
        room_type_used: 'theoretical',
      }),
    onSuccess: (_, { day, block_number }) => {
      const block = blocks.find(b => b.number === block_number)
      const dayLabel = DAYS_SHORT[day] ?? `Día ${day}`
      toast.success(`${dayLabel} ${block?.start_time ?? `Bloque ${block_number}`}`, { duration: 1500 })
      qc.invalidateQueries({ queryKey: ['assignments', semId] })
      qc.invalidateQueries({ queryKey: ['available-blocks', selectedAssignmentId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al asignar bloque'),
  })

  const removeBlockMut = useMutation({
    mutationFn: (blockId: number) => removeScheduledBlock(blockId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', semId] })
      qc.invalidateQueries({ queryKey: ['available-blocks', selectedAssignmentId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updateProfMut = useMutation({
    mutationFn: ({ assignmentId, profId }: { assignmentId: number; profId: number | null }) =>
      updateAssignment(assignmentId, { professor_id: profId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', semId] })
      toast.success('Profesor actualizado')
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const handleCellClick = (day: number, blockNumber: number) => {
    // If no assignment selected, clicking an occupied cell selects it
    if (!selectedAssignmentId) {
      const occupying = assignments.find(a =>
        a.scheduled_blocks.some(sb => sb.day === day && sb.block_number === blockNumber)
      )
      if (occupying) {
        setSelectedAssignmentId(occupying.id)
        qc.invalidateQueries({ queryKey: ['available-blocks', occupying.id] })
      }
      return
    }

    const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId)
    if (!selectedAssignment) return

    // Check if this cell has a block for the selected assignment
    const existingBlock = selectedAssignment.scheduled_blocks.find(
      sb => sb.day === day && sb.block_number === blockNumber
    )
    if (existingBlock) {
      removeBlockMut.mutate(existingBlock.id)
      return
    }

    const status = availableBlocks.find((ab: any) => ab.day === day && ab.block_number === blockNumber)?.status
    if (status === 'available') {
      addBlockMut.mutate({ day, block_number: blockNumber })
    } else if (status === 'occupied_other') {
      const occupier = assignments.find(a =>
        a.id !== selectedAssignmentId &&
        a.scheduled_blocks.some(sb => sb.day === day && sb.block_number === blockNumber)
      )
      toast(`Ocupado por: ${occupier?.subject.name ?? 'otra asignatura'}`, { icon: '🔒', duration: 2000 })
    } else if (status === 'protected') {
      toast('Bloque protegido — no disponible', { icon: '⛔', duration: 2000 })
    } else if (status === 'professor_unavailable') {
      toast('El profesor no está disponible en este horario', { icon: '⚠️', duration: 2500 })
    } else if (status === 'lab_blocked') {
      toast('Laboratorio bloqueado en este horario', { icon: '🧪', duration: 2000 })
    } else if (status === 'conflict') {
      toast.error('Conflicto de horario — revisa las asignaciones', { duration: 2500 })
    }
  }

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId)

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3.5 border-b border-slate-800 flex-shrink-0 bg-slate-950/90 backdrop-blur-sm">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Planificación de Horarios</h1>
          {currentSem && (
            <p className="text-xs text-slate-500 mt-0.5">{currentSem.label}</p>
          )}
        </div>
        {/* Quick stats */}
        {assignments.length > 0 && (() => {
          const needed    = assignments.reduce((s, a) => s + a.subject.blocks_per_week, 0)
          const scheduled = assignments.reduce((s, a) => s + a.scheduled_blocks.length, 0)
          const pct       = needed > 0 ? Math.round((scheduled / needed) * 100) : 0
          return (
            <div className="hidden md:flex items-center gap-3 ml-4">
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#3b82f6' }} />
                </div>
                <span className="text-xs font-semibold text-slate-400">{pct}%</span>
              </div>
              <span className="text-[11px] text-slate-600">{scheduled}/{needed} bloques</span>
            </div>
          )
        })()}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500">Semestre activo:</span>
          <select
            className="input py-1.5 text-sm w-40"
            value={semId ?? ''}
            onChange={e => {
              setSelectedSemId(Number(e.target.value))
              setSelectedAssignmentId(null)
            }}
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>
                {s.label}{s.is_active ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected subject bar or hint */}
      {selectedAssignment ? (
        <SelectedSubjectBar
          assignment={selectedAssignment}
          professors={professors}
          onDeselect={() => setSelectedAssignmentId(null)}
          onChangeProfessor={(profId) => updateProfMut.mutate({ assignmentId: selectedAssignment.id, profId })}
          onClearBlocks={async () => {
            for (const sb of selectedAssignment.scheduled_blocks) {
              await removeBlockMut.mutateAsync(sb.id)
            }
            toast.success('Bloques eliminados')
          }}
        />
      ) : (
        <NoSelectionHint />
      )}

      {/* Main content */}
      {!semId ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <BookOpen size={40} className="mx-auto mb-3 text-slate-700" />
            <p className="text-lg font-semibold mb-1 text-slate-400">No hay semestre activo</p>
            <p className="text-sm text-slate-600">Ve a Semestres para crear y activar un semestre académico</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <AssignmentPanel
            semesterId={semId}
            curriculumSemesters={currentSem?.curriculum_semester_numbers ?? []}
            selectedAssignmentId={selectedAssignmentId}
            onSelect={id => {
              setSelectedAssignmentId(id)
              if (id) qc.invalidateQueries({ queryKey: ['available-blocks', id] })
            }}
            assignments={assignments}
            subjects={subjects}
            professors={professors}
            isRefetching={loadingAssign}
            conflictAssignmentIds={conflictAssignmentIds}
          />
          <WeeklyGrid
            blocks={blocks}
            assignments={assignments}
            selectedAssignmentId={selectedAssignmentId}
            availableBlocks={availableBlocks}
            onCellClick={handleCellClick}
          />
        </div>
      )}
    </div>
  )
}
