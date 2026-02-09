// src/pages/citizen/BillingPlansPage.jsx
import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty";
import { Badge } from "../../components/ui/badge";

import { sdk } from "../../lib/sdk";
import { formatMoney, pickErrorMessage } from "../../lib/utils";
import { postForm } from "../../lib/postForm";
import { api, unwrap } from "../../lib/api";

// -------------------------
// eSewa helper
// -------------------------
function startEsewaPayment(data) {
  const { formUrl, fields } = data || {};
  if (!formUrl || !fields) {
    toast.error("Invalid eSewa initiate response");
    return;
  }
  if (fields.transaction_uuid) localStorage.setItem("last_esewa_tx_uuid", fields.transaction_uuid);
  postForm(formUrl, fields);
}

// -------------------------
// Transactions (for blocking COMPLETE only)
// -------------------------
async function fetchTransactions() {
  const res = await api.get("/citizen/transactions");
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === "object") return [data];
  return [];
}

function normalizeStatus(v) {
  return String(v || "").trim().toUpperCase();
}
function isComplete(tx) {
  return normalizeStatus(tx?.status) === "COMPLETE";
}

function keyYM(year, month1to12) {
  return `${year}-${String(month1to12).padStart(2, "0")}`;
}

// -------------------------
// Tile
// -------------------------
function EsewaPayButton({ disabled, loading, onClick, label }) {
  return (
    <Button
      type="button"
      variant="primary"
      disabled={disabled}
      onClick={onClick}
      className="h-auto w-full px-3 py-3"
      title={disabled ? "Not available / already paid" : ""}
    >
      <div className="flex flex-col items-center justify-center gap-1 leading-tight">
        <div className="text-[11px] font-semibold">{loading ? "Starting…" : label}</div>
      </div>
    </Button>
  );
}

function PayTile({ title, subtitle, price, badge, disabled, loading, onPay }) {
  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? <div className="text-xs text-muted mt-1">{subtitle}</div> : null}
          </div>
          {badge ? <Badge variant={badge.variant}>{badge.text}</Badge> : null}
        </div>

        <div className="rounded-xl border border-app bg-black/5 dark:bg-white/5 px-3 py-2">
          <div className="text-[11px] text-muted">Price</div>
          <div className="text-base font-semibold">Rs. {formatMoney(price || 0)}</div>
        </div>

        <EsewaPayButton disabled={disabled} loading={loading} label={title} onClick={onPay} />
      </CardContent>
    </Card>
  );
}

