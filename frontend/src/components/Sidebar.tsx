import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, BookOpen, CalendarDays,
  ClipboardList, Settings, GraduationCap, Star,
} from 'lucide-react'
import clsx from 'clsx'
import { getSemesters, getDashboard } from '../api/client'
import { AcademicSemester, DashboardData } from '../types'

const NAV = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard',      desc: 'Resumen general' },
  { to: '/planificacion',  icon: CalendarDays,    label: 'Planificación',  desc: 'Horarios semanales' },
  { to: '/profesores',     icon: Users,           label: 'Profesores',     desc: 'Docentes y disponibilidad' },
  { to: '/asignaturas',    icon: BookOpen,        label: 'Asignaturas',    desc: 'Malla curricular' },
  { to: '/semestres',      icon: ClipboardList,   label: 'Semestres',      desc: 'Períodos académicos' },
  { to: '/configuracion',  icon: Settings,        label: 'Configuración',  desc: 'Salas y bloqueos' },
]

export default function Sidebar() {
  const { data: semesters = [] } = useQuery<AcademicSemester[]>({ queryKey: ['semesters'], queryFn: getSemesters })
  const active = semesters.find(s => s.is_active)
  const semId = active?.id

  const { data: dash } = useQuery<DashboardData>({
    queryKey: ['dashboard', semId],
    queryFn: () => getDashboard(semId!),
    enabled: !!semId,
    staleTime: 60_000,
  })

  const incompleteCount = dash ? dash.total_assigned - dash.fully_scheduled : 0
  const conflictCount   = dash?.total_conflicts ?? 0

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-950 border-r border-slate-800/80">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight tracking-tight">Planificador</p>
            <p className="text-[11px] text-slate-500 font-medium">Ing. Civil Industrial</p>
          </div>
        </div>
      </div>

      {/* Active semester pill */}
      {active && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-brand-600/10 border border-brand-600/20 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider leading-none mb-0.5">Semestre activo</p>
            <p className="text-xs font-bold text-brand-300 truncate leading-tight">{active.label}</p>
          </div>
          <Star size={11} className="text-brand-500 flex-shrink-0 ml-auto" />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => {
          const badge =
            to === '/planificacion' && conflictCount > 0
              ? { count: conflictCount, color: 'bg-red-500' }
              : to === '/planificacion' && incompleteCount > 0
              ? { count: incompleteCount, color: 'bg-amber-500' }
              : null

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
                  )}
                  <Icon
                    size={17}
                    className={clsx(
                      'flex-shrink-0 transition-colors',
                      isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className={clsx(
                      'ml-auto text-[10px] font-bold text-slate-900 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0',
                      badge.color
                    )}>
                      {badge.count > 99 ? '99+' : badge.count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800/80">
        <p className="text-[10px] text-slate-700 text-center font-medium tracking-wider uppercase">
          UAHC · {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}
