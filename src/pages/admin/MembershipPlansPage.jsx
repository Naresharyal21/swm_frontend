// src/pages/admin/MembershipPlansPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Table, THead, TH, TR, TD } from "../../components/ui/table";
import { EmptyState } from "../../components/ui/empty";
import { Badge } from "../../components/ui/badge";
import { Select } from "../../components/ui/select";

import { sdk } from "../../lib/sdk";
import { formatDateTime, formatMoney, pickErrorMessage } from "../../lib/utils";

// ✅ PDF download (frontend-only)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* -------------------------
   helpers
------------------------- */
function norm(v) {
  return String(v || "").trim();
}
function normUpper(v) {
  return String(v || "").trim().toUpperCase();
}
function txUser(tx) {
  return tx?.userId && typeof tx.userId === "object" ? tx.userId : null;
}
function txPlan(tx) {
  return tx?.planId && typeof tx.planId === "object" ? tx.planId : null;
}
function txHouseholdId(tx) {
  return tx?.householdId?._id || tx?.householdId || "";
}
function statusVariant(s) {
  const v = normUpper(s);
  if (v === "COMPLETE") return "success";
  if (v === "PENDING" || v === "INITIATED") return "warning";
  if (v === "FAILED" || v === "CANCELED") return "danger";
  return "secondary";
}

