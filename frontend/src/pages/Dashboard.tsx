import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDashboard, getSemesters, getSubjects, getAssignments, getConflicts } from '../api/client'
import {
  AcademicSemester, DashboardData, Assignment, Subject, FormationLine,
  FORMATION_LINE_LABELS, FORMATION_LINE_COLORS, DAYS_SHORT,
} from '../types'
import {
  BookOpen, Users, CheckCircle2, AlertTriangle,
  TrendingUp, CalendarDays, BarChart3, Zap, ArrowRight,
} from 'lucide-react'

// ── Donut arc SVG ────────────────────────────────────────────────────────────

function DonutArc({
  pct,
  size = 52,
  stroke = 5,
  trackColor,
  fillColor,
}: {
  pct: number
  size?: number
  stroke?: number
  trackColor: string
  fillColor: string
}) {
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.min(pct, 1))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {/* track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      {/* fill */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={fillColor}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.7s ease' }}
      />
    </svg>
  )
}

// ── Formation line config ────────────────────────────────────────────────────

const LINE_CONFIG: Record<FormationLine, {
  trackHex: string
  fillHex: string
  textClass: string
  bgClass: string
  borderClass: string
}> = {
  especialidad:     { trackHex: '#1e3a5f', fillHex: '#3b82f6', textClass: 'text-blue-300',    bgClass: 'bg-blue-900/30',    borderClass: 'border-blue-700/50' },
  interdisciplinar: { trackHex: '#2e1b5f', fillHex: '#8b5cf6', textClass: 'text-violet-300',  bgClass: 'bg-violet-900/30',  borderClass: 'border-violet-700/50' },
  general:          { trackHex: '#0d3322', fillHex: '#10b981', textClass: 'text-emerald-300', bgClass: 'bg-emerald-900/30', borderClass: 'border-emerald-700/50' },
  basica:           { trackHex: '#3d2706', fillHex: '#f59e0b', textClass: 'text-amber-300',   bgClass: 'bg-amber-900/30',   borderClass: 'border-amber-700/50' },
}

const FORMATION_LINES: FormationLine[] = ['especialidad', 'interdisciplinar', 'general', 'basica']

// ── Formation line cards ─────────────────────────────────────────────────────

function FormationLineCard({
  line,
  subjects,
  assignments,
}: {
  line: FormationLine
  subjects: Subject[]
  assignments: Assignment[]
}) {
  const cfg = LINE_CONFIG[line]
  const lineSubjects = subjects.filter(s => s.formation_line === line)
  const total = lineSubjects.length
  const lineAssignments = assignments.filter(a => a.subject.formation_line === line)
  const scheduled = lineAssignments.filter(
    a => a.scheduled_blocks.length > 0 && a.scheduled_blocks.length >= a.subject.blocks_per_week
  ).length
  const pct = total > 0 ? scheduled / total : 0

  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-4 ${cfg.bgClass} ${cfg.borderClass}`}
      style={{ borderLeftWidth: 3 }}
    >
      <DonutArc pct={pct} trackColor={cfg.trackHex} fillColor={cfg.fillHex} />
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${cfg.textClass} truncate`}>
          {FORMATION_LINE_LABELS[line]}
        </p>
        <p className="text-lg font-bold text-white leading-tight">
          {scheduled}<span className="text-slate-400 text-sm font-normal">/{total}</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {total === 0 ? 'Sin asignaturas' : `${Math.round(pct * 100)}% completado`}
        </p>
      </div>
    </div>
  )
}

