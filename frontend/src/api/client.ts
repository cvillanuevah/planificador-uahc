import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api',
})

// ── Blocks ─────────────────────────────────────────────────────────────────
export const getBlocks = () => api.get('/blocks').then(r => r.data)
export const updateBlock = (id: number, data: { start_time: string; end_time: string }) =>
  api.put(`/blocks/${id}`, data).then(r => r.data)

// ── Rooms ──────────────────────────────────────────────────────────────────
export const getRooms = () => api.get('/rooms').then(r => r.data)
export const createRoom = (data: object) => api.post('/rooms', data).then(r => r.data)
export const updateRoom = (id: number, data: object) => api.put(`/rooms/${id}`, data).then(r => r.data)
export const deleteRoom = (id: number) => api.delete(`/rooms/${id}`)

// ── Professors ─────────────────────────────────────────────────────────────
export const getProfessors = () => api.get('/professors').then(r => r.data)
export const createProfessor = (data: object) => api.post('/professors', data).then(r => r.data)
export const updateProfessor = (id: number, data: object) => api.put(`/professors/${id}`, data).then(r => r.data)
export const deleteProfessor = (id: number) => api.delete(`/professors/${id}`)
export const getProfessorAvailability = (id: number) => api.get(`/professors/${id}/availability`).then(r => r.data)
export const saveProfessorAvailability = (id: number, slots: object[]) =>
  api.post(`/professors/${id}/availability`, { slots }).then(r => r.data)

// ── Subjects ───────────────────────────────────────────────────────────────
export const getSubjects = (curriculum_semester?: number) =>
  api.get('/subjects', { params: curriculum_semester ? { curriculum_semester } : {} }).then(r => r.data)
export const createSubject = (data: object) => api.post('/subjects', data).then(r => r.data)
export const updateSubject = (id: number, data: object) => api.put(`/subjects/${id}`, data).then(r => r.data)
export const deleteSubject = (id: number) => api.delete(`/subjects/${id}`)

// ── Semesters ──────────────────────────────────────────────────────────────
export const getSemesters = () => api.get('/semesters').then(r => r.data)
export const createSemester = (data: object) => api.post('/semesters', data).then(r => r.data)
export const deleteSemester = (id: number) => api.delete(`/semesters/${id}`)
export const activateSemester = (id: number) => api.post(`/semesters/${id}/activate`).then(r => r.data)
export const getSemesterMappings = (id: number) => api.get(`/semesters/${id}/mappings`).then(r => r.data)
export const updateSemesterMappings = (id: number, nums: number[]) =>
  api.put(`/semesters/${id}/mappings`, { curriculum_semester_numbers: nums }).then(r => r.data)

// ── Schedule ───────────────────────────────────────────────────────────────
export const getAssignments = (semId: number) => api.get(`/schedule/${semId}/assignments`).then(r => r.data)
export const createAssignment = (data: object) => api.post('/schedule/assignments', data).then(r => r.data)
export const updateAssignment = (id: number, data: object) => api.put(`/schedule/assignments/${id}`, data).then(r => r.data)
export const deleteAssignment = (id: number) => api.delete(`/schedule/assignments/${id}`)
export const getAvailableBlocks = (assignmentId: number) =>
  api.get(`/schedule/assignments/${assignmentId}/available-blocks`).then(r => r.data)
export const addScheduledBlock = (data: object) => api.post('/schedule/blocks', data).then(r => r.data)
export const removeScheduledBlock = (id: number) => api.delete(`/schedule/blocks/${id}`)
export const getConflicts = (semId: number) => api.get(`/schedule/${semId}/conflicts`).then(r => r.data)

// ── Config ─────────────────────────────────────────────────────────────────
export const getProtectedBlocks = () => api.get('/config/protected-blocks').then(r => r.data)
export const createProtectedBlock = (data: object) => api.post('/config/protected-blocks', data).then(r => r.data)
export const deleteProtectedBlock = (id: number) => api.delete(`/config/protected-blocks/${id}`)
export const getLabBlocks = (roomId?: number) =>
  api.get('/config/lab-blocks', { params: roomId ? { room_id: roomId } : {} }).then(r => r.data)
export const createLabBlock = (data: object) => api.post('/config/lab-blocks', data).then(r => r.data)
export const deleteLabBlock = (id: number) => api.delete(`/config/lab-blocks/${id}`)

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboard = (semId: number) => api.get(`/dashboard/${semId}`).then(r => r.data)
