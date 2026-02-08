// src/pages/citizen/InvoicesPage.jsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "../../lib/api";

// OPTIONAL: PDF download (frontend-only).
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// -------------------------
// UI helpers
// -------------------------
function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "rgb(var(--fg))" }}>{title}</h1>
      {subtitle ? <div style={{ marginTop: 4, opacity: 0.75, color: "rgb(var(--muted))" }}>{subtitle}</div> : null}
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

// -------------------------
// Utils
// -------------------------
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}
function isComplete(tx) {
  return normalizeStatus(tx?.status) === "COMPLETE";
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

function keyYM(year, month1to12) {
  return `${year}-${String(month1to12).padStart(2, "0")}`;
}

function expandCoverMonths(coverFrom, coverTo) {
  const from = toJsDate(coverFrom);
  const to = toJsDate(coverTo);
  if (!from || !to) return [];

  const out = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cur.getTime() < end.getTime()) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function toNpr(amount) {
  const n = Number(amount || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

function toLocaleAmount(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

// -------------------------
// API
// -------------------------
async function fetchTransactions() {
  const res = await api.get("/citizen/transactions");
  const data = unwrap(res);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === "object") return [data];
  return [];
}

// -------------------------
// PDF helpers
// -------------------------
function addPdfCopyright(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setTextColor(120);

    const left = 14;
    const right = pageW - 14;

    doc.text("© SmartWasteManagement", left, pageH - 8);
    doc.text(`Page ${p} / ${pageCount}`, right, pageH - 8, { align: "right" });

    doc.setTextColor(0);
  }
}

// -------------------------
// PDF: Month Status (12 months)
// -------------------------
function downloadCalendarPdf({ year, paidMap, currentYear, currentMonth }) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Invoices Status - ${year}`, 14, 16);

  const rows = MONTHS.map((m, idx) => {
    const month = idx + 1;
    const k = keyYM(year, month);
    const paid = !!paidMap.get(k);
    const isCurrent = year === currentYear && month === currentMonth;

    return [
      String(month),
      m,
      paid ? "PAID" : "UNPAID",
      isCurrent ? "CURRENT" : "",
    ];
  });

  autoTable(doc, {
    startY: 24,
    head: [["Month#", "Month", "Status", ""]],
    body: rows,
    styles: { fontSize: 10 },
    theme: "grid",
    columnStyles: {
      3: { cellWidth: 26, halign: "center", fontStyle: "bold" },
    },
  });

  const endY = doc.lastAutoTable?.finalY || 120;
  doc.setFontSize(9);
  doc.text("Status is computed from COMPLETE MONTHLY/ANNUAL transactions only.", 14, endY + 10);

  addPdfCopyright(doc);
  doc.save(`invoice-status-${year}.pdf`);
}

// -------------------------
// PDF: Daily/Bulky list
// -------------------------
function downloadDailyBulkyPdf({ year, items }) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Daily/Bulky Payments (AD) - ${year}`, 14, 16);

  const rows = (items || []).map((t, idx) => [
    String(idx + 1),
    fmtAdDateTime(t?.createdAt || t?.updatedAt || t?.date),
    String(t?.kind || "").toUpperCase(),
    `Rs. ${toNpr(t?.amount)}`,
    t?.transactionUuid || t?.txUuid || "—",
    t?.providerRefId || t?.providerReference || "—",
  ]);

  autoTable(doc, {
    startY: 24,
    head: [["SN", "Date/Time", "Kind", "Amount", "Tx UUID", "Ref ID"]],
    body: rows.length ? rows : [["—", "—", "—", "—", "—", "—"]],
    styles: { fontSize: 9 },
    theme: "grid",
  });

  const endY = doc.lastAutoTable?.finalY || 120;
  doc.setFontSize(9);
  doc.text("List includes only status=COMPLETE and kind=DAILY/BULKY.", 14, endY + 10);

  addPdfCopyright(doc);
  doc.save(`daily-bulky-payments-${year}.pdf`);
}

