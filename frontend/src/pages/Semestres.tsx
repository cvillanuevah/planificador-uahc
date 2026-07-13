import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Star, Trash2, CheckSquare, Square, CalendarDays, ChevronRight, BookOpen, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import {
  getSemesters, createSemester, deleteSemester, activateSemester, updateSemesterMappings,
  getAssignments, getSubjects,
} from '../api/client'
import { AcademicSemester, Assignment, Subject } from '../types'
import Modal from '../components/ui/Modal'

const SEMESTERS_GRID = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const ODD  = [1, 3, 5, 7, 9]
const EVEN = [2, 4, 6, 8, 10]

function getSuggestion(period: number) {
  return period === 1
    ? 'Semestres impares de malla (1°, 3°, 5°, 7°, 9°)'
    : 'Semestres pares de malla (2°, 4°, 6°, 8°, 10°)'
}

export default function Semestres() {
  const qc = useQueryClient()
  const { data: semesters = [], isLoading } = useQuery<AcademicSemester[]>({ queryKey: ['semesters'], queryFn: getSemesters })
  const activeSem = semesters.find(s => s.is_active)

  const { data: allAssignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', activeSem?.id],
    queryFn: () => getAssignments(activeSem!.id),
    enabled: !!activeSem?.id,
    staleTime: 60_000,
  })

  const { data: allSubjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
    staleTime: 60_000,
  })

  // Per-semester planning stats for the active academic semester
  const activeSemStats = useMemo(() => {
    if (!activeSem) return null
    const nums = activeSem.curriculum_semester_numbers ?? []
    const relevantSubjects = allSubjects.filter(s => nums.includes(s.curriculum_semester))
    const assigned = allAssignments.length
    const total = relevantSubjects.length
    const totalBlocks = relevantSubjects.reduce((s, subj) => s + subj.blocks_per_week, 0)
    const scheduledBlocks = allAssignments.reduce((s, a) => s + a.scheduled_blocks.length, 0)
    const complete = allAssignments.filter(a => a.scheduled_blocks.length >= a.subject.blocks_per_week).length
    const pct = totalBlocks > 0 ? Math.round((scheduledBlocks / totalBlocks) * 100) : 0
    return { assigned, total, scheduledBlocks, totalBlocks, complete, pct }
  }, [activeSem, allAssignments, allSubjects])

  const [showCreate, setShowCreate] = useState(false)
  const [editMap, setEditMap] = useState<AcademicSemester | null>(null)
  const [form, setForm] = useState({ year: new Date().getFullYear(), period: 2 })
  const [selectedMaps, setSelectedMaps] = useState<number[]>([])

  const createMut = useMutation({
    mutationFn: () => createSemester({ year: form.year, period: form.period, label: `${form.year}-${form.period}` }),
    onSuccess: () => { toast.success('Semestre creado'); qc.invalidateQueries({ queryKey: ['semesters'] }); setShowCreate(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ya existe ese semestre'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSemester(id),
    onSuccess: () => { toast.success('Semestre eliminado'); qc.invalidateQueries({ queryKey: ['semesters'] }) },
    onError: () => toast.error('No se puede eliminar: tiene datos asociados'),
  })

  const activateMut = useMutation({
    mutationFn: (id: number) => activateSemester(id),
    onSuccess: () => {
      toast.success('Semestre activado')
      qc.invalidateQueries({ queryKey: ['semesters'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const mapMut = useMutation({
    mutationFn: () => updateSemesterMappings(editMap!.id, selectedMaps),
    onSuccess: () => {
      toast.success('Semestres de malla actualizados')
      qc.invalidateQueries({ queryKey: ['semesters'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setEditMap(null)
    },
    onError: () => toast.error('Error al guardar'),
  })

  const openEditMap = (sem: AcademicSemester) => {
    setEditMap(sem)
    setSelectedMaps([...(sem.curriculum_semester_numbers ?? [])])
  }

  const toggleMap = (n: number) =>
    setSelectedMaps(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b))

  return (
    <div className="p-8 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Semestres Académicos</h1>
          <p className="text-slate-400 text-sm mt-1">{semesters.length} semestres · Gestiona períodos y mallas</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Nuevo Semestre
        </button>
      </div>

      {/* Pattern info */}
      <div className="card p-4 mb-6 border-brand-700/30 bg-brand-950/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CalendarDays size={15} className="text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">Patrón de planificación UAHC</p>
            <div className="flex gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400 inline-block" />
                <span><strong className="text-slate-200">Semestre 1</strong> → malla impar (1°, 3°, 5°, 7°, 9°)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                <span><strong className="text-slate-200">Semestre 2</strong> → malla par (2°, 4°, 6°, 8°, 10°)</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              Primera cohorte 2026: solo 2026-2 → Semestre 2° de malla.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="card h-24 animate-pulse bg-slate-800/50" />)}
        </div>
      ) : semesters.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay semestres creados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {semesters.map(sem => {
            const nums = sem.curriculum_semester_numbers ?? []
            const isOdd  = nums.length > 0 && nums.every(n => ODD.includes(n))
            const isEven = nums.length > 0 && nums.every(n => EVEN.includes(n))
            return (
              <div key={sem.id} className={clsx(
                'card p-5 transition-all duration-200',
                sem.is_active
                  ? 'border-brand-600/50 bg-gradient-to-r from-brand-950/40 to-transparent'
                  : 'hover:border-slate-700'
              )}>
                <div className="flex items-start gap-5">
                  {/* Period badge */}
                  <div className={clsx(
                    'w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center',
                    sem.is_active ? 'bg-brand-600/25 border border-brand-500/40' : 'bg-slate-800 border border-slate-700'
                  )}>
                    <span className={clsx('text-lg font-black leading-none', sem.is_active ? 'text-brand-300' : 'text-slate-300')}>
                      {sem.label.split('-')[0].slice(2)}
                    </span>
                    <span className={clsx('text-[10px] font-bold leading-none mt-0.5', sem.is_active ? 'text-brand-500' : 'text-slate-600')}>
                      -{sem.label.split('-')[1]}
                    </span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-bold text-white">{sem.label}</h3>
                      {sem.is_active && (
                        <span className="badge bg-emerald-900/30 text-emerald-400 border border-emerald-700/40">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Activo
                        </span>
                      )}
                      {isOdd  && <span className="badge bg-brand-900/30 text-brand-400 border border-brand-700/30">Semestre 1 del año</span>}
                      {isEven && <span className="badge bg-violet-900/30 text-violet-400 border border-violet-700/30">Semestre 2 del año</span>}
                    </div>

                    {/* Malla pills */}
                    {nums.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <BookOpen size={12} className="text-slate-600" />
                        {nums.sort((a, b) => a - b).map(n => (
                          <span key={n} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {n}°
                          </span>
                        ))}
                        <span className="text-xs text-slate-600 ml-1">{nums.length} semestre{nums.length !== 1 ? 's' : ''} de malla</span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-500/70 italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                        Sin semestres de malla configurados
                      </p>
                    )}

                    {/* Progress stats for active semester */}
                    {sem.is_active && activeSemStats && activeSemStats.total > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={11} className="text-slate-500" />
                            <span className="text-[11px] text-slate-500">Progreso de planificación</span>
                          </div>
                          <span className={clsx(
                            'text-[11px] font-bold ml-auto',
                            activeSemStats.pct >= 100 ? 'text-emerald-400'
                              : activeSemStats.pct >= 50 ? 'text-amber-400'
                              : 'text-slate-500'
                          )}>
                            {activeSemStats.pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2.5">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${activeSemStats.pct}%`,
                              backgroundColor: activeSemStats.pct >= 100 ? '#10b981'
                                : activeSemStats.pct >= 50 ? '#f59e0b'
                                : '#3b82f6',
                            }}
                          />
                        </div>
                        <div className="flex gap-4 text-[11px] text-slate-600">
                          <span>
                            <strong className={activeSemStats.assigned === activeSemStats.total ? 'text-emerald-400' : 'text-slate-300'}>
                              {activeSemStats.assigned}
                            </strong>/{activeSemStats.total} asignaturas
                          </span>
                          <span>
                            <strong className={activeSemStats.complete === activeSemStats.total ? 'text-emerald-400' : 'text-slate-400'}>
                              {activeSemStats.complete}
                            </strong> completas
                          </span>
                          <span>
                            <strong className="text-slate-300">{activeSemStats.scheduledBlocks}</strong>/{activeSemStats.totalBlocks} bloques
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEditMap(sem)} className="btn-secondary text-xs py-1.5">
                      <BookOpen size={13} /> Editar malla
                    </button>
                    {!sem.is_active && (
                      <button
                        onClick={() => activateMut.mutate(sem.id)}
                        disabled={activateMut.isPending}
                        className="btn-secondary text-xs py-1.5 hover:border-emerald-600/50 hover:text-emerald-400"
                      >
                        <Star size={13} /> Activar
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm(`¿Eliminar ${sem.label}? Se borrarán todos sus datos.`)) deleteMut.mutate(sem.id) }}
                      className="btn-danger text-xs py-1.5"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear Semestre Académico" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Año</label>
              <input className="input" type="number" value={form.year} min={2024} max={2040}
                onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Período</label>
              <select className="input" value={form.period} onChange={e => setForm(f => ({ ...f, period: Number(e.target.value) }))}>
                <option value={1}>1° semestre</option>
                <option value={2}>2° semestre</option>
              </select>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-bold text-white mb-1">{form.year}-{form.period}</p>
            <p className="text-xs text-slate-400">{getSuggestion(form.period)}</p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
            <button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending ? 'Creando…' : 'Crear semestre'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit mappings modal */}
      <Modal open={!!editMap} onClose={() => setEditMap(null)} title={`Malla curricular · ${editMap?.label}`}>
        <div className="space-y-5">
          <p className="text-sm text-slate-400">
            Selecciona qué semestres de la malla se dictarán en{' '}
            <strong className="text-white">{editMap?.label}</strong>.
          </p>

          {/* Quick select buttons */}
          <div className="flex gap-2">
            <button onClick={() => setSelectedMaps(ODD)}  className="btn-secondary text-xs flex-1 justify-center py-2">
              <ChevronRight size={12} /> Todos los impares (1°, 3°, 5°, 7°, 9°)
            </button>
            <button onClick={() => setSelectedMaps(EVEN)} className="btn-secondary text-xs flex-1 justify-center py-2">
              <ChevronRight size={12} /> Todos los pares (2°, 4°, 6°, 8°, 10°)
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-2">
            {SEMESTERS_GRID.map(n => {
              const selected = selectedMaps.includes(n)
              const isOddN = n % 2 !== 0
              return (
                <button
                  key={n}
                  onClick={() => toggleMap(n)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150',
                    selected
                      ? isOddN
                        ? 'bg-brand-600/20 border-brand-500/60 text-brand-300'
                        : 'bg-violet-600/20 border-violet-500/60 text-violet-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  )}
                >
                  {selected ? (
                    <CheckSquare size={15} className={isOddN ? 'text-brand-400' : 'text-violet-400'} />
                  ) : (
                    <Square size={15} />
                  )}
                  <span className="text-xs font-bold">{n}°</span>
                  <span className="text-[9px] opacity-60">{isOddN ? 'impar' : 'par'}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              {selectedMaps.length > 0
                ? <><strong className="text-white">{selectedMaps.length}</strong> semestre{selectedMaps.length !== 1 ? 's' : ''} seleccionado{selectedMaps.length !== 1 ? 's' : ''}</>
                : 'Ninguno seleccionado'}
            </span>
            <div className="flex gap-3">
              <button onClick={() => setEditMap(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => mapMut.mutate()} disabled={mapMut.isPending} className="btn-primary">
                {mapMut.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
