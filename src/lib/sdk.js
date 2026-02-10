// src/lib/sdk.js
import { api, unwrap } from "./api";

export const sdk = {
  auth: {
    register: (payload) => api.post("/auth/register", payload).then(unwrap),
    login: (payload) => api.post("/auth/login", payload).then(unwrap),
    refresh: (payload) => api.post("/auth/refresh", payload).then(unwrap),
    logout: (payload) => api.post("/auth/logout", payload).then(unwrap),
    me: () => api.get("/auth/me").then(unwrap),

    forgotPassword: (payload) => api.post("/auth/forgot-password", payload).then(unwrap),
    verifyOtp: (payload) => api.post("/auth/verify-otp", payload).then(unwrap),
    resetPassword: (payload) => api.post("/auth/reset-password", payload).then(unwrap),

    signupRequestOtp: (payload) => api.post("/auth/signup/request-otp", payload).then(unwrap),
    signupVerifyOtp: (payload) => api.post("/auth/signup/verify-otp", payload).then(unwrap),
    signupCancel: (payload) => api.post("/auth/signup/cancel", payload).then(unwrap),
  },

  admin: {
    // Users
    listUsers: (params) => api.get("/admin/users", { params }).then(unwrap),
    createUser: (payload) => api.post("/admin/users", payload).then(unwrap),
    updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload).then(unwrap),
    deleteUser: (id) => api.delete(`/admin/users/${id}`).then(unwrap),

    // Zones
    listZones: (params) => api.get("/admin/zones", { params }).then(unwrap),
    getZoneById: (id) => api.get(`/admin/zones/${id}`).then(unwrap),
    createZone: (payload) => api.post("/admin/zones", payload).then(unwrap),
    updateZone: (id, payload) => api.put(`/admin/zones/${id}`, payload).then(unwrap),
    deleteZone: (id) => api.delete(`/admin/zones/${id}`).then(unwrap),

    // Payment Transactions
    listPaymentTransactions: (params) =>
      api.get("/admin/payment-transactions", { params }).then(unwrap),

    // Households
    listHouseholds: (params) => api.get("/admin/households", { params }).then(unwrap),
    getHouseholdById: (id) => api.get(`/admin/households/${id}`).then(unwrap),
    createHousehold: (payload) => api.post("/admin/households", payload).then(unwrap),
    updateHousehold: (id, payload) => api.put(`/admin/households/${id}`, payload).then(unwrap),
    deleteHousehold: (id) => api.delete(`/admin/households/${id}`).then(unwrap),

    // Bins
    listBins: (params) => api.get("/admin/bins", { params }).then(unwrap),
    getBinById: (id) => api.get(`/admin/bins/${id}`).then(unwrap),
    createBin: (payload) => api.post("/admin/bins", payload).then(unwrap),
    updateBin: (id, payload) => api.put(`/admin/bins/${id}`, payload).then(unwrap),
    deleteBin: (id) => api.delete(`/admin/bins/${id}`).then(unwrap),

    // ✅ Bin IDs (admin)
    listBinIds: (params) => api.get("/admin/binids", { params }).then(unwrap),
    createBinId: (payload) => api.post("/admin/binids", payload).then(unwrap),
    generateBinIdRange: (payload) =>
      api.post("/admin/binids/generate-range", payload).then(unwrap),
    deleteBinId: (id) => api.delete(`/admin/binids/${id}`).then(unwrap),
    deleteBinIdRange: (payload) =>
      api.delete("/admin/binids/delete-range", { data: payload }).then(unwrap),

    // Virtual Bins
    listVirtualBins: (params) => api.get("/admin/virtual-bins", { params }).then(unwrap),
    getVirtualBinById: (id) => api.get(`/admin/virtual-bins/${id}`).then(unwrap),
    createVirtualBin: (payload) => api.post("/admin/virtual-bins", payload).then(unwrap),
    updateVirtualBin: (id, payload) => api.put(`/admin/virtual-bins/${id}`, payload).then(unwrap),
    deleteVirtualBin: (id) => api.delete(`/admin/virtual-bins/${id}`).then(unwrap),
    setVirtualBinMembers: (id, payload) =>
      api.put(`/admin/virtual-bins/${id}/members`, payload).then(unwrap),

    // Vehicles
    listVehicles: (params) => api.get("/admin/vehicles", { params }).then(unwrap),
    getVehicleById: (id) => api.get(`/admin/vehicles/${id}`).then(unwrap),
    createVehicle: (payload) => api.post("/admin/vehicles", payload).then(unwrap),
    updateVehicle: (id, payload) => api.put(`/admin/vehicles/${id}`, payload).then(unwrap),
    deleteVehicle: (id) => api.delete(`/admin/vehicles/${id}`).then(unwrap),

    // Billing Plans
    listBillingPlans: (params) => api.get("/admin/billing-plans", { params }).then(unwrap),
    createBillingPlan: (payload) => api.post("/admin/billing-plans", payload).then(unwrap),
    updateBillingPlan: (id, payload) => api.put(`/admin/billing-plans/${id}`, payload).then(unwrap),
    deleteBillingPlan: (id) => api.delete(`/admin/billing-plans/${id}`).then(unwrap),

    // Membership plans
    listMembershipPlans: (params) => api.get("/admin/membership-plans", { params }).then(unwrap),
    createMembershipPlan: (payload) => api.post("/admin/membership-plans", payload).then(unwrap),
    updateMembershipPlan: (id, payload) => api.put(`/admin/membership-plans/${id}`, payload).then(unwrap),
    deactivateMembershipPlan: (id) => api.delete(`/admin/membership-plans/${id}`).then(unwrap),

    // Reward Rates
    listRewardRates: (params) => api.get("/admin/reward-rates", { params }).then(unwrap),
    getRewardRateById: (id) => api.get(`/admin/reward-rates/${id}`).then(unwrap),
    createRewardRate: (payload) => api.post("/admin/reward-rates", payload).then(unwrap),
    updateRewardRate: (id, payload) => api.put(`/admin/reward-rates/${id}`, payload).then(unwrap),
    deleteRewardRate: (id) => api.delete(`/admin/reward-rates/${id}`).then(unwrap),
  },

  iot: {
    ingestTelemetry: (payload, { iotKey } = {}) =>
      api
        .post("/iot/telemetry", payload, {
          headers: iotKey ? { "x-iot-key": iotKey } : undefined,
        })
        .then(unwrap),
  },

  ops: {
    listCases: (params) => api.get("/ops/cases", { params }).then(unwrap),
    approveCase: (id, payload) => api.post(`/ops/cases/${id}/approve`, payload).then(unwrap),
    rejectCase: (id, payload) => api.post(`/ops/cases/${id}/reject`, payload).then(unwrap),

    listTasks: (params) => api.get("/ops/tasks", { params }).then(unwrap),
    assignTask: (id, payload) => api.post(`/ops/tasks/${id}/assign`, payload).then(unwrap),

    generateRoutes: (payload) => api.post("/ops/routes/generate", payload).then(unwrap),
    listRoutes: (params) => api.get("/ops/routes", { params }).then(unwrap),
    publishRoute: (id) => api.post(`/ops/routes/${id}/publish`).then(unwrap),

    dtAggregate: () => api.post("/ops/dt/aggregate").then(unwrap),
    dtListVirtualBins: (params) => api.get("/ops/dt/virtual-bins", { params }).then(unwrap),

    listRewardClaims: (params) => api.get("/ops/reward-claims", { params }).then(unwrap),
    approveRewardClaim: (id, payload) => api.post(`/ops/reward-claims/${id}/approve`, payload).then(unwrap),
    rejectRewardClaim: (id, payload) => api.post(`/ops/reward-claims/${id}/reject`, payload).then(unwrap),

    generateInvoices: (payload) => api.post("/ops/billing/generate", payload).then(unwrap),
    postVehicleLocation: (vehicleId, payload) =>
      api.post(`/ops/vehicles/${vehicleId}/location`, payload).then(unwrap),
  },

  crew: {
    todayRoute: (params) => api.get("/crew/today-route", { params }).then(unwrap),
    listMyTasks: (params) => api.get("/crew/tasks", { params }).then(unwrap),
    updateTaskStatus: (id, payload) => api.patch(`/crew/tasks/${id}/status`, payload).then(unwrap),

    uploadProof: (id, file) => {
      const fd = new FormData();
      fd.append("file", file);
      return api
        .post(`/crew/tasks/${id}/proof`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        .then(unwrap);
    },

    verifyRecyclable: (id, payload) => api.post(`/crew/recyclables/${id}/verify`, payload).then(unwrap),
    rejectRecyclable: (id, payload) => api.post(`/crew/recyclables/${id}/reject`, payload).then(unwrap),

    listExceptions: (params) => api.get("/crew/exceptions", { params }).then(unwrap),
    createException: (payload) => api.post("/crew/exceptions", payload).then(unwrap),
  },

  citizen: {
    createLitterReport: (payload) => api.post("/citizen/litter-reports", payload).then(unwrap),
    createBulkyRequest: (payload) => api.post("/citizen/bulky-requests", payload).then(unwrap),

    listCases: (params) => api.get("/citizen/cases", { params }).then(unwrap),
    createRewardClaim: (payload) => api.post("/citizen/reward-claims", payload).then(unwrap),

    getSchedule: () => api.get("/citizen/schedule").then(unwrap),
    createMissedPickup: (payload) => api.post("/citizen/missed-pickups", payload).then(unwrap),

    wallet: () => api.get("/citizen/wallet").then(unwrap),
    listInvoices: (params) => api.get("/citizen/invoices", { params }).then(unwrap),
    listBillingPlans: (params) => api.get("/citizen/billing-plans", { params }).then(unwrap),

    listZones: (params) => api.get("/citizen/zones", { params }).then(unwrap),
    listVirtualBins: (params) => api.get("/citizen/virtual-bins", { params }).then(unwrap),

    createHouseholdWithBin: (payload) => api.post("/citizen/household-bins", payload).then(unwrap),

    deleteHouseholdWithBins: (householdId) =>
      api.delete(`/citizen/households/${householdId}?cascade=1`).then(unwrap),
    getMyHouseholds: () => api.get("/citizen/households/me").then(unwrap),
    activateMyBin: (payload) => api.post("/citizen/activate-bin", payload).then(unwrap),
    deactivateMyBin: (payload) => api.post("/citizen/deactivate-bin", payload).then(unwrap),

    initiateEsewa: (payload) => api.post("/payments/esewa/initiate", payload).then(unwrap),
    initiateMonthly: (planId) => api.post("/payments/esewa/initiate", { planId, kind: "MONTHLY" }).then(unwrap),
    initiateDaily: (planId) => api.post("/payments/esewa/initiate", { planId, kind: "DAILY" }).then(unwrap),
    initiateBulky: (planId) => api.post("/payments/esewa/initiate", { planId, kind: "BULKY" }).then(unwrap),
    esewaStatus: (txUuid) => api.get(`/payments/esewa/status/${txUuid}`).then(unwrap),

    updateHouseholdPlan: (householdId, payload) =>
      api.put(`/citizen/households/${householdId}/plan`, payload).then(unwrap),
    updatePickupSchedule: (householdId, payload) =>
      api.put(`/citizen/households/${householdId}/pickup-schedule`, payload).then(unwrap),

    listMembershipPlans: (params) => api.get("/citizen/memberships/plans", { params }).then(unwrap),
    getMyMembership: () => api.get("/citizen/memberships/me").then(unwrap),
    subscribeMembership: (payload) => api.post("/citizen/memberships/subscribe", payload).then(unwrap),
    cancelMembership: (payload) => api.post("/citizen/memberships/cancel", payload).then(unwrap),

    createRecyclableSubmission: (payload, files) => {
      const fd = new FormData();
      Object.entries(payload || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        fd.append(k, String(v));
      });
      (files || []).forEach((f) => fd.append("files", f));

      return api
        .post("/citizen/recyclables/submissions", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then(unwrap);
    },

    listRecyclables: (params) => api.get("/citizen/recyclables/submissions", { params }).then(unwrap),
    listMyHouseholds: () => api.get("/citizen/households/me").then(unwrap),

    notifications: (params) => api.get("/citizen/notifications", { params }).then(unwrap),
    markNotificationRead: (id) => api.put(`/citizen/notifications/${id}/read`, {}).then(unwrap),
    markAllNotificationsRead: () => api.post("/citizen/notifications/read-all", {}).then(unwrap),

    payInvoice: (invoiceId, payload) => api.post(`/citizen/invoices/${invoiceId}/pay`, payload).then(unwrap),
// Citizen Bin IDs (available/unassigned)
listAvailableBinIds: (params) =>
  api.get("/citizen/binids/available", { params }).then(unwrap),


  },
};