function exportPaidBillsPdf(rows, meta = {}) {
  // ✅ LANDSCAPE PDF
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

  doc.setFontSize(14);
  doc.text("Paid Bills (Payment Transactions)", 40, 40);

  doc.setFontSize(10);
  const sub = [
    meta?.generatedAt ? `Generated: ${meta.generatedAt}` : null,
    meta?.filterText ? `Filter: ${meta.filterText}` : null,
  ].filter(Boolean);
  if (sub.length) doc.text(sub.join(" | "), 40, 58);

  const body = rows.map((t, idx) => {
    const user = txUser(t);
    const plan = txPlan(t);

    const userName =
      user?.name ||
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      "—";

    const kind = normUpper(t?.kind);
    const period =
      kind === "MONTHLY"
        ? t?.targetYear && t?.targetMonth
          ? `${t.targetYear}-${String(t.targetMonth).padStart(2, "0")}`
          : "—"
        : kind === "ANNUAL"
        ? t?.targetYear
          ? String(t.targetYear)
          : "—"
        : "—";

    return [
      String(idx + 1),
      userName,
      user?.email || "—",
      plan?.name || "—",
      kind,
      period,
      `Rs. ${formatMoney(Number(t?.amount || 0))}`,
      normUpper(t?.status),
      norm(t?.provider),
      norm(t?.transactionUuid),
      txHouseholdId(t) ? String(txHouseholdId(t)) : "—",
      formatDateTime(t?.createdAt),
    ];
  });

  autoTable(doc, {
    startY: 78,
    head: [[
      "#",
      "User",
      "Email",
      "Plan",
      "Kind",
      "Period",
      "Amount",
      "Status",
      "Provider",
      "Tx UUID",
      "Household",
      "Created",
    ]],
    body,
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fontSize: 8 },
    margin: { left: 20, right: 20 },
    tableWidth: "auto",
  });

  doc.save(`paid-bills-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function MembershipPlansPage() {
  const qc = useQueryClient();

  // Membership plans overview (fetch only; not displayed)
  useQuery({
    queryKey: ["admin_membership_plans"],
    queryFn: () => sdk.admin.listMembershipPlans(),
    staleTime: 30_000,
  });

  // -------------------------
  // Paid Bills state
  // -------------------------
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced
  const [kind, setKind] = useState("ALL");
  const [status, setStatus] = useState("COMPLETE");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // debounce search -> search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const paidQ = useQuery({
    queryKey: ["admin_paid_bills_base", { status }],
    queryFn: () =>
      sdk.admin.listPaymentTransactions({
        status: status || undefined,
        limit: 500,
      }),
    staleTime: 20_000,
    retry: (count, err) => {
      const s = err?.response?.status;
      if (s === 401 || s === 403) return false;
      return count < 2;
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const paidItems = paidQ.data?.items || [];

  const filteredPaid = useMemo(() => {
    const s = normUpper(search);

    return (Array.isArray(paidItems) ? paidItems : []).filter((t) => {
      if (status && normUpper(t?.status) !== normUpper(status)) return false;
      if (kind !== "ALL" && normUpper(t?.kind) !== kind) return false;

      const d = new Date(t?.createdAt || t?.updatedAt || 0);

      if (from) {
        const f = new Date(from);
        if (!Number.isNaN(f.getTime()) && d < f) return false;
      }
      if (to) {
        const tt = new Date(to);
        if (!Number.isNaN(tt.getTime())) {
          tt.setHours(23, 59, 59, 999);
          if (d > tt) return false;
        }
      }

      if (!s) return true;

      const user = txUser(t);
      const plan = txPlan(t);

      const hay = [
        t?.transactionUuid,
        t?.providerRefId,
        t?.provider,
        t?.kind,
        t?.status,
        t?.currency,
        String(t?.amount ?? ""),
        String(t?.targetYear ?? ""),
        String(t?.targetMonth ?? ""),
        String(txHouseholdId(t) || ""),
        user?.email,
        user?.name,
        user?.fullName,
        user?.firstName,
        user?.lastName,
        plan?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();

      return hay.includes(s);
    });
  }, [paidItems, search, status, kind, from, to]);

  // ✅ FIXED REFRESH: must be inside component to access setters + qc + paidQ
  const resetPaidBillsFilters = useCallback(async () => {
    // reset UI state
    setSearchInput("");
    setSearch(""); // clear immediately (debounce will also clear later)
    setKind("ALL");
    setStatus("COMPLETE");
    setFrom("");
    setTo("");

    // refetch after reset
    // 1) ensure cache is considered stale
    qc.invalidateQueries({ queryKey: ["admin_paid_bills_base"] });
    // 2) immediate refetch now (most reliable)
    await paidQ.refetch();
  }, [qc, paidQ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Membership Overview" />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <div className="text-base font-semibold">Bills Paid</div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                disabled={paidQ.isLoading || filteredPaid.length === 0}
                onClick={() =>
                  exportPaidBillsPdf(filteredPaid, {
                    generatedAt: new Date().toLocaleString(),
                    filterText: [
                      status ? `status=${status}` : null,
                      kind !== "ALL" ? `kind=${kind}` : null,
                      from ? `from=${from}` : null,
                      to ? `to=${to}` : null,
                      search ? `search="${search}"` : null,
                    ]
                      .filter(Boolean)
                      .join(", "),
                  })
                }
              >
                Download PDF
              </Button>

              <Button
                variant="secondary"
                disabled={paidQ.isFetching}
                onClick={resetPaidBillsFilters}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label>Search</Label>
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Find your Transaction"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="COMPLETE">COMPLETE (paid)</option>
                <option value="INITIATED">INITIATED</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="CANCELED">CANCELED</option>
                <option value="">ALL</option>
              </Select>
            </div>

            <div>
              <Label>Kind</Label>
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="ALL">ALL</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="ANNUAL">ANNUAL</option>
                <option value="DAILY">DAILY</option>
                <option value="BULKY">BULKY</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>

          {paidQ.isLoading ? (
            <div className="text-sm text-muted">Loading paid bills...</div>
          ) : filteredPaid.length === 0 ? (
            <EmptyState title="No bills found" description="Try clearing search or changing filters." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>User</TH>
                    <TH>Plan</TH>
                    <TH>Kind</TH>
                    <TH>Period</TH>
                    <TH>Amount</TH>
                    <TH>Status</TH>
                    <TH>Provider</TH>
                    <TH>Tx UUID</TH>
                    <TH>Household</TH>
                    <TH>Created</TH>
                  </tr>
                </THead>
                <tbody>
                  {filteredPaid.map((t) => {
                    const user = txUser(t);
                    const plan = txPlan(t);

                    const userName =
                      user?.name ||
                      user?.fullName ||
                      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                      "—";

                    const kindV = normUpper(t?.kind);
                    const period =
                      kindV === "MONTHLY"
                        ? t?.targetYear && t?.targetMonth
                          ? `${t.targetYear}-${String(t.targetMonth).padStart(2, "0")}`
                          : "—"
                        : kindV === "ANNUAL"
                        ? t?.targetYear
                          ? String(t.targetYear)
                          : "—"
                        : "—";

                    return (
                      <TR key={t._id || t.id || t.transactionUuid}>
                        <TD>
                          <div className="font-medium">{userName}</div>
                          <div className="text-xs text-muted">{user?.email || "—"}</div>
                        </TD>

                        <TD>
                          <div className="font-medium">{plan?.name || "—"}</div>
                          <div className="text-xs text-muted">
                            planId: {t?.planId?._id || t?.planId || "—"}
                          </div>
                        </TD>

                        <TD>
                          <Badge variant={kindV === "ANNUAL" ? "warning" : "secondary"}>{kindV}</Badge>
                        </TD>

                        <TD className="text-sm">{period}</TD>

                        <TD>Rs. {formatMoney(Number(t?.amount || 0))}</TD>

                        <TD>
                          <Badge variant={statusVariant(t?.status)}>{normUpper(t?.status)}</Badge>
                        </TD>

                        <TD className="text-sm">{norm(t?.provider) || "—"}</TD>
                        <TD className="text-xs">{norm(t?.transactionUuid) || "—"}</TD>
                        <TD className="text-xs">{txHouseholdId(t) ? String(txHouseholdId(t)) : "—"}</TD>
                        <TD className="text-xs text-muted">{formatDateTime(t?.createdAt)}</TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