export default function BillingPlansPage() {
  // ✅ tabs: "monthly" | "annual"
  const [tab, setTab] = React.useState("monthly");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const qPlans = useQuery({
    queryKey: ["citizen_billing_plans"],
    queryFn: () => sdk.citizen.listBillingPlans(),
  });
  const plans = qPlans.data?.items || [];

  const qTx = useQuery({
    queryKey: ["citizen", "transactions"],
    queryFn: fetchTransactions,
    staleTime: 20_000,
  });
  const txs = Array.isArray(qTx.data) ? qTx.data : [];

  // Build "paid markers" from COMPLETE only
  const paidMonthlyThisMonth = React.useMemo(() => {
    const k = keyYM(year, month);
    for (const t of txs) {
      if (!isComplete(t)) continue;
      if (String(t?.kind || "").toUpperCase() !== "MONTHLY") continue;

      if (Number.isFinite(t?.targetYear) && Number.isFinite(t?.targetMonth)) {
        if (keyYM(Number(t.targetYear), Number(t.targetMonth)) === k) return true;
      } else {
        const d = new Date(t?.createdAt || t?.updatedAt || t?.date || 0);
        if (!Number.isNaN(d.getTime()) && keyYM(d.getFullYear(), d.getMonth() + 1) === k) return true;
      }
    }
    return false;
  }, [txs, year, month]);

  const paidAnnualThisYear = React.useMemo(() => {
    for (const t of txs) {
      if (!isComplete(t)) continue;
      if (String(t?.kind || "").toUpperCase() !== "ANNUAL") continue;

      if (Number.isFinite(t?.targetYear)) {
        if (Number(t.targetYear) === year) return true;
      } else {
        const d = new Date(t?.createdAt || t?.updatedAt || t?.date || 0);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === year) return true;
      }
    }
    return false;
  }, [txs, year]);

  const [pendingKey, setPendingKey] = React.useState("");

  const pay = useMutation({
    mutationFn: ({ planId, kind }) => {
      if (kind === "MONTHLY") return sdk.citizen.initiateEsewa({ planId, kind, year, month });
      if (kind === "ANNUAL") return sdk.citizen.initiateEsewa({ planId, kind, year });
      return sdk.citizen.initiateEsewa({ planId, kind });
    },
    onSuccess: (data) => {
      startEsewaPayment(data);
      setPendingKey("");
    },
    onError: (e) => {
      toast.error(pickErrorMessage(e));
      setPendingKey("");
    },
  });

  const handlePay = (planId, kind) => {
    const key = `${planId}:${kind}`;
    setPendingKey(key);
    pay.mutate({ planId, kind });
  };

  // ✅ MONTHLY TAB: show plans that have any monthly/daily/bulky fee
  const monthlyPlans = React.useMemo(() => {
    return (Array.isArray(plans) ? plans : []).filter((p) => {
      const monthlyFee = Number(p?.monthlyFee || 0);
      const dailyFee = Number(p?.dailyPickupFee || 0);
      const bulkyFee =
        p?.bulkyDailyChargeOverride == null ? 0 : Number(p?.bulkyDailyChargeOverride || 0);
      return monthlyFee > 0 || dailyFee > 0 || bulkyFee > 0;
    });
  }, [plans]);

  // ✅ ANNUAL TAB: show ONLY ONE annual plan (prefer active + has annualFee)
  const annualPlan = React.useMemo(() => {
    const list = Array.isArray(plans) ? plans : [];
    const active = list.filter((p) => p?.isActive !== false);

    return (
      active.find((p) => Number(p?.annualFee || 0) > 0) ||
      list.find((p) => Number(p?.annualFee || 0) > 0) ||
      null
    );
  }, [plans]);

  if (qPlans.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing Plans" subtitle="Choose what you want to pay via eSewa." />
        <div className="text-sm text-muted">Loading plans...</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing Plans" subtitle="Choose what you want to pay via eSewa." />
        <EmptyState title="No plans available" description="Ask admin to create billing plans." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing Plans" subtitle="Choose what you want to pay via eSewa." />

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={tab === "monthly" ? "default" : "outline"} onClick={() => setTab("monthly")}>
          Monthly
        </Button>
        <Button variant={tab === "annual" ? "default" : "outline"} onClick={() => setTab("annual")}>
          Annual
        </Button>
      </div>

      {/* MONTHLY TAB */}
      {tab === "monthly" && (
        <>
          <Card>
            <CardContent className="py-5 text-xs text-muted">
              Current period:{" "}
              <span className="font-semibold">
                {year}-{String(month).padStart(2, "0")}
              </span>
              <div className="mt-1">
                Monthly status:{" "}
                <span className="font-semibold">
                  {paidAnnualThisYear
                    ? "Covered by ANNUAL (COMPLETE)"
                    : paidMonthlyThisMonth
                    ? "Paid (COMPLETE)"
                    : "Unpaid"}
                </span>
              </div>
            </CardContent>
          </Card>

          {monthlyPlans.length === 0 ? (
            <EmptyState
              title="No monthly/daily/bulky fees configured"
              description="Ask admin to set monthlyFee / dailyPickupFee / bulkyDailyChargeOverride."
            />
          ) : (
            <div className="space-y-8">
              {monthlyPlans.map((p) => {
                const id = p._id || p.id;

                const monthlyFee = Number(p.monthlyFee || 0);
                const dailyFee = Number(p.dailyPickupFee || 0);
                const bulkyFee =
                  p.bulkyDailyChargeOverride == null ? 0 : Number(p.bulkyDailyChargeOverride || 0);

                const canMonthly = monthlyFee > 0;
                const canDaily = dailyFee > 0;
                const canBulky = bulkyFee > 0;

                const disabledBase = pay.isPending || p.isActive === false;

                // Block MONTHLY if annual complete or monthly paid
                const blockMonthly = paidAnnualThisYear || paidMonthlyThisMonth;

                const isMonthlyPending = pendingKey === `${id}:MONTHLY`;
                const isDailyPending = pendingKey === `${id}:DAILY`;
                const isBulkyPending = pendingKey === `${id}:BULKY`;

                return (
                  <Card key={id}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold">{p.name}</div>
                          <div className="mt-1 text-xs text-muted">
                            Monthly tab: Annual is hidden here.
                          </div>
                        </div>

                        <Badge variant={p.isActive === false ? "secondary" : "success"}>
                          {p.isActive === false ? "INACTIVE" : "ACTIVE"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <PayTile
                          title="Pay Monthly"
                          subtitle={`Subscription fee for ${year}-${String(month).padStart(2, "0")}`}
                          price={monthlyFee}
                          badge={{ text: "MONTHLY", variant: "success" }}
                          disabled={disabledBase || !canMonthly || blockMonthly}
                          loading={isMonthlyPending}
                          onPay={() => handlePay(id, "MONTHLY")}
                        />

                        <PayTile
                          title="Pay Daily"
                          subtitle="Daily pickup fee"
                          price={dailyFee}
                          badge={{ text: "DAILY", variant: "secondary" }}
                          disabled={disabledBase || !canDaily}
                          loading={isDailyPending}
                          onPay={() => handlePay(id, "DAILY")}
                        />

                        <PayTile
                          title="Pay Bulky"
                          subtitle="Bulky pickup override"
                          price={bulkyFee}
                          badge={{ text: "BULKY", variant: "secondary" }}
                          disabled={disabledBase || !canBulky}
                          loading={isBulkyPending}
                          onPay={() => handlePay(id, "BULKY")}
                        />
                      </div>

                      {blockMonthly && (
                        <div className="text-xs text-muted">
                          * Monthly is blocked because there is a <b>COMPLETE</b> annual payment this year
                          or a <b>COMPLETE</b> monthly payment this month.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ANNUAL TAB */}
      {tab === "annual" && (
        <>
          {!annualPlan ? (
            <EmptyState
              title="No annual plan available"
              description="Ask admin to set annualFee for an active plan."
            />
          ) : (
            (() => {
              const p = annualPlan;
              const id = p._id || p.id;

              const annualFee = Number(p.annualFee || 0);
              const canAnnual = annualFee > 0;

              const disabledBase = pay.isPending || p.isActive === false;

              const blockAnnual = paidAnnualThisYear;

              const isAnnualPending = pendingKey === `${id}:ANNUAL`;

              return (
                <Card key={id}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{p.name}</div>
                        <div className="mt-1 text-xs text-muted">
                          Annual tab: showing only one annual plan.
                        </div>
                      </div>

                      <Badge variant={p.isActive === false ? "secondary" : "success"}>
                        {p.isActive === false ? "INACTIVE" : "ACTIVE"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <PayTile
                        title="Pay Annual"
                        subtitle={`Subscription fee for year ${year}`}
                        price={annualFee}
                        badge={{ text: "ANNUAL", variant: "warning" }}
                        disabled={disabledBase || !canAnnual || blockAnnual}
                        loading={isAnnualPending}
                        onPay={() => handlePay(id, "ANNUAL")}
                      />
                    </div>

                    {blockAnnual && (
                      <div className="text-xs text-muted">
                        * Annual is blocked because there is already a <b>COMPLETE</b> annual payment for
                        this year.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()
          )}
        </>
      )}
    </div>
  );
}
