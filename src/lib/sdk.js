import { api, unwrap } from './api'

export const sdk = {
  auth: {
    register: (payload) => api.post('/auth/register', payload).then(unwrap),
    login: (payload) => api.post('/auth/login', payload).then(unwrap),
    refresh: (payload) => api.post('/auth/refresh', payload).then(unwrap),
    logout: (payload) => api.post('/auth/logout', payload).then(unwrap),
    me: () => api.get('/auth/me').then(unwrap)
  },

  admin: {
    listUsers: (params) => api.get('/admin/users', { params }).then(unwrap),
    createUser: (payload) => api.post('/admin/users', payload).then(unwrap),
    updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload).then(unwrap),
    deleteUser: (id) => api.delete(`/admin/users/${id}`).then(unwrap),

    listZones: (params) => api.get('/admin/zones', { params }).then(unwrap),
    createZone: (payload) => api.post('/admin/zones', payload).then(unwrap),
    updateZone: (id, payload) => api.put(`/admin/zones/${id}`, payload).then(unwrap),
    deleteZone: (id) => api.delete(`/admin/zones/${id}`).then(unwrap),

    listHouseholds: (params) => api.get('/admin/households', { params }).then(unwrap),
    createHousehold: (payload) => api.post('/admin/households', payload).then(unwrap),

    listBins: (params) => api.get('/admin/bins', { params }).then(unwrap),
    createBin: (payload) => api.post('/admin/bins', payload).then(unwrap),

    listVirtualBins: (params) => api.get('/admin/virtual-bins', { params }).then(unwrap),
    createVirtualBin: (payload) => api.post('/admin/virtual-bins', payload).then(unwrap),
    setVirtualBinMembers: (id, payload) => api.put(`/admin/virtual-bins/${id}/members`, payload).then(unwrap),

    listVehicles: (params) => api.get('/admin/vehicles', { params }).then(unwrap),
    createVehicle: (payload) => api.post('/admin/vehicles', payload).then(unwrap),

    listBillingPlans: (params) => api.get('/admin/billing-plans', { params }).then(unwrap),
    createBillingPlan: (payload) => api.post('/admin/billing-plans', payload).then(unwrap),
    updateBillingPlan: (id, payload) => api.put(`/admin/billing-plans/${id}`, payload).then(unwrap),
    deleteBillingPlan: (id) => api.delete(`/admin/billing-plans/${id}`).then(unwrap),

    listMembershipPlans: (params) => api.get('/admin/membership-plans', { params }).then(unwrap),
    createMembershipPlan: (payload) => api.post('/admin/membership-plans', payload).then(unwrap),
    updateMembershipPlan: (id, payload) => api.put(`/admin/membership-plans/${id}`, payload).then(unwrap),
    deactivateMembershipPlan: (id) => api.delete(`/admin/membership-plans/${id}`).then(unwrap),

    listRewardRates: (params) => api.get('/admin/reward-rates', { params }).then(unwrap),
    createRewardRate: (payload) => api.post('/admin/reward-rates', payload).then(unwrap)
  },

  iot: {
    ingestTelemetry: (payload, { iotKey } = {}) =>
      api
        .post('/iot/telemetry', payload, {
          headers: iotKey ? { 'x-iot-key': iotKey } : undefined
        })
        .then(unwrap)
  },

  ops: {
    listCases: (params) => api.get('/ops/cases', { params }).then(unwrap),
    approveCase: (id, payload) => api.post(`/ops/cases/${id}/approve`, payload).then(unwrap),
    rejectCase: (id, payload) => api.post(`/ops/cases/${id}/reject`, payload).then(unwrap),

    listTasks: (params) => api.get('/ops/tasks', { params }).then(unwrap),
    assignTask: (id, payload) => api.post(`/ops/tasks/${id}/assign`, payload).then(unwrap),

    generateRoutes: (payload) => api.post('/ops/routes/generate', payload).then(unwrap),
    listRoutes: (params) => api.get('/ops/routes', { params }).then(unwrap),
    publishRoute: (id) => api.post(`/ops/routes/${id}/publish`).then(unwrap),

    dtAggregate: () => api.post('/ops/dt/aggregate').then(unwrap),
    dtListVirtualBins: (params) => api.get('/ops/dt/virtual-bins', { params }).then(unwrap),

    listRewardClaims: (params) => api.get('/ops/reward-claims', { params }).then(unwrap),
    approveRewardClaim: (id, payload) => api.post(`/ops/reward-claims/${id}/approve`, payload).then(unwrap),
    rejectRewardClaim: (id, payload) => api.post(`/ops/reward-claims/${id}/reject`, payload).then(unwrap),

    generateInvoices: (payload) => api.post('/ops/billing/generate', payload).then(unwrap),
    postVehicleLocation: (vehicleId, payload) => api.post(`/ops/vehicles/${vehicleId}/location`, payload).then(unwrap)
  },

  crew: {
    todayRoute: (params) => api.get('/crew/today-route', { params }).then(unwrap),
    listMyTasks: (params) => api.get('/crew/tasks', { params }).then(unwrap),
    updateTaskStatus: (id, payload) => api.patch(`/crew/tasks/${id}/status`, payload).then(unwrap),
    uploadProof: (id, file) => {
      const fd = new FormData()
      fd.append('file', file)
      return api
        .post(`/crew/tasks/${id}/proof`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(unwrap)
    },
    verifyRecyclable: (id, payload) => api.post(`/crew/recyclables/${id}/verify`, payload).then(unwrap),
    rejectRecyclable: (id, payload) => api.post(`/crew/recyclables/${id}/reject`, payload).then(unwrap),
    listExceptions: (params) => api.get('/crew/exceptions', { params }).then(unwrap),
    createException: (payload) => api.post('/crew/exceptions', payload).then(unwrap)
  },

  citizen: {
    createLitterReport: (payload) => api.post('/citizen/litter-reports', payload).then(unwrap),
    createBulkyRequest: (payload) => api.post('/citizen/bulky-requests', payload).then(unwrap),
    listCases: (params) => api.get('/citizen/cases', { params }).then(unwrap),

    createRewardClaim: (payload) => api.post('/citizen/reward-claims', payload).then(unwrap),

    // Optional endpoints (present in earlier FE builds / some backend versions)
    getSchedule: () => api.get('/citizen/schedule').then(unwrap),
    createMissedPickup: (payload) => api.post('/citizen/missed-pickups', payload).then(unwrap),

    wallet: () => api.get('/citizen/wallet').then(unwrap),
    listInvoices: (params) => api.get('/citizen/invoices', { params }).then(unwrap),
    listBillingPlans: (params) => api.get('/citizen/billing-plans', { params }).then(unwrap),

    // ✅ eSewa subscription (plan-based)
    initiateEsewa: (planId) => api.post('/payments/esewa/initiate', { planId }).then(unwrap),
    esewaStatus: (txUuid) => api.get(`/payments/esewa/status/${txUuid}`).then(unwrap),

    updateHouseholdPlan: (householdId, payload) =>
      api.put(`/citizen/households/${householdId}/plan`, payload).then(unwrap),
    updatePickupSchedule: (householdId, payload) =>
      api.put(`/citizen/households/${householdId}/pickup-schedule`, payload).then(unwrap),

    listMembershipPlans: (params) => api.get('/citizen/memberships/plans', { params }).then(unwrap),
    getMyMembership: () => api.get('/citizen/memberships/me').then(unwrap),
    subscribeMembership: (payload) => api.post('/citizen/memberships/subscribe', payload).then(unwrap),
    cancelMembership: (payload) => api.post('/citizen/memberships/cancel', payload).then(unwrap),

    createRecyclableSubmission: (payload, files) => {
      const fd = new FormData()
      Object.entries(payload || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        fd.append(k, String(v))
      })
      ;(files || []).forEach((f) => fd.append('files', f))

      return api
        .post('/citizen/recyclables/submissions', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(unwrap)
    },
    listRecyclables: (params) => api.get('/citizen/recyclables/submissions', { params }).then(unwrap),

    listMyHouseholds: () => api.get('/citizen/households/me').then(unwrap),

    notifications: (params) => api.get('/citizen/notifications', { params }).then(unwrap),
    markNotificationRead: (id) => api.put(`/citizen/notifications/${id}/read`).then(unwrap),
    markAllNotificationsRead: () => api.post('/citizen/notifications/read-all').then(unwrap),

    payInvoice: (invoiceId, payload) => api.post(`/citizen/invoices/${invoiceId}/pay`, payload).then(unwrap)
  }
}
