import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../../lib/api";

// OPTIONAL: PDF download (frontend-only). If you don't want PDF, remove these 2 imports + PDF code below.
// npm i jspdf jspdf-autotable
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// -------------------------
// Local UI helpers
// -------------------------
function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "rgb(var(--fg))" }}>{title}</h1>
      {subtitle ? (
        <div style={{ marginTop: 4, opacity: 0.75, color: "rgb(var(--muted))" }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function Message({ type = "info", text }) {
  const border =
    type === "error"
      ? `1px solid rgba(var(--danger), 0.45)`
      : type === "success"
      ? "1px solid rgba(34, 197, 94, 0.35)"
      : "1px solid rgb(var(--border))";

  const bg =
    type === "error"
      ? "rgba(var(--danger), 0.10)"
      : type === "success"
      ? "rgba(34, 197, 94, 0.10)"
      : "rgba(var(--border), 0.20)";

  return (
    <div style={{ border, background: bg, padding: 12, borderRadius: 10, color: "rgb(var(--fg))" }}>
      {text}
    </div>
  );
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Status chip colors:
 * - completed/success/paid: green
 * - pending/processing: amber/yellow
 * - failed/cancelled/rejected: red
 * - else: neutral
 */
function statusChipStyle(statusRaw) {
  const s = normalizeStatus(statusRaw);

  const isCompleted =
    s === "completed" ||
    s === "complete" ||
    s === "success" ||
    s === "succeeded" ||
    s === "paid" ||
    s === "settled";

  const isPending = s === "pending" || s === "processing" || s === "in_progress" || s === "awaiting";
  const isFailed = s === "failed" || s === "cancelled" || s === "canceled" || s === "rejected" || s === "error";

  if (isCompleted) {
    return {
      background: "rgba(34, 197, 94, 0.14)",
      border: "1px solid rgba(34, 197, 94, 0.40)",
      color: "rgb(22, 163, 74)",
    };
  }
  if (isPending) {
    return {
      background: "rgba(245, 158, 11, 0.14)",
      border: "1px solid rgba(245, 158, 11, 0.40)",
      color: "rgb(217, 119, 6)",
    };
  }
  if (isFailed) {
    return {
      background: "rgba(var(--danger), 0.12)",
      border: "1px solid rgba(var(--danger), 0.40)",
      color: "rgb(var(--danger))",
    };
  }

  return {
    background: "rgba(var(--border), 0.18)",
    border: "1px solid rgb(var(--border))",
    color: "rgb(var(--fg))",
    opacity: 0.9,
  };
}

function prettyStatus(value) {
  const raw = String(value ?? "—");
  if (!raw || raw === "—") return "—";
  // keep original if already nice
  if (raw.includes(" ")) return raw;
  // "in_progress" -> "In Progress"
  return raw
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

// -------------------------
// Mongo / populated helpers
// -------------------------
function unwrapOid(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.$oid) return v.$oid;
  return null;
}

function unwrapDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return v;

  if (typeof v === "object" && v.$date != null) {
    const d = v.$date;
    if (typeof d === "string" || typeof d === "number") return d;
    if (typeof d === "object" && d.$numberLong) return Number(d.$numberLong);
  }
  return null;
}

function toJsDate(value) {
  const v = unwrapDate(value);
  if (!v) return null;

  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;

  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function fmtAdDateTime(adValue) {
  const d = toJsDate(adValue);
  return d ? d.toLocaleString() : "—";
}

function moneyNPR(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR" }).format(n);
}

function getUserName(inv) {
  const u = inv?.userId;
  if (u && typeof u === "object") {
    return (
      u.fullName ||
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.email ||
      unwrapOid(u._id) ||
      "—"
    );
  }
  return unwrapOid(inv?.userId) || "—";
}

function getPlanText(inv) {
  const p = inv?.planId;
  if (p && typeof p === "object") {
    return p.name || unwrapOid(p._id) || "—";
  }
  return unwrapOid(inv?.planId) || "—";
}

// -------------------------
// API call
// -------------------------
async function fetchInvoices() {
  const res = await api.get("/citizen/transactions");
  const data = unwrap(res);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === "object") return [data];
  return [];
}

// -------------------------
// Frontend PDF generator (FIXED for populated objects)
// -------------------------
function downloadInvoicePdf(inv) {
  const doc = new jsPDF();

  const invoiceId = inv?.transactionUuid || unwrapOid(inv?._id) || "invoice";
  const createdText = fmtAdDateTime(inv?.createdAt || inv?.updatedAt || inv?.date);

  const userText = getUserName(inv);
  const planText = getPlanText(inv);

  doc.setFontSize(16);
  doc.text("Invoice", 14, 16);

  doc.setFontSize(11);
  doc.text(`Invoice ID: ${invoiceId}`, 14, 26);
  doc.text(`Date (AD): ${createdText}`, 14, 33);
  doc.text(`Provider: ${inv?.provider || "—"}`, 14, 40);
  doc.text(`Status: ${prettyStatus(inv?.status || "—")}`, 14, 47);

  autoTable(doc, {
    startY: 55,
    head: [["Field", "Value"]],
    body: [
      ["Transaction UUID", inv?.transactionUuid || "—"],
      ["User", userText],
      ["Plan", planText],
      ["Amount", `${inv?.amount ?? "—"} ${inv?.currency || "NPR"}`],
      ["Product Code", inv?.productCode || "—"],
      ["Provider Ref ID", inv?.providerRefId || "—"],
      ["Created At", createdText],
    ],
    styles: { fontSize: 10 },
    theme: "grid",
  });

  const endY = doc.lastAutoTable?.finalY || 120;
  doc.setFontSize(9);
  doc.text("System-generated invoice (frontend PDF).", 14, endY + 10);

  doc.save(`invoice-${invoiceId}.pdf`);
}

export default function InvoicesPage() {
  const q = useQuery({
    queryKey: ["citizen", "transactions"],
    queryFn: fetchInvoices,
    staleTime: 30_000,
    retry: (count, err) => {
      const status = err?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });

  const invoices = Array.isArray(q.data) ? q.data : [];

  // Group by AD Year-Month only
  const groups = useMemo(() => {
    const map = new Map();

    for (const inv of invoices) {
      const adVal = inv?.createdAt || inv?.updatedAt || inv?.date || inv?.invoiceDate;
      const d = toJsDate(adVal);

      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "Unknown";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(inv);
    }

    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      if (a[0] === "Unknown") return 1;
      if (b[0] === "Unknown") return -1;
      return b[0].localeCompare(a[0]); // newest month first
    });

    return entries;
  }, [invoices]);

  const errStatus = q.error?.response?.status;
  const errMsg = q.error?.response?.data?.message || q.error?.message || "Failed to load invoices";

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, color: "rgb(var(--fg))" }}>
      <PageHeader title="Invoices" subtitle="Payment transactions (AD dates only)" />

      {q.isLoading && <Message type="info" text="Loading invoices..." />}

      {q.isError && (
        <Message
          type="error"
          text={
            errStatus === 401
              ? "401 Unauthorized. Please log in again as Citizen."
              : errStatus === 403
              ? "403 Forbidden. Your role does not have permission to view invoices."
              : errMsg
          }
        />
      )}

      {!q.isLoading && !q.isError && invoices.length === 0 && <Message type="info" text="No invoices found." />}

      {!q.isLoading && !q.isError && invoices.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map(([ym, items]) => (
            <div
              key={ym}
              style={{
                border: "1px solid rgb(var(--border))",
                borderRadius: 12,
                overflow: "hidden",
                background: "rgb(var(--card))",
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderBottom: "1px solid rgb(var(--border))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(var(--border), 0.18)",
                  color: "rgb(var(--fg))",
                }}
              >
                <div style={{ fontWeight: 800 }}>{ym === "Unknown" ? "Unknown period" : `AD ${ym}`}</div>
                <div style={{ opacity: 0.75, fontSize: 13, color: "rgb(var(--muted))" }}>
                  {items.length} record(s)
                </div>
              </div>

              <div style={{ padding: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "rgb(var(--fg))" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgb(var(--border))" }}>
                      <th style={{ padding: "8px 8px 8px 0" }}>Transaction UUID</th>
                      <th style={{ padding: "8px 8px" }}>User</th>
                      <th style={{ padding: "8px 8px" }}>Plan</th>
                      <th style={{ padding: "8px 8px" }}>Provider</th>
                      <th style={{ padding: "8px 8px" }}>Created (AD)</th>
                      <th style={{ padding: "8px 8px" }}>Amount</th>
                      <th style={{ padding: "8px 8px" }}>Status</th>
                      <th style={{ padding: "8px 8px" }}>PDF</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((inv, idx) => {
                      const rowId = unwrapOid(inv?._id) || inv?.id || `${ym}-${idx}`;

                      const txn = inv?.transactionUuid || unwrapOid(inv?._id) || "—";
                      const provider = inv?.provider || "—";
                      const createdAt = inv?.createdAt || inv?.updatedAt || inv?.date;

                      const amount = inv?.amount ?? inv?.total ?? inv?.grandTotal ?? inv?.dueAmount;
                      const currency = inv?.currency || "NPR";
                      const status = inv?.status ?? inv?.paymentStatus ?? inv?.state ?? "—";

                      const userName = getUserName(inv);
                      const planName = getPlanText(inv);

                      const chip = statusChipStyle(status);

                      return (
                        <tr key={rowId} style={{ borderBottom: "1px solid rgba(var(--border), 0.45)" }}>
                          <td style={{ padding: "10px 8px 10px 0", fontFamily: "monospace" }}>{txn}</td>
                          <td style={{ padding: "10px 8px" }}>{userName}</td>
                          <td style={{ padding: "10px 8px" }}>{planName}</td>
                          <td style={{ padding: "10px 8px" }}>{provider}</td>
                          <td style={{ padding: "10px 8px" }}>{fmtAdDateTime(createdAt)}</td>
                          <td style={{ padding: "10px 8px" }}>
                            {currency === "NPR" ? moneyNPR(amount) : `${amount ?? "—"} ${currency}`}
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                ...chip,
                              }}
                            >
                              {prettyStatus(status)}
                            </span>
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            <button
                              type="button"
                              onClick={() => downloadInvoicePdf(inv)}
                              style={{
                                border: "1px solid rgb(var(--border))",
                                background: "rgb(var(--card))",
                                color: "rgb(var(--fg))",
                                padding: "6px 10px",
                                borderRadius: 10,
                                cursor: "pointer",
                              }}
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12, color: "rgb(var(--muted))" }}>
                  See payment Date Before Payment.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
