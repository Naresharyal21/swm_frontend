// src/lib/adminApi.js
import { api, unwrap } from "./api";

// NOTE:
// baseURL in api.js is .../api
// so calling api.get("/admin/users") => http://localhost:5000/api/admin/users

export const adminApi = {
  // --------------------
  // Users
  // --------------------
  listUsers: () => api.get("/admin/users").then(unwrap),
  createUser: (payload) => api.post("/admin/users", payload).then(unwrap),
  updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload).then(unwrap),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then(unwrap),

  // --------------------
  // Zones
  // --------------------
  listZones: () => api.get("/admin/zones").then(unwrap),
  createZone: (payload) => api.post("/admin/zones", payload).then(unwrap),
  getZoneById: (id) => api.get(`/admin/zones/${id}`).then(unwrap),
  updateZone: (id, payload) => api.put(`/admin/zones/${id}`, payload).then(unwrap),
  deleteZone: (id) => api.delete(`/admin/zones/${id}`).then(unwrap),

  // --------------------
  // Households
  // --------------------
  listHouseholds: (params = {}) => api.get("/admin/households", { params }).then(unwrap),
  createHousehold: (payload) => api.post("/admin/households", payload).then(unwrap),
  getHouseholdById: (id) => api.get(`/admin/households/${id}`).then(unwrap),
  updateHousehold: (id, payload) => api.put(`/admin/households/${id}`, payload).then(unwrap),
  deleteHousehold: (id) => api.delete(`/admin/households/${id}`).then(unwrap),

  // --------------------
  // Bins
  // --------------------
  listBins: (params = {}) => api.get("/admin/bins", { params }).then(unwrap),
  createBin: (payload) => api.post("/admin/bins", payload).then(unwrap),
  getBinById: (id) => api.get(`/admin/bins/${id}`).then(unwrap),
  updateBin: (id, payload) => api.put(`/admin/bins/${id}`, payload).then(unwrap),
  deleteBin: (id) => api.delete(`/admin/bins/${id}`).then(unwrap),

  // --------------------
  // Virtual Bins
  // --------------------
  listVirtualBins: (params = {}) => api.get("/admin/virtual-bins", { params }).then(unwrap),
  createVirtualBin: (payload) => api.post("/admin/virtual-bins", payload).then(unwrap),
  getVirtualBinById: (id) => api.get(`/admin/virtual-bins/${id}`).then(unwrap),
  updateVirtualBin: (id, payload) => api.put(`/admin/virtual-bins/${id}`, payload).then(unwrap),
  deleteVirtualBin: (id) => api.delete(`/admin/virtual-bins/${id}`).then(unwrap),
  setVirtualBinMembers: (id, binIds) =>
    api.put(`/admin/virtual-bins/${id}/members`, { binIds }).then(unwrap),

  // --------------------
  // Vehicles
  // --------------------
  listVehicles: (params = {}) => api.get("/admin/vehicles", { params }).then(unwrap),
  createVehicle: (payload) => api.post("/admin/vehicles", payload).then(unwrap),
  getVehicleById: (id) => api.get(`/admin/vehicles/${id}`).then(unwrap),
  updateVehicle: (id, payload) => api.put(`/admin/vehicles/${id}`, payload).then(unwrap),
  deleteVehicle: (id) => api.delete(`/admin/vehicles/${id}`).then(unwrap),

  // --------------------
  // Billing Plans
  // --------------------
  listBillingPlans: () => api.get("/admin/billing-plans").then(unwrap),
  createBillingPlan: (payload) => api.post("/admin/billing-plans", payload).then(unwrap),
  updateBillingPlan: (id, payload) =>
    api.put(`/admin/billing-plans/${id}`, payload).then(unwrap),
  deleteBillingPlan: (id) => api.delete(`/admin/billing-plans/${id}`).then(unwrap),

  // --------------------
  // Membership Plans
  // --------------------
  listMembershipPlans: () => api.get("/admin/membership-plans").then(unwrap),
  createMembershipPlan: (payload) => api.post("/admin/membership-plans", payload).then(unwrap),
  updateMembershipPlan: (id, payload) =>
    api.put(`/admin/membership-plans/${id}`, payload).then(unwrap),
  deactivateMembershipPlan: (id) =>
    api.delete(`/admin/membership-plans/${id}`).then(unwrap),

  // --------------------
  // Reward Rates
  // --------------------
  listRewardRates: () => api.get("/admin/reward-rates").then(unwrap),
  createRewardRate: (payload) => api.post("/admin/reward-rates", payload).then(unwrap),
  getRewardRateById: (id) => api.get(`/admin/reward-rates/${id}`).then(unwrap),
  updateRewardRate: (id, payload) =>
    api.put(`/admin/reward-rates/${id}`, payload).then(unwrap),
  deleteRewardRate: (id) => api.delete(`/admin/reward-rates/${id}`).then(unwrap),
};
