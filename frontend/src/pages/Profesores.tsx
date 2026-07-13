import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Search, User, Mail, Phone, Grid3X3, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import clsx from 'clsx'
import {
  getProfessors, createProfessor, updateProfessor, deleteProfessor,
  getProfessorAvailability, saveProfessorAvailability, getBlocks,
  getSemesters, getAssignments,
} from '../api/client'
import { Professor, Block, DAYS_SHORT, AcademicSemester, Assignment } from '../types'
import Modal from '../components/ui/Modal'

const EMPTY_FORM = { name: '', email: '', phone: '', rut: '', professor_type: 'honorary', is_active: true }

function AvailabilityGrid({ professorId, onClose }: { professorId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: blocks = [] } = useQuery<Block[]>({ queryKey: ['blocks'], queryFn: getBlocks })
  const { data: avail = [], isLoading } = useQuery({
    queryKey: ['availability', professorId],
    queryFn: () => getProfessorAvailability(professorId),
  })

  const [grid, setGrid] = useState<Record<string, boolean>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (isLoading || initialized) return
    setInitialized(true)
    const map: Record<string, boolean> = {}
    if (avail.length === 0) {
      for (let d = 0; d < 6; d++)
        for (let b = 1; b <= 18; b++)
          map[`${d}-${b}`] = true
    } else {
      for (const s of avail) map[`${s.day}-${s.block_number}`] = s.available
    }
    setGrid(map)
  }, [avail, isLoading, initialized])

  const saveMut = useMutation({
    mutationFn: () => {
      const slots = []
      for (const [key, available] of Object.entries(grid)) {
        const [day, bn] = key.split('-').map(Number)
        slots.push({ day, block_number: bn, available })
      }
      return saveProfessorAvailability(professorId, slots)
    },
    onSuccess: () => {
      toast.success('Disponibilidad guardada')
      qc.invalidateQueries({ queryKey: ['availability', professorId] })
      onClose()
    },
    onError: () => toast.error('Error al guardar'),
  })

  const toggle = (day: number, block: number) =>
    setGrid(g => ({ ...g, [`${day}-${block}`]: !g[`${day}-${block}`] }))

  const setAll = (val: boolean) => {
    const m: Record<string, boolean> = {}
    for (let d = 0; d < 6; d++)
      for (let b = 1; b <= 18; b++)
        m[`${d}-${b}`] = val
    setGrid(m)
  }

  const sessions = [
    { label: 'MAÑANA',     blocks: blocks.filter(b => b.number <= 8) },
    { label: 'TARDE',      blocks: blocks.filter(b => b.number >= 9 && b.number <= 12) },
    { label: 'VESPERTINO', blocks: blocks.filter(b => b.number >= 13) },
  ]

  const availCount = Object.values(grid).filter(Boolean).length

  if (isLoading || !initialized) {
    return <div className="py-8 text-center text-slate-500 text-sm">Cargando disponibilidad…</div>
  }

  return (
    <div>
      {/* Acciones rápidas */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setAll(true)} className="btn-secondary text-xs py-1.5">
          <Check size={13} /> Todo disponible
        </button>
        <button onClick={() => setAll(false)} className="btn-secondary text-xs py-1.5">
          <X size={13} /> Todo no disponible
        </button>
        <span className="ml-auto text-xs text-slate-500">
          <span className="text-emerald-400 font-semibold">{availCount}</span> / 108 bloques disponibles
        </span>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="flex items-center gap-2 text-emerald-400">
          <span className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center">
            <X size={14} className="text-white" strokeWidth={3} />
          </span>
          Disponible (click para cambiar)
        </span>
        <span className="flex items-center gap-2 text-slate-500">
          <span className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700" />
          No disponible
        </span>
      </div>

      {/* Grilla */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80">
              <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-28 border-b border-slate-800">Bloque</th>
              {DAYS_SHORT.map(d => (
                <th key={d} className="text-center px-1 py-2.5 text-slate-300 font-bold border-b border-slate-800 min-w-[52px]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map(({ label, blocks: sBlocks }) => (
              <React.Fragment key={label}>
                <tr>
                  <td colSpan={7} className="px-3 py-1.5 bg-slate-900/60 border-y border-slate-800/60">
                    <span className="text-[10px] text-slate-600 font-bold tracking-widest">{label}</span>
                  </td>
                </tr>
                {sBlocks.map(block => (
                  <tr key={block.number} className="group hover:bg-slate-800/20">
                    <td className="px-3 py-0.5 border-b border-slate-800/30">
                      <span className="font-semibold text-slate-400">{block.number}.</span>{' '}
                      <span className="text-slate-500">{block.start_time}</span>
                    </td>
                    {[0, 1, 2, 3, 4, 5].map(day => {
                      const available = grid[`${day}-${block.number}`] ?? true
                      return (
                        <td key={day} className="py-0.5 px-1 text-center border-b border-slate-800/30">
                          <button
                            onClick={() => toggle(day, block.number)}
                            title={available ? 'Disponible — click para bloquear' : 'No disponible — click para habilitar'}
                            className={clsx(
                              'w-9 h-7 rounded-md transition-all duration-100 flex items-center justify-center mx-auto',
                              available
                                ? 'bg-emerald-500 hover:bg-emerald-400 shadow-sm shadow-emerald-900/50'
                                : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                            )}
                          >
                            {available && <X size={13} className="text-white" strokeWidth={3} />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-800">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? 'Guardando…' : 'Guardar disponibilidad'}
        </button>
      </div>
    </div>
  )
}

export default function Profesores() {
  const qc = useQueryClient()
  const { data: professors = [], isLoading } = useQuery<Professor[]>({ queryKey: ['professors'], queryFn: getProfessors })

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editProf, setEditProf] = useState<Professor | null>(null)
  const [availProf, setAvailProf] = useState<Professor | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const createMut = useMutation({
    mutationFn: () => editProf ? updateProfessor(editProf.id, form) : createProfessor(form),
    onSuccess: () => {
      toast.success(editProf ? 'Profesor actualizado' : 'Profesor creado')
      qc.invalidateQueries({ queryKey: ['professors'] })
      setShowForm(false)
      setEditProf(null)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Error al guardar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteProfessor(id),
    onSuccess: () => { toast.success('Profesor eliminado'); qc.invalidateQueries({ queryKey: ['professors'] }) },
  })

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateProfessor(id, { is_active }),
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? 'Profesor activado' : 'Profesor desactivado')
      qc.invalidateQueries({ queryKey: ['professors'] })
    },
    onError: () => toast.error('Error al actualizar estado'),
  })

  const openEdit = (p: Professor) => {
    setEditProf(p)
    setForm({ name: p.name, email: p.email ?? '', phone: p.phone ?? '', rut: p.rut ?? '', professor_type: p.professor_type, is_active: p.is_active })
    setShowForm(true)
  }

  const { data: semesters = [] } = useQuery<AcademicSemester[]>({
    queryKey: ['semesters'],
    queryFn: getSemesters,
  })
  const activeSem = semesters.find(s => s.is_active)

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', activeSem?.id],
    queryFn: () => getAssignments(activeSem!.id),
    enabled: !!activeSem?.id,
    staleTime: 60_000,
  })

  // blocks/week and subject count per professor in the active semester
  const workloadMap = useMemo(() => {
    const map = new Map<number, { blocks: number; subjects: number }>()
    for (const a of assignments) {
      if (!a.professor_id) continue
      const cur = map.get(a.professor_id) ?? { blocks: 0, subjects: 0 }
      map.set(a.professor_id, {
        blocks: cur.blocks + a.scheduled_blocks.length,
        subjects: cur.subjects + 1,
      })
    }
    return map
  }, [assignments])

  const filtered = professors.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const activeCount    = professors.filter(p => p.is_active).length
  const honoraryCount  = professors.filter(p => p.professor_type === 'honorary').length
  const regularCount   = professors.filter(p => p.professor_type === 'regular').length

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Profesores</h1>
          <p className="text-slate-400 text-sm mt-1">{professors.length} profesores registrados</p>
        </div>
        <button onClick={() => { setEditProf(null); setForm(EMPTY_FORM); setShowForm(true) }} className="btn-primary">
          <Plus size={16} /> Agregar Profesor
        </button>
      </div>

      {/* Stats bar */}
      {professors.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {([
            { label: 'Total profesores', value: professors.length, hex: '#3b82f6' },
            { label: 'Activos',          value: activeCount,       hex: '#10b981' },
            { label: 'Honorarios',       value: honoraryCount,     hex: '#f59e0b' },
            { label: 'Regulares',        value: regularCount,      hex: '#8b5cf6' },
          ] as { label: string; value: number; hex: string }[]).map(({ label, value, hex }) => (
            <div key={label} className="card p-4" style={{ borderLeftWidth: 3, borderLeftColor: hex }}>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <User size={40} className="mx-auto mb-3 opacity-20" />
          <p>No hay profesores registrados</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nombre', 'RUT', 'Email', 'Teléfono', 'Tipo', 'Carga sem.', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map(prof => (
                <tr key={prof.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-400">
                          {prof.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <span className="font-medium text-white">{prof.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{prof.rut || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {prof.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-600" /> {prof.email}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {prof.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-600" /> {prof.phone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'badge',
                      prof.professor_type === 'honorary'
                        ? 'bg-amber-900/30 text-amber-400 border border-amber-700/30'
                        : 'bg-blue-900/30 text-blue-400 border border-blue-700/30'
                    )}>
                      {prof.professor_type === 'honorary' ? 'Honorario' : 'Regular'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const wl = workloadMap.get(prof.id)
                      if (!activeSem || !wl) {
                        return <span className="text-xs text-slate-700">—</span>
                      }
                      const blocks = wl.blocks
                      const hex = blocks === 0 ? '#475569' : blocks <= 4 ? '#10b981' : blocks <= 8 ? '#f59e0b' : '#ef4444'
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min((blocks / 12) * 100, 100)}%`, backgroundColor: hex }}
                            />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: hex }}>
                            {blocks}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {wl.subjects > 0 ? `(${wl.subjects} asig.)` : ''}
                          </span>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActiveMut.mutate({ id: prof.id, is_active: !prof.is_active })}
                      disabled={toggleActiveMut.isPending}
                      title={prof.is_active ? 'Activo — click para desactivar' : 'Inactivo — click para activar'}
                      className={clsx(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                        prof.is_active
                          ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/40'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-emerald-900/20 hover:text-emerald-400 hover:border-emerald-700/40'
                      )}
                    >
                      {prof.is_active
                        ? <><ToggleRight size={14} /> Activo</>
                        : <><ToggleLeft size={14} /> Inactivo</>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAvailProf(prof)}
                        className="p-1.5 rounded-lg hover:bg-emerald-900/30 text-slate-500 hover:text-emerald-400 transition-colors"
                        title="Ver disponibilidad"
                      >
                        <Grid3X3 size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(prof)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar a ${prof.name}?`)) deleteMut.mutate(prof.id) }}
                        className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditProf(null) }} title={editProf ? 'Editar Profesor' : 'Agregar Profesor'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Juan Pérez González" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">RUT</label>
              <input className="input" value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))} placeholder="12.345.678-9" />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.professor_type} onChange={e => setForm(f => ({ ...f, professor_type: e.target.value }))}>
                <option value="honorary">Honorario</option>
                <option value="regular">Regular</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@ejemplo.cl" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+56 9 1234 5678" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowForm(false); setEditProf(null) }} className="btn-secondary">Cancelar</button>
            <button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending} className="btn-primary">
              {createMut.isPending ? 'Guardando…' : editProf ? 'Guardar cambios' : 'Crear profesor'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Availability modal */}
      <Modal open={!!availProf} onClose={() => setAvailProf(null)} title={`Disponibilidad · ${availProf?.name}`} size="xl">
        {availProf && <AvailabilityGrid professorId={availProf.id} onClose={() => setAvailProf(null)} />}
      </Modal>
    </div>
  )
}