// ── Stat card (improved) ─────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  pct,
  accentClass,
  accentHex,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  pct?: number
  accentClass: string
  accentHex: string
}) {
  return (
    <div
      className="card p-5 flex items-start gap-4 relative overflow-hidden"
      style={{ borderBottom: `2px solid ${accentHex}` }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accentClass} bg-opacity-20`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400 leading-tight">{label}</p>
        {pct !== undefined && (
          <p className="text-xs mt-1 font-medium" style={{ color: accentHex }}>
            {pct}% completado
          </p>
        )}
      </div>
    </div>
  )
}

// ── Needs attention list ─────────────────────────────────────────────────────

type AttentionItem =
  | { kind: 'issue';      assignment: Assignment }
  | { kind: 'unassigned'; subject: Subject       }

function NeedsAttentionItem({ item }: { item: AttentionItem }) {
  let name: string
  let semNum: number
  const issues: string[] = []

  if (item.kind === 'issue') {
    const a = item.assignment
    name   = a.subject.name
    semNum = a.subject.curriculum_semester
    if (!a.professor) issues.push('sin profesor')
    if (a.scheduled_blocks.length === 0) issues.push('sin bloques')
    else if (a.scheduled_blocks.length < a.subject.blocks_per_week)
      issues.push(`${a.scheduled_blocks.length}/${a.subject.blocks_per_week} bloques`)
  } else {
    name   = item.subject.name
    semNum = item.subject.curriculum_semester
    issues.push('sin asignar')
  }

  const isUnassigned = item.kind === 'unassigned'

  return (
    <Link
      to="/planificacion"
      className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 rounded-lg px-1.5 -mx-1.5 transition-colors group"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isUnassigned ? 'bg-slate-600' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate font-medium ${isUnassigned ? 'text-slate-400' : 'text-white'}`}>{name}</p>
        <p className="text-xs text-slate-500">Sem. {semNum}</p>
      </div>
      <div className="flex gap-1 flex-wrap justify-end items-center">
        {issues.map(issue => (
          <span
            key={issue}
            className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
              isUnassigned
                ? 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                : 'bg-amber-900/30 text-amber-300 border-amber-700/40'
            }`}
          >
            {issue}
          </span>
        ))}
        <ArrowRight size={11} className="text-slate-700 group-hover:text-slate-500 transition-colors flex-shrink-0 ml-0.5" />
      </div>
    </Link>
  )
}

// ── Days indicator ───────────────────────────────────────────────────────────

function DaysIndicator({ assignments }: { assignments: Assignment[] }) {
  // days that have at least one scheduled block (1=Mon … 6=Sat)
  const activeDays = new Set(
    assignments.flatMap(a => a.scheduled_blocks.map(b => b.day))
  )

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 font-medium">Días con clases:</span>
      <div className="flex gap-1.5">
        {DAYS_SHORT.map((label, i) => {
          const day = i
          const active = activeDays.has(day)
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  active ? 'bg-brand-400' : 'bg-slate-700'
                }`}
              />
              <span className={`text-[10px] leading-none ${active ? 'text-slate-300' : 'text-slate-600'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Weekly distribution chart ───────────────────────────────────────────────

const DAY_LABELS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function WeeklyDistribution({ assignments }: { assignments: Assignment[] }) {
  const blocksPerDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0]
    for (const a of assignments)
      for (const sb of a.scheduled_blocks)
        if (sb.day >= 0 && sb.day <= 5) counts[sb.day]++
    return counts
  }, [assignments])

  const maxCount = Math.max(...blocksPerDay, 1)
  const totalBlocks = blocksPerDay.reduce((s, c) => s + c, 0)
  const activeDays = blocksPerDay.filter(c => c > 0).length
  const avgPerActive = activeDays > 0 ? Math.round(totalBlocks / activeDays) : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2 h-20">
        {DAY_LABELS_FULL.map((label, i) => {
          const count = blocksPerDay[i]
          const pct = count / maxCount
          const hex = count === 0
            ? '#1e293b'
            : count < avgPerActive
            ? '#3b82f6'
            : count === avgPerActive
            ? '#10b981'
            : '#f59e0b'
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              {count > 0 && (
                <span className="text-[11px] font-bold text-slate-400">{count}</span>
              )}
              <div className="w-full flex items-end flex-1">
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: count > 0 ? `${Math.max(pct * 60, 6)}px` : '3px',
                    backgroundColor: hex,
                    opacity: count === 0 ? 0.3 : 1,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        {DAY_LABELS_FULL.map((label, i) => {
          const count = blocksPerDay[i]
          return (
            <div key={label} className="flex-1 text-center">
              <span className={`text-[11px] font-medium ${count > 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                {label.slice(0, 3)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-600 pt-1 border-t border-slate-800/60">
        <span><strong className="text-slate-400">{totalBlocks}</strong> bloques totales</span>
        <span><strong className="text-slate-400">{activeDays}</strong> días activos</span>
        {activeDays > 0 && <span>prom. <strong className="text-slate-400">{avgPerActive}</strong>/día</span>}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: semesters = [], isLoading: loadingSems } = useQuery<AcademicSemester[]>({
    queryKey: ['semesters'],
    queryFn: getSemesters,
  })
  const active = semesters.find(s => s.is_active) ?? semesters[0]
  const semId = active?.id

  const { data: stats, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', semId],
    queryFn: () => getDashboard(semId!),
    enabled: !!semId,
  })

  const { data: allSubjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
    enabled: !!semId,
  })

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', semId],
    queryFn: () => getAssignments(semId!),
    enabled: !!semId,
  })

  const { data: conflicts = [] } = useQuery<{ day: number; block_number: number; curriculum_semester: number; subjects: { subject: string; assignment_id: number }[] }[]>({
    queryKey: ['conflicts', semId],
    queryFn: () => getConflicts(semId!),
    enabled: !!semId && !!stats && stats.total_conflicts > 0,
    staleTime: 30_000,
  })

  // "Needs attention": assignment issues + unassigned curriculum subjects
  const needsAttention = useMemo((): AttentionItem[] => {
    const issues: AttentionItem[] = assignments
      .filter(a => {
        const missingProf = !a.professor
        const missingBlocks = a.scheduled_blocks.length === 0
        const partialBlocks = a.scheduled_blocks.length < a.subject.blocks_per_week
        return missingProf || missingBlocks || partialBlocks
      })
      .map(a => ({ kind: 'issue' as const, assignment: a }))

    const assignedIds = new Set(assignments.map(a => a.subject_id))
    const currSems = stats?.curriculum_semesters ?? []
    const unassigned: AttentionItem[] = allSubjects
      .filter(s => currSems.includes(s.curriculum_semester) && !assignedIds.has(s.id))
      .map(s => ({ kind: 'unassigned' as const, subject: s }))

    return [...issues, ...unassigned]
  }, [assignments, allSubjects, stats?.curriculum_semesters])

  const MAX_ATTENTION = 5

  if (loadingSems || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando dashboard…</p>
        </div>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <CalendarDays size={48} className="mx-auto mb-4 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-300 mb-2">Sin semestre configurado</h2>
          <p className="text-sm text-slate-500 mb-5">Crea y activa un semestre académico para comenzar a planificar.</p>
          <Link to="/semestres" className="btn-primary">
            <CalendarDays size={15} /> Ir a Semestres
          </Link>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando estadísticas…</p>
        </div>
      </div>
    )
  }

  const progress = stats.progress_pct

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-emerald-400 font-medium">Semestre activo</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Semestre {active.label}</h1>
        <p className="text-slate-400 mt-1">
          Planificando semestres de malla:{' '}
          {stats.curriculum_semesters.map(n => `Semestre ${n}`).join(', ') || 'Ninguno configurado'}
        </p>
      </div>

      {/* ── Gradient progress bar ────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-400" />
            <span className="font-semibold text-white">Progreso de Planificación</span>
          </div>
          <span className="text-2xl font-bold text-brand-400">{progress}%</span>
        </div>

        {/* Gradient bar with shimmer */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden relative">
          <div
            className="h-full rounded-full relative overflow-hidden transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)',
              backgroundSize: '200% 100%',
              backgroundPosition: `${100 - progress}% 0`,
            }}
          >
            {/* shimmer overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear',
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-500">
            {stats.fully_scheduled} de {stats.total_subjects} asignaturas completamente planificadas
          </p>
          {assignments.length > 0 && <DaysIndicator assignments={assignments} />}
        </div>
      </div>

      {/* ── Main stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Total asignaturas"
          value={stats.total_subjects}
          pct={stats.total_subjects > 0 ? Math.round((stats.total_assigned / stats.total_subjects) * 100) : 0}
          accentClass="bg-blue-600"
          accentHex="#3b82f6"
        />
        <StatCard
          icon={CalendarDays}
          label="Con bloques asignados"
          value={stats.with_blocks}
          pct={stats.total_subjects > 0 ? Math.round((stats.with_blocks / stats.total_subjects) * 100) : 0}
          accentClass="bg-indigo-600"
          accentHex="#6366f1"
        />
        <StatCard
          icon={Users}
          label="Profesores involucrados"
          value={stats.total_professors}
          accentClass="bg-violet-600"
          accentHex="#8b5cf6"
        />
        <StatCard
          icon={stats.total_conflicts > 0 ? AlertTriangle : CheckCircle2}
          label="Conflictos de horario"
          value={stats.total_conflicts}
          accentClass={stats.total_conflicts > 0 ? 'bg-red-600' : 'bg-emerald-600'}
          accentHex={stats.total_conflicts > 0 ? '#ef4444' : '#10b981'}
        />
      </div>

      {/* ── Formation lines grid ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">Progreso por Línea de Formación</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FORMATION_LINES.map(line => (
            <FormationLineCard
              key={line}
              line={line}
              subjects={allSubjects}
              assignments={assignments}
            />
          ))}
        </div>
      </div>

      {/* ── Weekly distribution ─────────────────────────────────────────────── */}
      {assignments.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-300">Distribución Semanal</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#3b82f6' }} />
                Bajo promedio
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#10b981' }} />
                Promedio
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#f59e0b' }} />
                Sobre promedio
              </span>
            </div>
          </div>
          <WeeklyDistribution assignments={assignments} />
        </div>
      )}

      {/* ── Bottom row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Needs attention */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-slate-300">Pendientes</span>
            <div className="ml-auto flex items-center gap-1.5">
              {(() => {
                const issueCount = needsAttention.filter(i => i.kind === 'issue').length
                const unassignedCount = needsAttention.filter(i => i.kind === 'unassigned').length
                return (
                  <>
                    {issueCount > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40">
                        {issueCount} issues
                      </span>
                    )}
                    {unassignedCount > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/40">
                        {unassignedCount} sin asignar
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
          {needsAttention.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-emerald-400">
              <CheckCircle2 size={16} />
              <span className="text-sm">Todo en orden</span>
            </div>
          ) : (
            <>
              {needsAttention.slice(0, MAX_ATTENTION).map(item => (
                <NeedsAttentionItem
                  key={item.kind === 'issue' ? `a-${item.assignment.id}` : `s-${item.subject.id}`}
                  item={item}
                />
              ))}
              {needsAttention.length > MAX_ATTENTION && (
                <Link
                  to="/planificacion"
                  className="flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-brand-400 mt-2 transition-colors"
                >
                  +{needsAttention.length - MAX_ATTENTION} más · Ver en Planificación
                  <ArrowRight size={11} />
                </Link>
              )}
            </>
          )}
        </div>

        {/* Status breakdown */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-300">Estado de asignaturas</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Planificadas completo', value: stats.fully_scheduled,  total: stats.total_subjects, hex: '#10b981' },
              { label: 'Con algún bloque',       value: stats.with_blocks,      total: stats.total_subjects, hex: '#3b82f6' },
              { label: 'Con profesor',            value: stats.with_professor,   total: stats.total_subjects, hex: '#8b5cf6' },
              { label: 'En semestre',             value: stats.total_assigned,   total: stats.total_subjects, hex: '#64748b' },
            ].map(({ label, value, total, hex }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-300 font-medium">{value}/{total}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${total ? (value / total) * 100 : 0}%`, background: hex }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-300">Acciones rápidas</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: 'Planificación',   href: '/planificacion', desc: 'Asignar bloques horarios',   icon: CalendarDays, hex: '#3b82f6' },
              { label: 'Profesores',      href: '/profesores',    desc: 'Gestionar disponibilidad',   icon: Users,        hex: '#8b5cf6' },
              { label: 'Asignaturas',     href: '/asignaturas',   desc: 'Revisar malla curricular',   icon: BookOpen,     hex: '#10b981' },
              { label: 'Semestres',       href: '/semestres',     desc: 'Configurar semestres',       icon: CalendarDays, hex: '#f59e0b' },
            ].map(({ label, href, desc, icon: Icon, hex }) => (
              <Link
                key={href}
                to={href}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 transition-all duration-150 group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${hex}22`, border: `1px solid ${hex}44` }}
                >
                  <Icon size={15} style={{ color: hex }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Conflicts alert ──────────────────────────────────────────────────── */}
      {stats.total_conflicts > 0 && (
        <div className="rounded-xl bg-red-900/20 border border-red-800/40 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-300">
                {stats.total_conflicts} conflicto(s) de horario detectado(s)
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Asignaturas del mismo semestre de malla comparten un bloque. Ve a Planificación → filtro "Conflictos" para resolverlos.
              </p>
            </div>
            <Link
              to="/planificacion"
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-700/40 hover:border-red-600/60 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              Resolver <ArrowRight size={12} />
            </Link>
          </div>
          {conflicts.length > 0 && (
            <div className="border-t border-red-800/30 px-4 py-3 space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-red-500/60 font-mono flex-shrink-0 w-32">
                    {DAYS_SHORT[c.day] ?? `Día ${c.day}`} · Bloque {c.block_number}
                  </span>
                  <span className="text-slate-500 flex-shrink-0">Sem.{c.curriculum_semester}°:</span>
                  <span className="text-red-300/80 truncate">
                    {c.subjects.map(s => s.subject).join(' vs ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
