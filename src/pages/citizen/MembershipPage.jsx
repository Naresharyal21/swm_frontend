// src/pages/citizen/MembershipPage.jsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/ui/empty";
import { Select } from "../../components/ui/select";

import { api, unwrap } from "../../lib/api";
import { sdk } from "../../lib/sdk";
import { formatMoney, pickErrorMessage } from "../../lib/utils";

/* -------------------------
   Transactions helpers
------------------------- */
function normalizeStatus(v) {
  return String(v || "").trim().toUpperCase();
}
function isComplete(tx) {
  return normalizeStatus(tx?.status) === "COMPLETE";
}
function txKind(tx) {
  return String(tx?.kind || "").trim().toUpperCase();
}
function txPlanId(tx) {
  return tx?.planId?._id || tx?.planId || tx?.billingPlanId || tx?.plan?._id || tx?.plan || null;
}
function txHouseholdId(tx) {
  return tx?.householdId?._id || tx?.householdId || null;
}
function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

async function fetchTransactions() {
  const res = await api.get("/citizen/transactions");
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function badgeVariantForBinStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return "success";
  if (s === "INACTIVE") return "warning";
  if (s === "SUSPENDED") return "danger";
  return "secondary";
}

/* -------------------------
   Component
------------------------- */
export default function MembershipPage() {
  const qc = useQueryClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Households
  const householdsQ = useQuery({
    queryKey: ["citizen_my_households"],
    queryFn: () => sdk.citizen.getMyHouseholds(),
    staleTime: 30_000,
  });
  const households = householdsQ.data?.items || [];

  const [householdId, setHouseholdId] = useState("");

  const selectedHousehold = useMemo(
    () => households.find((h) => String(h?._id || h?.id) === String(householdId)),
    [households, householdId]
  );

  // Billing plans (names/fees)
  const plansQ = useQuery({
    queryKey: ["citizen_billing_plans"],
    queryFn: () => sdk.citizen.listBillingPlans(),
    staleTime: 30_000,
  });
  const allPlans = plansQ.data?.items || [];

  // Transactions
  const txQ = useQuery({
    queryKey: ["citizen_transactions"],
    queryFn: fetchTransactions,
    staleTime: 20_000,
    retry: (count, err) => {
      const s = err?.response?.status;
      if (s === 401 || s === 403) return false;
      return count < 2;
    },
  });
  const txs = Array.isArray(txQ.data) ? txQ.data : [];

  // detect current bin status best-effort
  const currentBinStatus = useMemo(() => {
    const s =
      selectedHousehold?.bin?.status ||
      selectedHousehold?.binStatus ||
      selectedHousehold?.status ||
      selectedHousehold?.bins?.[0]?.status ||
      null;
    return s ? String(s).toUpperCase() : "UNKNOWN";
  }, [selectedHousehold]);

  const binIsActive = currentBinStatus === "ACTIVE";

  // -------------------------
  // ✅ Paid plans ONLY (Option A: per household)
  // -------------------------
  const paidPlanRows = useMemo(() => {
    if (!householdId) return [];

    const hid = String(householdId);

    // filter to this household and paid monthly/annual
    const paid = txs.filter((t) => {
      if (!isComplete(t)) return false;
      const k = txKind(t);
      if (k !== "MONTHLY" && k !== "ANNUAL") return false;

      const th = txHouseholdId(t);
      return String(th || "") === hid;
    });

    // group by planId + kind + period
    const groups = new Map();

    for (const t of paid) {
      const pid = txPlanId(t);
      if (!pid) continue;

      const k = txKind(t);
      const y = toInt(t?.targetYear);
      const m = toInt(t?.targetMonth);

      let key = null;
      if (k === "MONTHLY" && y && m) key = `${pid}|MONTHLY|${y}|${m}`;
      else if (k === "ANNUAL" && y) key = `${pid}|ANNUAL|${y}`;
      else key = `${pid}|${k}|UNKNOWN`;

      const prev = groups.get(key);
      if (!prev) {
        groups.set(key, t);
        continue;
      }

      const prevTime = toDate(prev?.createdAt || prev?.updatedAt)?.getTime() || 0;
      const curTime = toDate(t?.createdAt || t?.updatedAt)?.getTime() || 0;
      if (curTime >= prevTime) groups.set(key, t);
    }

    const out = [];
    for (const [key, t] of groups.entries()) {
      const pid = String(txPlanId(t));
      const plan = allPlans.find((p) => String(p?._id || p?.id) === pid) || null;

      const kind = txKind(t);
      const y = toInt(t?.targetYear);
      const m = toInt(t?.targetMonth);

      const isActivePeriod =
        kind === "MONTHLY"
          ? y === currentYear && m === currentMonth
          : kind === "ANNUAL"
          ? y === currentYear
          : false;

      out.push({
        key,
        pid,
        plan,
        tx: t,
        kind,
        year: y,
        month: m,
        isActivePeriod,
      });
    }

    // Sort: active period first, then annual, then newest
    out.sort((a, b) => {
      if (a.isActivePeriod !== b.isActivePeriod) return a.isActivePeriod ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === "ANNUAL" ? -1 : 1;

      const at = toDate(a.tx?.createdAt || a.tx?.updatedAt)?.getTime() || 0;
      const bt = toDate(b.tx?.createdAt || b.tx?.updatedAt)?.getTime() || 0;
      return bt - at;
    });

    return out;
  }, [txs, householdId, allPlans, currentYear, currentMonth]);

  // ✅ Activate (Subscribe)
  const activate = useMutation({
    mutationFn: async ({ householdId, planId }) => {
      if (!householdId) throw new Error("Select a household first");
      if (!planId) throw new Error("Missing paid planId");
      return sdk.citizen.activateMyBin({ householdId, planId });
    },
    onSuccess: () => {
      toast.success("Subscribed / Activated");
      qc.invalidateQueries({ queryKey: ["citizen_my_households"] });
      qc.invalidateQueries({ queryKey: ["citizen_transactions"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  // ✅ Deactivate (Unsubscribe)
  const deactivate = useMutation({
    mutationFn: async ({ householdId }) => {
      if (!householdId) throw new Error("Select a household first");
      // You must implement this in sdk + backend:
      // sdk.citizen.deactivateMyBin({ householdId })
      return sdk.citizen.deactivateMyBin({ householdId });
    },
    onSuccess: () => {
      toast.success("Unsubscribed / Deactivated");
      qc.invalidateQueries({ queryKey: ["citizen_my_households"] });
      qc.invalidateQueries({ queryKey: ["citizen_transactions"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const busy = activate.isPending || deactivate.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription (Paid Plans)"
        subtitle="Select a household. Only paid Monthly/Annual plans for that household are shown. Button toggles Subscribe/Unsubscribe (Activate/Deactivate)."
      />

      {/* Household selector */}
      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Select household</div>
          <div className="text-sm text-muted">Payment is linked to ONE household/bin (Option A).</div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <div className="text-sm font-medium mb-1">Household *</div>
            <Select value={householdId} onChange={(e) => setHouseholdId(e.target.value)}>
              <option value="">
                {householdsQ.isLoading ? "Loading households..." : "Select household"}
              </option>
              {households.map((h) => (
                <option key={h._id || h.id} value={h._id || h.id}>
                  {h.address || (h._id || h.id)}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-muted">Current bin status:</div>
            <Badge variant={badgeVariantForBinStatus(currentBinStatus)}>{currentBinStatus}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Paid plans for this household */}
      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Paid plans for this household</div>
          <div className="text-sm text-muted">
            We show COMPLETE Monthly/Annual transactions where householdId = selected household.
          </div>
        </CardHeader>

        <CardContent className="grid gap-3">
          {!householdId ? (
            <EmptyState title="Select a household first" description="Choose a household to see its paid plans." />
          ) : txQ.isLoading || plansQ.isLoading ? (
            <div className="text-sm text-muted">Loading paid plans...</div>
          ) : paidPlanRows.length === 0 ? (
            <EmptyState
              title="No paid monthly/annual plans found for this household"
              description="Pay a monthly or annual fee for this household first, then come back here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 px-2 border-b border-border text-muted font-semibold">Plan</th>
                    <th className="py-2 px-2 border-b border-border text-muted font-semibold">Type</th>
                    <th className="py-2 px-2 border-b border-border text-muted font-semibold">Period</th>
                    <th className="py-2 px-2 border-b border-border text-muted font-semibold">Status</th>
                    <th className="py-2 px-2 border-b border-border text-muted font-semibold text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paidPlanRows.map((row) => {
                    const { key, pid, plan, kind, year, month, isActivePeriod } = row;

                    const planName = plan?.name || "Paid Plan";
                    const fee =
                      kind === "ANNUAL"
                        ? (plan?.annualFee ?? plan?.yearlyFee ?? plan?.price ?? plan?.amount ?? 0)
                        : (plan?.monthlyFee ?? plan?.price ?? plan?.amount ?? 0);

                    const periodText =
                      kind === "MONTHLY"
                        ? year && month
                          ? `${year}-${String(month).padStart(2, "0")}`
                          : "—"
                        : kind === "ANNUAL"
                        ? year
                          ? String(year)
                          : "—"
                        : "—";

                    // ✅ TOGGLE BUTTON:
                    // - If bin ACTIVE => show Unsubscribe/Deactivate (does NOT need planId)
                    // - If bin INACTIVE => show Subscribe/Activate (needs planId from this row)
                    const label = binIsActive ? "Unsubscribe" : "Subscribe";

                    const onToggle = () => {
                      if (!householdId) return toast.error("Select a household first");
                      if (binIsActive) return deactivate.mutate({ householdId });
                      return activate.mutate({ householdId, planId: pid });
                    };

                    const disabled =
                      busy ||
                      !householdId ||
                      (!binIsActive && !pid); // activate needs planId

                    return (
                      <tr key={key} className="hover:bg-[rgba(var(--border),0.12)]">
                        <td className="py-3 px-2 border-b border-border">
                          <div className="font-semibold">{planName}</div>
                          <div className="text-xs text-muted">Rs. {formatMoney(fee)}</div>
                        </td>

                        <td className="py-3 px-2 border-b border-border">
                          <Badge variant={kind === "ANNUAL" ? "warning" : "success"}>{kind}</Badge>
                        </td>

                        <td className="py-3 px-2 border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{periodText}</span>
                            {isActivePeriod ? <Badge variant="secondary">Active period</Badge> : null}
                          </div>
                        </td>

                        <td className="py-3 px-2 border-b border-border">
                          <Badge variant="success">PAID</Badge>
                        </td>

                        <td className="py-3 px-2 border-b border-border text-right">
                          <Button
                            variant={binIsActive ? "outline" : "secondary"}
                            disabled={disabled}
                            onClick={onToggle}
                            title={
                              binIsActive
                                ? "Deactivates this household bin"
                                : "Activates this household bin using this paid plan"
                            }
                          >
                            {busy ? "Updating..." : label}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

             
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
