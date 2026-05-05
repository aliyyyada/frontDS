// src/api/client.js
import axios from 'axios';
//const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/admin';
//const API_BASE = process.env.REACT_APP_API_URL || 'http://192.168.31.119:8000/api/admin';
const API_BASE = process.env.REACT_APP_API_URL || 'http://100.123.80.16:8000/api/admin';
//const API_BASE = process.env.REACT_APP_API_URL || 'http://172.20.10.4:8000/api/admin';

// Extracts "http://host:port" to build media file URLs
const MEDIA_ORIGIN = API_BASE.split('/api')[0];

export function getMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${MEDIA_ORIGIN}/media/${path.replace(/^\//, '')}`;
}

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        original.headers.Authorization = `Bearer ${data.access}`;
        return client(original);
      } catch (refreshErr) {
        // Только разлогиниваем при явном ответе сервера (токен недействителен).
        // При сетевой ошибке (offline, таймаут) — не трогаем сессию.
        if (refreshErr?.response) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;

// ── Push-уведомления ─────────────────────────────────────────────────────────
export const pushAPI = {
  subscribe:      (data)     => client.post('/push/subscribe/', data),
  unsubscribe:    (endpoint) => client.delete('/push/subscribe/', { data: { endpoint } }),
  getVapidKey:    ()         => client.get('/push/vapid-public-key/'),
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:           (phone_number, password) =>
    client.post('/auth/login/', { phone_number, password }),
  registerInstructor: (data) =>
    client.post('/auth/register/', data),
  sendOTP:         (phone_number) =>
    client.post('/auth/send-otp/', { phone_number }),
  verifyOTP:       (phone_number, code) =>
    client.post('/auth/verify/', { phone_number, code }),
  forgotPassword:  (phone_number) =>
    client.post('/auth/forgot-password/', { phone_number }),
  resetPassword:   (phone_number, code, new_password) =>
    client.post('/auth/reset-password/', { phone_number, code, new_password }),
};

// ── Instructor ────────────────────────────────────────────────────────────────
export const instructorAPI = {
  // Профиль
  getProfile:    ()     => client.get('/instructor/profile/'),
  updateProfile: (data) => client.patch('/instructor/profile/', data),
  updateCar:     (data) => client.patch('/instructor/car/', data),
  updateLimit:   (data) => client.patch('/instructor/limit/', data),
  uploadAvatar: (formData) => client.patch('/instructor/avatar/', formData, {headers: { 'Content-Type': 'multipart/form-data' }}),

  // Слоты практики
  // params: { date?: 'YYYY-MM-DD', week?: 'YYYY-MM-DD' }
  getSlots:      (params) => client.get('/instructor/slots/', { params }),
  createSlot:    (data)   => client.post('/instructor/slots/', data),
  getSlot:       (id)     => client.get(`/instructor/slots/${id}/`),
  updateSlot:    (id, data) => client.patch(`/instructor/slots/${id}/`, data),
  deleteSlot:    (id)     => client.delete(`/instructor/slots/${id}/`),

  // Студенты и занятия
  getStudents:   ()       => client.get('/instructor/students/'),
  // params: { date?: 'YYYY-MM-DD' }
  getUpcoming:   (params) => client.get('/instructor/upcoming/', { params }),

  // Уведомления
  getNotifications: ()   => client.get('/instructor/notifications/'),
  markRead:      (id)    => client.patch(`/instructor/notifications/${id}/read/`),

  // Уведомить студентов об обновлении расписания (notify=false — публикует без уведомлений)
  notifyStudents: (notify = true) => client.post('/instructor/slots/notify/', { notify }),

};
// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Dashboard
  getTheoryLessons: (date) => client.get('/dashboard/theory/', { params: { date } }),
  getLeads:         (tab)  => client.get('/dashboard/leads/', { params: { tab } }),
  updateLead:       (id, data) => client.patch(`/dashboard/leads/${id}/`, data),
  deleteLead:       (id)  => client.delete(`/dashboard/leads/${id}/`),

  // Students
  getStudents:        (search) => client.get('/students/', { params: search ? { search } : {} }),
  getStudent:         (id)     => client.get(`/students/${id}/`),
  updateStudent:      (id, data) => client.patch(`/students/${id}/`, data),
  graduateStudent:    (id)     => client.post(`/students/${id}/graduate/`),
  freezeStudent:      (id)     => client.post(`/students/${id}/freeze/`),
  unfreezeStudent:    (id)     => client.post(`/students/${id}/unfreeze/`),
  getGraduatedStudents: (search) => client.get('/graduated-students/', { params: search ? { search } : {} }),
  getFrozenStudents:  (search) => client.get('/frozen-students/', { params: search ? { search } : {} }),
  deleteStudent:      (id)     => client.delete(`/students/${id}/delete/`),

  // Instructors
  getInstructors: (search) => client.get('/instructors/', { params: search ? { search } : {} }),
  getInstructor:  (id)     => client.get(`/instructors/${id}/`),
  updateInstructor: (id, data) => client.patch(`/instructors/${id}/`, data),
  deleteInstructor: (id)   => client.delete(`/instructors/${id}/`),
  addStudentToInstructor:    (iid, studentId) => client.post(`/instructors/${iid}/students/`, { student_id: studentId }),
  removeStudentFromInstructor: (iid, sid)     => client.delete(`/instructors/${iid}/students/${sid}/`),

  // Admins
  getAdmins:    ()     => client.get('/admins/'),
  getMyProfile: ()     => client.get('/auth/me/'),
  deleteAdmin:  (id)   => client.delete(`/admins/${id}/`),
  createAdmin:  (data) => client.post('/auth/create-admin/', data),

  // Groups
  getGroups:      ()          => client.get('/groups/'),
  getGroup:       (id)        => client.get(`/groups/${id}/`),
  createGroup:    (data)      => client.post('/groups/', data),
  updateGroup:    (id, data)  => client.patch(`/groups/${id}/`, data),
  deleteGroup:    (id)        => client.delete(`/groups/${id}/`),
  addSchedule:       (gid, data) => client.post(`/groups/${gid}/schedule/`, data),
  deleteSchedule:    (gid, sid)  => client.delete(`/groups/${gid}/schedule/${sid}/`),
  addStudentToGroup: (gid, studentId) => client.post(`/groups/${gid}/students/`, { student_id: studentId }),
  removeStudentFromGroup: (gid, sid)  => client.delete(`/groups/${gid}/students/${sid}/`),

  // Cars
  getCars:   ()          => client.get('/cars/'),
  updateCar: (id, data)  => client.patch(`/cars/${id}/`, data),

  // Tariffs
  getTariffs:    ()          => client.get('/tariffs/'),
  getTariff:     (id)        => client.get(`/tariffs/${id}/`),
  createTariff:  (data)      => client.post('/tariffs/', data),
  updateTariff:  (id, data)  => client.patch(`/tariffs/${id}/`, data),
  deleteTariff:  (id)        => client.delete(`/tariffs/${id}/`),

  // Referral
  getReferralStudents: (search) => client.get('/referral/students/', { params: search ? { search } : {} }),
  getReferrals:        (sid)    => client.get(`/referral/students/${sid}/referrals/`),
  payBonus:            (rid)    => client.patch(`/referral/referrals/${rid}/pay-bonus/`),

  // Invoices
  getInvoiceStudents: (search) => client.get('/invoices/students/', { params: search ? { search } : {} }),
  getStudentInvoices: (sid)    => client.get(`/invoices/students/${sid}/`),
  createInvoice:      (sid, data) => client.post(`/invoices/students/${sid}/`, data),
  updateInvoice:      (id, status) => client.patch(`/invoices/${id}/`, { status }),
  deleteInvoice:      (id)    => client.delete(`/invoices/${id}/`),

  // Admin notifications
  getAdminNotifications: () => client.get('/notifications/'),
  markAdminNotificationRead: (id) => client.patch(`/notifications/${id}/read/`),
  markAllAdminNotificationsRead: () => client.post('/notifications/read-all/'),
};