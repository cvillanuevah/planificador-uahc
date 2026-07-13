import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, BookOpen, Pencil, Trash2, FlaskConical, Monitor, Layers, Search, BarChart3, X, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { getSubjects, createSubject, updateSubject, deleteSubject, getSemesters, getAssignments } from '../api/client'
import { Subject, FormationLine, RoomType, FORMATION_LINE_LABELS, FORMATION_LINE_COLORS, AcademicSemester, Assignment } from '../types'
import Modal from '../components/ui/Modal'

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const ROOM_TYPE_ICONS: Record<RoomType, React.ElementType> = {
  theoretical: Monitor,
  lab: FlaskConical,
  mix: Layers,
}
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  theoretical: 'Sala teórica',
  lab: 'Laboratorio',
  mix: 'Mixto',
}

const FORMATION_LINE_HEX: Record<FormationLine, string> = {
  especialidad:     '#3b82f6',
  interdisciplinar: '#8b5cf6',
  general:          '#10b981',
  basica:           '#f59e0b',
}

const EMPTY_FORM = {
  name: '', curriculum_semester: 1, formation_line: 'especialidad' as FormationLine,
  room_type: 'theoretical' as RoomType, blocks_per_week: 4, is_taller_digital: false,
}

export default function Asignaturas() {
  const qc = useQueryClient()
  const [selSem, setSelSem] = useState<number | undefined>(undefined)
  const [selLine, setSelLine] = useState<FormationLine | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editSubj, setEditSubj] = useState<Subject | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', selSem],
    queryFn: () => getSubjects(selSem),
  })

  const { data: semesters = [] } = useQuery<AcademicSemester[]>({
    queryKey: ['semesters'],
    queryFn: getSemesters,
    staleTime: 60_000,
  })
  const activeSem = semesters.find(s => s.is_active)

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', activeSem?.id],
    queryFn: () => getAssignments(activeSem!.id),
    enabled: !!activeSem?.id,
    staleTime: 60_000,
  })

  const assignmentMap = useMemo(() => {
    const m = new Map<number, Assignment>()
    for (const a of assignments) m.set(a.subject.id, a)
    return m
  }, [assignments])

  const saveMut = useMutation({
    mutationFn: () => editSubj ? updateSubject(editSubj.id, form) : createSubject(form),
    onSuccess: () => {
      toast.success(editSubj ? 'Asignatura actualizada' : 'Asignatura creada')
      qc.invalidateQueries({ queryKey: ['subjects'] })
      setShowForm(false)
      setEditSubj(null)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Error al guardar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSubject(id),
    onSuccess: () => { toast.success('Asignatura eliminada'); qc.invalidateQueries({ queryKey: ['subjects'] }) },
    onError: () => toast.error('No se puede eliminar una asignatura con asignaciones activas'),
  })

  const openEdit = (s: Subject) => {
    setEditSubj(s)
    setForm({ name: s.name, curriculum_semester: s.curriculum_semester, formation_line: s.formation_line,
      room_type: s.room_type, blocks_per_week: s.blocks_per_week, is_taller_digital: s.is_taller_digital })
    setShowForm(true)
  }

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    (!selLine || s.formation_line === selLine)
  )

  const bySemester: Record<number, Subject[]> = {}
  for (const s of filtered) {
    if (!bySemester[s.curriculum_semester]) bySemester[s.curriculum_semester] = []
    bySemester[s.curriculum_semester].push(s)
  }

  // Stats per formation line (from all subjects, not filtered)
  const lineStats = (['especialidad', 'interdisciplinar', 'general', 'basica'] as FormationLine[]).map(fl => ({
    fl,
    count: subjects.filter(s => s.formation_line === fl).length,
  }))

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asignaturas</h1>
          <p className="text-slate-400 text-sm mt-1">Malla curricular · {subjects.length} asignaturas en total</p>
        </div>
        <button onClick={() => { setEditSubj(null); setForm(EMPTY_FORM); setShowForm(true) }} className="btn-primary">
          <Plus size={16} /> Nueva Asignatura
        </button>
      </div>

      {/* Formation line stats */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {lineStats.map(({ fl, count }) => {
            const c = FORMATION_LINE_COLORS[fl]
            const hex = FORMATION_LINE_HEX[fl]
            const pct = subjects.length > 0 ? Math.round((count / subjects.length) * 100) : 0
            return (
              <div key={fl} className={clsx('card p-4', c.bg, c.border)}
                style={{ borderLeftWidth: 3, borderLeftColor: hex }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={clsx('text-xs font-semibold uppercase tracking-wider mb-1', c.text)}>
                      {FORMATION_LINE_LABELS[fl]}
                    </p>
                    <p className="text-2xl font-bold text-white leading-none">{count}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{pct}% de la malla</p>
                  </div>
                  <div className="flex-shrink-0">
                    <BarChart3 size={16} style={{ color: hex }} className="opacity-50" />
                  </div>
                </div>
                <div className="mt-2.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: hex }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-5">
        {/* Search + semester row */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9" placeholder="Buscar asignatura…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelSem(undefined)}
              className={clsx('px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
                !selSem ? 'bg-brand-600/20 border-brand-600/40 text-brand-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white')}
            >
              Todos
            </button>
            {SEMESTERS.map(n => (
              <button
                key={n}
                onClick={() => setSelSem(selSem === n ? undefined : n)}
                className={clsx('px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
                  selSem === n ? 'bg-brand-600/20 border-brand-600/40 text-brand-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white')}
              >
                S{n}
              </button>
            ))}
          </div>
        </div>
        {/* Formation line filter row */}
        {subjects.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-[11px] text-slate-600 font-medium uppercase tracking-wide mr-1">Línea:</span>
            <button
              onClick={() => setSelLine(undefined)}
              className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                !selLine ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300')}
            >
              Todas
            </button>
            {(['especialidad', 'interdisciplinar', 'general', 'basica'] as FormationLine[]).map(fl => {
              const hex = FORMATION_LINE_HEX[fl]
              const isActive = selLine === fl
              return (
                <button
                  key={fl}
                  onClick={() => setSelLine(isActive ? undefined : fl)}
                  className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold border transition-all')}
                  style={isActive
                    ? { backgroundColor: hex + '25', borderColor: hex + '60', color: hex }
                    : { backgroundColor: 'rgba(30,41,59,0.6)', borderColor: '#334155', color: '#64748b' }
                  }
                >
                  {FORMATION_LINE_LABELS[fl]}
                </button>
              )
            })}
            {(search || selSem || selLine) && (
              <button
                onClick={() => { setSearch(''); setSelSem(undefined); setSelLine(undefined) }}
                className="ml-2 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="card h-48 animate-pulse bg-slate-800/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
          <p>No hay asignaturas</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(bySemester).sort(([a], [b]) => Number(a) - Number(b)).map(([sem, subs]) => (
            <div key={sem}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-400">
                    {sem}
                  </span>
                  <h2 className="text-sm font-bold text-slate-300">Semestre {sem} de Malla</h2>
                </div>
                <div className="flex-1 h-px bg-slate-800" />
                <div className="flex items-center gap-3">
                  {activeSem && (() => {
                    const complete = subs.filter(subj => {
                      const a = assignmentMap.get(subj.id)
                      return a && a.scheduled_blocks.length >= subj.blocks_per_week
                    }).length
                    const partial = subs.filter(subj => {
                      const a = assignmentMap.get(subj.id)
                      return a && a.scheduled_blocks.length > 0 && a.scheduled_blocks.length < subj.blocks_per_week
                    }).length
                    const all = subs.length
                    if (complete === all) return (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 size={11} /> {complete}/{all} completas
                      </span>
                    )
                    return (
                      <span className={clsx(
                        'text-[11px] font-medium',
                        complete > 0 || partial > 0 ? 'text-amber-500' : 'text-slate-600'
                      )}>
                        {complete}/{all} completas{partial > 0 ? ` · ${partial} parcial` : ''}
                      </span>
                    )
                  })()}
                  <span className="text-[11px] text-slate-600 font-medium">
                    {subs.reduce((s, subj) => s + subj.blocks_per_week, 0)} bloq/sem
                  </span>
                  <span className="text-xs text-slate-600 font-medium">{subs.length} asignatura{subs.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {subs.map(subj => {
                  const c = FORMATION_LINE_COLORS[subj.formation_line]
                  const hex = FORMATION_LINE_HEX[subj.formation_line]
                  const RoomIcon = ROOM_TYPE_ICONS[subj.room_type]
                  const semAssignment = assignmentMap.get(subj.id)
                  const scheduledBlocks = semAssignment?.scheduled_blocks.length ?? 0
                  const neededBlocks = subj.blocks_per_week
                  return (
                    <div
                      key={subj.id}
                      className="card p-4 group hover:border-slate-600 transition-all duration-150"
                      style={{ borderLeftWidth: 3, borderLeftColor: hex }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-2">
                            {subj.name}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className={clsx('badge border text-[11px]', c.bg, c.text, c.border)}>
                              {FORMATION_LINE_LABELS[subj.formation_line]}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-800/60 border border-slate-700/50 rounded-full px-2 py-0.5">
                              <RoomIcon size={10} />
                              {ROOM_TYPE_LABELS[subj.room_type]}
                            </span>
                            {subj.blocks_per_week > 0 && (
                              <span className="text-[11px] text-slate-500 bg-slate-800/60 border border-slate-700/50 rounded-full px-2 py-0.5">
                                {subj.blocks_per_week} bloq/sem
                              </span>
                            )}
                            {subj.is_taller_digital && (
                              <span className="badge bg-sky-900/30 text-sky-400 border border-sky-700/30 text-[11px]">
                                Taller Digital
                              </span>
                            )}
                            {activeSem && (
                              semAssignment && scheduledBlocks >= neededBlocks ? (
                                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-700/30">
                                  <CheckCircle2 size={9} /> completo
                                </span>
                              ) : semAssignment && scheduledBlocks > 0 ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/30">
                                  {scheduledBlocks}/{neededBlocks} bloq.
                                </span>
                              ) : semAssignment ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-900/20 text-amber-600 border border-amber-800/30">
                                  asignada · sin horario
                                </span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-600 border border-slate-700/30">
                                  sin asignar
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(subj)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`¿Eliminar "${subj.name}"?`)) deleteMut.mutate(subj.id) }}
                            className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditSubj(null) }} title={editSubj ? 'Editar Asignatura' : 'Nueva Asignatura'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la asignatura" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Semestre de malla</label>
              <select className="input" value={form.curriculum_semester} onChange={e => setForm(f => ({ ...f, curriculum_semester: Number(e.target.value) }))}>
                {SEMESTERS.map(n => <option key={n} value={n}>Semestre {n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Línea de formación</label>
              <select className="input" value={form.formation_line} onChange={e => setForm(f => ({ ...f, formation_line: e.target.value as FormationLine }))}>
                <option value="especialidad">Especialidad</option>
                <option value="interdisciplinar">Interdisciplinar</option>
                <option value="general">General</option>
                <option value="basica">Básica</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de sala</label>
              <select className="input" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value as RoomType }))}>
                <option value="theoretical">Sala teórica</option>
                <option value="lab">Laboratorio</option>
                <option value="mix">Mixto (ambas)</option>
              </select>
            </div>
            <div>
              <label className="label">Bloques por semana</label>
              <input className="input" type="number" min={0} max={12} value={form.blocks_per_week} onChange={e => setForm(f => ({ ...f, blocks_per_week: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700/50">
            <input
              id="taller"
              type="checkbox"
              checked={form.is_taller_digital}
              onChange={e => setForm(f => ({ ...f, is_taller_digital: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-brand-500"
            />
            <label htmlFor="taller" className="text-sm text-slate-300 cursor-pointer">Taller Digital (requiere laboratorio)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowForm(false); setEditSubj(null) }} className="btn-secondary">Cancelar</button>
            <button onClick={() => saveMut.mutate()} disabled={!form.name || saveMut.isPending} className="btn-primary">
              {saveMut.isPending ? 'Guardando…' : editSubj ? 'Guardar cambios' : 'Crear asignatura'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
