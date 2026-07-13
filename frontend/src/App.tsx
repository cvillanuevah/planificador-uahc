import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Profesores from './pages/Profesores'
import Asignaturas from './pages/Asignaturas'
import Semestres from './pages/Semestres'
import Planificacion from './pages/Planificacion'
import Configuracion from './pages/Configuracion'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/planificacion"  element={<Planificacion />} />
          <Route path="/profesores"     element={<Profesores />} />
          <Route path="/asignaturas"    element={<Asignaturas />} />
          <Route path="/semestres"      element={<Semestres />} />
          <Route path="/configuracion"  element={<Configuracion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