// -------------------------
// Component
// -------------------------
export default function InvoicesPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [year, setYear] = useState(currentYear);

  const q = useQuery({
    queryKey: ["citizen", "transactions"],
    queryFn: fetchTransactions,
    staleTime: 30_000,
    retry: (count, err) => {
      const status = err?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });

  const txs = Array.isArray(q.data) ? q.data : [];

  // paidMap: "YYYY-MM" -> true (MONTHLY/ANNUAL complete)
  const paidMap = useMemo(() => {
    const map = new Map();

    for (const t of txs) {
      if (!isComplete(t)) continue;

      const kind = String(t?.kind || "").toUpperCase();
      if (kind !== "MONTHLY" && kind !== "ANNUAL") continue;

      const cov = expandCoverMonths(t?.coverFrom, t?.coverTo);
      if (cov.length) {
        for (const k of cov) if (k.startsWith(`${year}-`)) map.set(k, true);
        continue;
      }

      if (Number.isFinite(t?.targetYear) && Number.isFinite(t?.targetMonth)) {
        const k = keyYM(Number(t.targetYear), Number(t.targetMonth));
        if (k.startsWith(`${year}-`)) map.set(k, true);
        continue;
      }

      const d = toJsDate(t?.createdAt || t?.updatedAt || t?.date);
      if (d && d.getFullYear() === year) map.set(keyYM(d.getFullYear(), d.getMonth() + 1), true);
    }

    return map;
  }, [txs, year]);

  const dailyBulky = useMemo(() => {
    const out = [];

    for (const t of txs) {
      if (!isComplete(t)) continue;

      const kind = String(t?.kind || "").toUpperCase();
      if (kind !== "DAILY" && kind !== "BULKY") continue;

      const d = toJsDate(t?.createdAt || t?.updatedAt || t?.date);
      if (!d) continue;
      if (d.getFullYear() !== year) continue;

      out.push(t);
    }

    out.sort((a, b) => {
      const da = toJsDate(a?.createdAt || a?.updatedAt || a?.date)?.getTime() || 0;
      const db = toJsDate(b?.createdAt || b?.updatedAt || b?.date)?.getTime() || 0;
      return db - da;
    });

    return out;
  }, [txs, year]);

  const errStatus = q.error?.response?.status;
  const errMsg = q.error?.response?.data?.message || q.error?.message || "Failed to load invoices";

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, color: "rgb(var(--fg))" }}>
      <PageHeader
        title="Invoices"
       
      />

      {q.isLoading && <Message type="info" text="Loading..." />}

      {q.isError && (
        <Message
          type="error"
          text={
            errStatus === 401
              ? "401 Unauthorized. Please log in again."
              : errStatus === 403
              ? "403 Forbidden."
              : errMsg
          }
        />
      )}

      {!q.isLoading && !q.isError && (
        <>
          {/* ---------------- 12 months status grid ---------------- */}
          <div
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
                background: "rgba(var(--border), 0.18)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 600 }}>Month Status (AD)</div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={String(year)}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={{
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--card))",
                    color: "rgb(var(--fg))",
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontSize: 13,
                  }}
                >
                  {Array.from({ length: 7 }).map((_, i) => {
                    const y = currentYear - 3 + i;
                    return (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => downloadCalendarPdf({ year, paidMap, currentYear, currentMonth })}
                  style={{
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--card))",
                    color: "rgb(var(--fg))",
                    padding: "6px 10px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Download PDF
                </button>
              </div>
            </div>

            <div style={{ padding: 12 }}>
              <div
                className="month12-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {MONTHS.map((m, idx) => {
                  const month = idx + 1;
                  const k = keyYM(year, month);
                  const paid = !!paidMap.get(k);

                  const isCurrent = year === currentYear && month === currentMonth;

                  // paid green / unpaid red
                  const textColor = paid ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)";
                  const borderColor = paid ? "rgba(34,197,94,0.70)" : "rgba(239,68,68,0.70)";
                  const bg = paid ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.08)";

                  return (
                    <div
                      key={k}
                      style={{
                        border: `2px solid ${borderColor}`, // ✅ normal paid/unpaid border
                        borderRadius: 12,
                        padding: "10px 8px",
                        background: bg,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        minHeight: 84,
                      }}
                      title={`${m} ${year} - ${paid ? "PAID" : "UNPAID"}${isCurrent ? " (CURRENT)" : ""}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.1, color: textColor }}>
                          {m.slice(0, 3).toUpperCase()}
                        </div>

                        {/* ✅ CURRENT indicator: green text only (NO BORDER) */}
                        {isCurrent ? (
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 900,
                              color: "rgb(22, 163, 74)", // ✅ green
                              whiteSpace: "nowrap",
                            }}
                          >
                            Active Month 
                          </div>
                        ) : null}
                      </div>

                      {/* Status: colored text */}
                      <div
                        style={{
                          marginTop: "auto",
                          fontSize: 11,
                          fontWeight: 900,
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: `1px solid ${borderColor}`,
                          background: "rgba(0,0,0,0.02)",
                          color: textColor, // ✅ green/red
                          textAlign: "center",
                          letterSpacing: 0.2,
                        }}
                      >
                        {paid ? "PAID" : "UNPAID"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <style>{`
                @media (max-width: 520px) {
                  .month12-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
                }
                @media (min-width: 521px) and (max-width: 900px) {
                  .month12-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
                }
                @media (min-width: 901px) {
                  .month12-grid { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
                }
              `}</style>

             
            </div>
          </div>

          {/* ---------------- Daily/Bulky payments ---------------- */}
          <div
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
                background: "rgba(var(--border), 0.18)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 600 }}>Daily / Bulk Payments</div>

              <button
                type="button"
                onClick={() => downloadDailyBulkyPdf({ year, items: dailyBulky })}
                style={{
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--card))",
                  color: "rgb(var(--fg))",
                  padding: "6px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                }}
                disabled={!dailyBulky.length}
                title={!dailyBulky.length ? "No COMPLETE daily/bulky payments" : ""}
              >
                Download Invoice as PDF
              </button>
            </div>

            <div style={{ padding: 12 }}>
              {dailyBulky.length === 0 ? (
                <Message type="info" text="No COMPLETE daily/bulky payments for this year." />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        {["SN", "Date/Time", "Kind", "Amount", "Tx UUID", "Ref ID"].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: "10px 8px",
                              borderBottom: "1px solid rgb(var(--border))",
                              color: "rgb(var(--muted))",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyBulky.map((t, idx) => (
                        <tr key={t?._id || t?.transactionUuid || idx}>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(var(--border),0.5)" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(var(--border),0.5)" }}>
                            {fmtAdDateTime(t?.createdAt || t?.updatedAt || t?.date)}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(var(--border),0.5)", fontWeight: 600 }}>
                            {String(t?.kind || "").toUpperCase()}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(var(--border),0.5)" }}>
                            Rs. {toLocaleAmount(t?.amount)}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(var(--border),0.5)" }}>
                            {t?.transactionUuid || t?.txUuid || "—"}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(var(--border),0.5)" }}>
                            {t?.providerRefId || t?.providerReference || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
