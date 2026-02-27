import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const timesheetAPI = {
  clockIn:    (d) => api.post('/timesheet/clock-in', d),
  clockOut:   (d) => api.post('/timesheet/clock-out', d),
  breakStart: ()  => api.post('/timesheet/break-start'),
  breakEnd:   ()  => api.post('/timesheet/break-end'),
  getToday:   ()  => api.get('/timesheet/today'),
  getMy:      (p) => api.get('/timesheet/my', { params: p }),
  getAll:     (p) => api.get('/timesheet/all', { params: p }),
  approve:    (id) => api.put(`/timesheet/${id}/approve`),
};

export const leaveAPI = {
  apply:   (d)      => api.post('/leaves/apply', d),
  getMy:   (p)      => api.get('/leaves/my', { params: p }),
  getAll:  (p)      => api.get('/leaves/all', { params: p }),
  review:  (id, d)  => api.put(`/leaves/${id}/review`, d),
  cancel:  (id)     => api.patch(`/leaves/${id}/cancel`),
};

export const reportAPI = {
  attendance: (p) => api.get('/reports/attendance', { params: p }),
  summary:    ()  => api.get('/reports/summary'),
  exportCSV:  (p) => api.get('/reports/attendance', { params: { ...p, format: 'csv' }, responseType: 'blob' }),
  exportPDF:  (p) => api.get('/reports/attendance', { params: { ...p, format: 'pdf' }, responseType: 'blob' }),
};

export const adminAPI = {
  getEmployees:   (p)      => api.get('/admin/employees', { params: p }),
  getEmployee:    (id)     => api.get(`/admin/employees/${id}`),
  updateEmployee: (id, d)  => api.put(`/admin/employees/${id}`, d),
  deactivate:     (id)     => api.delete(`/admin/employees/${id}`),
  resetPassword:  (id, d)  => api.post(`/admin/employees/${id}/reset-password`, d),
  getDepartments: ()       => api.get('/admin/departments'),
  registerUser:   (d)      => api.post('/auth/register', d),
};

export default api;
