import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Lock, FlaskConical, Clock, Building2, X, Pencil } from 'lucide-react'
import clsx from 'clsx'
import {
  getBlocks, updateBlock,
  getRooms, createRoom, updateRoom, deleteRoom,
  getProtectedBlocks, createProtectedBlock, deleteProtectedBlock,
  getLabBlocks, createLabBlock, deleteLabBlock,
} from '../api/client'
import { Block, Room } from '../types'
import Modal from '../components/ui/Modal'

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type Tab = 'bloques' | 'salas' | 'protegidos' | 'laboratorio'

export default function Configuracion() {
  const [tab, setTab] = useState<Tab>('salas')
  const qc = useQueryClient()

  const { data: blocks = [] } = useQuery<Block[]>({ queryKey: ['blocks'], queryFn: getBlocks })
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ['rooms'], queryFn: getRooms })
  const { data: protected_blocks = [] } = useQuery({ queryKey: ['protected-blocks'], queryFn: getProtectedBlocks })
  const { data: lab_blocks = [] } = useQuery({ queryKey: ['lab-blocks'], queryFn: () => getLabBlocks() })

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [roomForm, setRoomForm] = useState({ name: '', type: 'theoretical', location: '', capacity: 40 })

  const saveRoomMut = useMutation({
    mutationFn: () => editRoom ? updateRoom(editRoom.id, roomForm) : createRoom(roomForm),
    onSuccess: () => { toast.success('Sala guardada'); qc.invalidateQueries({ queryKey: ['rooms'] }); setShowRoomForm(false) },
    onError: () => toast.error('Error al guardar'),
  })

  const deleteRoomMut = useMutation({
    mutationFn: (id: number) => deleteRoom(id),
    onSuccess: () => { toast.success('Sala eliminada'); qc.invalidateQueries({ queryKey: ['rooms'] }) },
  })

  // ── Protected blocks ───────────────────────────────────────────────────────
  const [pbForm, setPbForm] = useState({ day: 0, block_number: 1, reason: '' })

  const addPbMut = useMutation({
    mutationFn: (data: { day: number; block_number: number; reason: string }) => createProtectedBlock(data),
    onSuccess: () => { toast.success('Bloque protegido'); qc.invalidateQueries({ queryKey: ['protected-blocks'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error'),
  })

  const delPbMut = useMutation({
    mutationFn: (id: number) => deleteProtectedBlock(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['protected-blocks'] }) },
  })

  // ── Lab blocks ─────────────────────────────────────────────────────────────
  const [lbForm, setLbForm] = useState({ room_id: 0, day: 0, block_number: 1, subject_name: '' })

  const addLbMut = useMutation({
    mutationFn: () => createLabBlock(lbForm),
    onSuccess: () => { toast.success('Bloque de lab agregado'); qc.invalidateQueries({ queryKey: ['lab-blocks'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error'),
  })

  const delLbMut = useMutation({
    mutationFn: (id: number) => deleteLabBlock(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lab-blocks'] }) },
  })

  const labs = rooms.filter(r => r.type === 'lab')

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'salas',       label: 'Salas',                  icon: Building2 },
    { id: 'protegidos',  label: 'Bloques Protegidos',      icon: Lock },
    { id: 'laboratorio', label: 'Bloqueos de Laboratorio', icon: FlaskConical },
    { id: 'bloques',     label: 'Horarios de Bloques',     icon: Clock },
  ]

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Gestiona salas, bloques protegidos y disponibilidad de laboratorios</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id
                ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Salas tab ── */}
      {tab === 'salas' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-400">{rooms.length} salas configuradas</p>
            <button onClick={() => { setEditRoom(null); setRoomForm({ name: '', type: 'theoretical', location: '', capacity: 40 }); setShowRoomForm(true) }} className="btn-primary">
              <Plus size={15} /> Agregar Sala
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map(room => {
              const isLab = room.type === 'lab'
              const RoomTypeIcon = isLab ? FlaskConical : Building2
              return (
              <div key={room.id} className="card p-4 flex items-start justify-between gap-3 group hover:border-slate-600 transition-all"
                style={{ borderLeftWidth: 3, borderLeftColor: isLab ? '#8b5cf6' : '#3b82f6' }}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={clsx(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                    isLab ? 'bg-violet-900/30' : 'bg-blue-900/30'
                  )}>
                    <RoomTypeIcon size={16} className={isLab ? 'text-violet-400' : 'text-blue-400'} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{room.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className={clsx('text-[11px] font-medium', isLab ? 'text-violet-400' : 'text-blue-400')}>
                        {isLab ? 'Laboratorio' : 'Sala Teórica'}
                      </span>
                      {room.location && <span className="text-[11px] text-slate-500">{room.location}</span>}
                      {room.capacity && <span className="text-[11px] text-slate-600">{room.capacity} alumnos</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditRoom(room); setRoomForm({ name: room.name, type: room.type, location: room.location ?? '', capacity: room.capacity ?? 40 }); setShowRoomForm(true) }}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { if (confirm(`¿Eliminar "${room.name}"?`)) deleteRoomMut.mutate(room.id) }}
                    className="p-1.5 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
          </div>
          <Modal open={showRoomForm} onClose={() => setShowRoomForm(false)} title={editRoom ? 'Editar Sala' : 'Agregar Sala'} size="sm">
            <div className="space-y-4">
              <div><label className="label">Nombre</label><input className="input" value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="label">Tipo</label>
                <select className="input" value={roomForm.type} onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="theoretical">Sala teórica</option>
                  <option value="lab">Laboratorio</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Ubicación</label><input className="input" value={roomForm.location} onChange={e => setRoomForm(f => ({ ...f, location: e.target.value }))} /></div>
                <div><label className="label">Capacidad</label><input className="input" type="number" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: Number(e.target.value) }))} /></div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRoomForm(false)} className="btn-secondary">Cancelar</button>
                <button onClick={() => saveRoomMut.mutate()} disabled={!roomForm.name} className="btn-primary">Guardar</button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ── Bloques protegidos tab ── */}
      {tab === 'protegidos' && (
        <div>
          <p className="text-sm text-slate-400 mb-4">
            Los bloques protegidos son horarios donde <strong className="text-white">no se puede realizar ninguna clase</strong>.
          </p>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-4 space-y-3">
              <p className="text-sm font-semibold text-white">Agregar bloque protegido</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Día</label>
                  <select className="input text-sm" value={pbForm.day} onChange={e => setPbForm(f => ({ ...f, day: Number(e.target.value) }))}>
                    {DAYS_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div><label className="label">Bloque</label>
                  <select className="input text-sm" value={pbForm.block_number} onChange={e => setPbForm(f => ({ ...f, block_number: Number(e.target.value) }))}>
                    {blocks.map(b => <option key={b.number} value={b.number}>{b.number}. {b.start_time}–{b.end_time}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Motivo (opcional)</label>
                <input className="input text-sm" value={pbForm.reason} onChange={e => setPbForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ej: Reunión de facultad" />
              </div>
              <button onClick={() => addPbMut.mutate(pbForm)} disabled={addPbMut.isPending} className="btn-primary w-full justify-center">
                <Lock size={14} /> Proteger bloque
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">{protected_blocks.length} bloques protegidos</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {protected_blocks.map((pb: any) => (
                  <div key={pb.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-900/10 border border-red-800/20">
                    <div>
                      <span className="text-sm text-red-300 font-medium">{DAYS_SHORT[pb.day]}</span>
                      <span className="text-sm text-slate-400 ml-2">Bloque {pb.block_number}</span>
                      {pb.reason && <span className="text-xs text-slate-600 ml-2">· {pb.reason}</span>}
                    </div>
                    <button onClick={() => delPbMut.mutate(pb.id)} className="p-1 hover:bg-red-900/30 text-red-500/50 hover:text-red-400 rounded transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {protected_blocks.length === 0 && <p className="text-slate-600 text-sm">Sin bloques protegidos</p>}
              </div>
            </div>
          </div>

          {/* Interactive weekly grid */}
          {blocks.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vista semanal</p>
                <p className="text-[11px] text-slate-600">Clic en celda para proteger · Clic en rojo para quitar</p>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-3 py-2 text-left text-[10px] text-slate-600 font-medium w-24">Bloque</th>
                        {DAYS_SHORT.map(d => (
                          <th key={d} className="px-2 py-2 text-center text-[10px] font-semibold text-slate-400 min-w-[44px]">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { label: 'Mañana',     from: 1,  to: 8,  hex: '#3b82f6' },
                        { label: 'Tarde',      from: 9,  to: 12, hex: '#8b5cf6' },
                        { label: 'Vespertina', from: 13, to: 18, hex: '#f59e0b' },
                      ] as { label: string; from: number; to: number; hex: string }[]).flatMap(({ label, from, to, hex }) => {
                        const jornBlocks = blocks.filter(b => b.number >= from && b.number <= to)
                        if (jornBlocks.length === 0) return []
                        return [
                          <tr key={`jorn-${label}`} className="bg-slate-900/60 border-y border-slate-800/60">
                            <td colSpan={7} className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} />
                                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">{label}</span>
                              </div>
                            </td>
                          </tr>,
                          ...jornBlocks.map(block => (
                            <tr key={block.number} className="hover:bg-slate-800/10">
                              <td className="px-3 py-0.5 whitespace-nowrap">
                                <span className="font-mono font-bold text-slate-400">{block.number}</span>
                                <span className="text-[10px] text-slate-600 ml-1.5">{block.start_time}</span>
                              </td>
                              {DAYS_SHORT.map((_, di) => {
                                const existing = (protected_blocks as any[]).find(pb => pb.day === di && pb.block_number === block.number)
                                return (
                                  <td key={di} className="px-1 py-0.5">
                                    <div
                                      onClick={() => existing
                                        ? delPbMut.mutate(existing.id)
                                        : addPbMut.mutate({ day: di, block_number: block.number, reason: '' })
                                      }
                                      className={clsx(
                                        'h-6 rounded cursor-pointer transition-colors duration-100',
                                        existing
                                          ? 'bg-red-900/40 border border-red-700/50 hover:bg-red-800/50'
                                          : 'bg-slate-800/40 border border-transparent hover:bg-slate-700/50 hover:border-slate-600/40'
                                      )}
                                      title={existing ? `${existing.reason || 'Protegido'} — clic para quitar` : 'Clic para proteger'}
                                    />
                                  </td>
                                )
                              })}
                            </tr>
                          )),
                        ]
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Laboratorio tab ── */}
      {tab === 'laboratorio' && (
        <div>
          <p className="text-sm text-slate-400 mb-4">
            Bloques ocupados por otras carreras en los laboratorios. Estos bloques <strong className="text-white">no estarán disponibles</strong> para asignaturas con modalidad de laboratorio.
          </p>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-4 space-y-3">
              <p className="text-sm font-semibold text-white">Agregar bloqueo</p>
              <div><label className="label">Laboratorio</label>
                <select className="input text-sm" value={lbForm.room_id} onChange={e => setLbForm(f => ({ ...f, room_id: Number(e.target.value) }))}>
                  <option value={0}>— Seleccionar —</option>
                  {labs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Día</label>
                  <select className="input text-sm" value={lbForm.day} onChange={e => setLbForm(f => ({ ...f, day: Number(e.target.value) }))}>
                    {DAYS_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div><label className="label">Bloque</label>
                  <select className="input text-sm" value={lbForm.block_number} onChange={e => setLbForm(f => ({ ...f, block_number: Number(e.target.value) }))}>
                    {blocks.map(b => <option key={b.number} value={b.number}>{b.number}. {b.start_time}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Asignatura (otra carrera)</label>
                <input className="input text-sm" value={lbForm.subject_name} onChange={e => setLbForm(f => ({ ...f, subject_name: e.target.value }))} placeholder="Ej: Estadística II – Sociología" />
              </div>
              <button onClick={() => addLbMut.mutate()} disabled={!lbForm.room_id || addLbMut.isPending} className="btn-primary w-full justify-center">
                <FlaskConical size={14} /> Agregar bloqueo
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">{lab_blocks.length} bloqueos registrados</p>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {lab_blocks.map((lb: any) => {
                  const room = rooms.find(r => r.id === lb.room_id)
                  return (
                    <div key={lb.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-900/10 border border-orange-700/20">
                      <div className="text-xs">
                        <span className="text-orange-300 font-medium">{room?.name}</span>
                        <span className="text-slate-400 mx-2">·</span>
                        <span className="text-slate-400">{DAYS_SHORT[lb.day]} Bloque {lb.block_number}</span>
                        {lb.subject_name && <span className="text-slate-600 ml-2">· {lb.subject_name}</span>}
                      </div>
                      <button onClick={() => delLbMut.mutate(lb.id)} className="p-1 hover:bg-orange-900/30 text-orange-600/50 hover:text-orange-400 rounded transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
                {lab_blocks.length === 0 && <p className="text-slate-600 text-sm">Sin bloqueos registrados</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bloques tab ── */}
      {tab === 'bloques' && (
        <div>
          <p className="text-sm text-slate-400 mb-4">
            Horarios de inicio y fin por bloque, agrupados por jornada.{' '}
            <span className="text-slate-600">{blocks.length} bloques en total</span>
          </p>
          <div className="card overflow-hidden max-w-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">N°</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Inicio</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fin</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Duración</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { label: 'Jornada Mañana',    from: 1,  to: 8,  hex: '#3b82f6' },
                  { label: 'Jornada Tarde',      from: 9,  to: 12, hex: '#8b5cf6' },
                  { label: 'Jornada Vespertina', from: 13, to: 18, hex: '#f59e0b' },
                ] as { label: string; from: number; to: number; hex: string }[]).flatMap(({ label, from, to, hex }) => {
                  const sb = blocks.filter(b => b.number >= from && b.number <= to)
                  if (sb.length === 0) return []
                  return [
                    <tr key={`hdr-${label}`} className="border-y border-slate-800/60 bg-slate-900/60">
                      <td colSpan={4} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                          <span className="text-[11px] font-bold text-slate-400 tracking-wider">{label}</span>
                          <span className="text-[10px] text-slate-600">({sb.length} bloques)</span>
                        </div>
                      </td>
                    </tr>,
                    ...sb.map(b => {
                      const [sh, sm] = b.start_time.split(':').map(Number)
                      const [eh, em] = b.end_time.split(':').map(Number)
                      const dur = (eh * 60 + em) - (sh * 60 + sm)
                      return (
                        <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2 border-b border-slate-800/30">
                            <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 inline-flex items-center justify-center text-xs font-bold text-slate-300">
                              {b.number}
                            </span>
                          </td>
                          <td className="px-4 py-2 border-b border-slate-800/30 text-slate-300 font-mono text-[13px]">{b.start_time}</td>
                          <td className="px-4 py-2 border-b border-slate-800/30 text-slate-400 font-mono text-[13px]">{b.end_time}</td>
                          <td className="px-4 py-2 border-b border-slate-800/30 text-slate-500 text-[11px]">{dur} min</td>
                        </tr>
                      )
                    }),
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

