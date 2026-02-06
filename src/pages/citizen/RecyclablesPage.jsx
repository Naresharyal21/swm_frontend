import React, { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Table, THead, TH, TR, TD } from "../../components/ui/table";
import { EmptyState } from "../../components/ui/empty";
import { Badge } from "../../components/ui/badge";
import { sdk } from "../../lib/sdk";
import { formatDateTime, formatMoney, pickErrorMessage } from "../../lib/utils";

const STATUSES = ["", "PENDING_VERIFICATION", "VERIFIED", "REJECTED"];

function statusVariant(status) {
  if (status === "VERIFIED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "PENDING_VERIFICATION") return "warning";
  return "default";
}

export default function RecyclablesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState("100");

  const q = useQuery({
    queryKey: ["citizen_recyclables", status, limit],
    queryFn: () =>
      sdk.citizen.listRecyclables({
        status: status || undefined,
        limit: Number(limit || 100),
      }),
  });
  const items = q.data?.items || [];

  const hhQ = useQuery({
    queryKey: ["citizen_households"],
    queryFn: () => sdk.citizen.listMyHouseholds(),
  });
  const households = hhQ.data?.items || [];

  // useEffect(() => {
  // // Auto select if only one
  //   if (!form.householdId && households.length === 1) {
  //     setForm((p) => ({ ...p, householdId: households[0]._id }))
  //   }
  // }, [households, form.householdId])

  const [form, setForm] = useState({
    householdId: "",
    category: "",
    pieces: "",
    avgWeightKg: "",
    estimatedTotalWeightKg: "",
    scheduledDate: "",
  });
  const [files, setFiles] = useState([]);
  const [created, setCreated] = useState(null);

  const computedKg = useMemo(() => {
    const p = Number(form.pieces || 0);
    const avg = Number(form.avgWeightKg || 0);
    if (p > 0 && avg > 0) return p * avg;
    return 0;
  }, [form.pieces, form.avgWeightKg]);

  const create = useMutation({
    mutationFn: () =>
      sdk.citizen.createRecyclableSubmission(
        {
          householdId: form.householdId.trim(),
          category: form.category.trim(),
          pieces: form.pieces === "" ? undefined : Number(form.pieces),
          avgWeightKg:
            form.avgWeightKg === "" ? undefined : Number(form.avgWeightKg),
          estimatedTotalWeightKg:
            form.estimatedTotalWeightKg === ""
              ? undefined
              : Number(form.estimatedTotalWeightKg),
          scheduledDate: form.scheduledDate || undefined,
        },
        files,
      ),
    onSuccess: (res) => {
      setCreated(res?.submission || res);
      toast.success("Recyclable submission created");
      qc.invalidateQueries({ queryKey: ["citizen_recyclables"] });
      qc.invalidateQueries({ queryKey: ["citizen_wallet"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const canSubmit = form.householdId.trim() && form.category.trim();

  function onPickFiles(e) {
    const next = Array.from(e.target.files || []);
    setFiles(next.slice(0, 5));
  }

  function removeFile(name) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recyclables"
        subtitle="Submit recyclable waste for pickup. Crew verifies your submission and credits your wallet automatically."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-[220px]"
            >
              <option value="">All statuses</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-[160px]"
            >
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="200">Last 200</option>
            </Select>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Create submission</div>
          {/* <div className="text-sm text-muted">
            Notes: (1) Household must belong to you. (2) Category must be active in Admin → Reward Rates (e.g., PLASTIC/GLASS/etc). (3) Upload up to 5 photos.
          </div> */}
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Household *</Label>

              <Select
                value={form.householdId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, householdId: e.target.value }))
                }
              >
                <option value="">
                  {hhQ.isLoading
                    ? "Loading households…"
                    : "Select your household"}
                </option>

                {households.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h._id}
                  </option>
                ))}
              </Select>

              {hhQ.isError ? (
                <div className="mt-1 text-xs text-red-600">
                  Failed to load households. Please refresh or contact admin.
                </div>
              ) : null}

              {!hhQ.isLoading && households.length === 0 ? (
                <div className="mt-1 text-xs text-muted">
                  No household linked to your account. Ask admin to assign your
                  household.
                </div>
              ) : null}
            </div>
            <div>
              <Label>Category *</Label>
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
                placeholder="PLASTIC / GLASS / PAPER"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Pieces</Label>
              <Input
                value={form.pieces}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pieces: e.target.value }))
                }
                inputMode="numeric"
                placeholder="10"
              />
            </div>
            <div>
              <Label>Avg weight per piece (kg)</Label>
              <Input
                value={form.avgWeightKg}
                onChange={(e) =>
                  setForm((p) => ({ ...p, avgWeightKg: e.target.value }))
                }
                inputMode="decimal"
                placeholder="0.2"
              />
            </div>
            <div>
              <Label>Estimated total weight (kg)</Label>
              <Input
                value={form.estimatedTotalWeightKg}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    estimatedTotalWeightKg: e.target.value,
                  }))
                }
                inputMode="decimal"
                placeholder={
                  computedKg > 0 ? `Auto: ${computedKg.toFixed(2)}` : "2.0"
                }
              />
              <div className="mt-1 text-xs text-muted">
                If empty, backend estimates using pieces × avg weight when
                provided.
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Scheduled date (optional)</Label>
              <Input
                value={form.scheduledDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, scheduledDate: e.target.value }))
                }
                placeholder="YYYY-MM-DD"
              />
              <div className="mt-1 text-xs text-muted">
                If empty, the backend schedules on the next pickup day based on
                your household schedule.
              </div>
            </div>
            <div>
              <Label>Photos (max 5)</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={onPickFiles}
              />
              {files.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      className="rounded-full border border-app bg-[rgb(var(--card))] px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={() => removeFile(f.name)}
                      title="Remove"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted">
                  Tip: clearer photos help faster verification.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={!canSubmit || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Submitting…" : "Submit recyclables"}
            </Button>
          </div>

          {created ? (
            <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
              <div className="font-semibold">Submission created</div>
              <div className="mt-1 text-xs text-muted">
                ID: {created._id || created.id}
              </div>
              <div className="mt-2 text-sm">
                Status:{" "}
                <span className="font-semibold">
                  {created.status || "PENDING_VERIFICATION"}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading submissions…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No submissions"
          description="Submit recyclable waste for pickup and earn wallet credits after verification."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Category</TH>
              <TH>Status</TH>
              <TH>Estimated weight</TH>
              <TH>Estimated payout</TH>
              <TH>Created</TH>
              <TH>Verification</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((s) => (
              <TR key={s._id || s.id}>
                <TD className="font-medium">{s.category}</TD>
                <TD>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </TD>
                <TD>
                  {Number(s.estimatedTotalWeightKg || 0) > 0 ? (
                    `${formatMoney(s.estimatedTotalWeightKg)} kg`
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </TD>
                <TD>Rs. {formatMoney(s.estimatedPayout)}</TD>
                <TD className="text-xs text-muted">
                  {formatDateTime(s.createdAt)}
                </TD>
                <TD className="text-xs">
                  {s.verification ? (
                    <div className="space-y-1">
                      <div className="text-muted">
                        Verified payout: Rs.{" "}
                        {formatMoney(s.verification.verifiedPayout)}
                      </div>
                      {s.verification.note ? (
                        <div className="text-muted">
                          Note: {s.verification.note}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted">Pending</span>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

// import React, { useMemo, useState, useEffect } from 'react'
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// import toast from 'react-hot-toast'

// import { PageHeader } from '../../components/layout/PageHeader'
// import { Card, CardContent, CardHeader } from '../../components/ui/card'
// import { Button } from '../../components/ui/button'
// import { Input, Label } from '../../components/ui/input'
// import { Select } from '../../components/ui/select'
// import { Table, THead, TH, TR, TD } from '../../components/ui/table'
// import { EmptyState } from '../../components/ui/empty'
// import { Badge } from '../../components/ui/badge'
// import { sdk } from '../../lib/sdk'
// import { formatDateTime, formatMoney, pickErrorMessage } from '../../lib/utils'

// const STATUSES = ['', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED']

// function statusVariant(status) {
//   if (status === 'VERIFIED') return 'success'
//   if (status === 'REJECTED') return 'danger'
//   if (status === 'PENDING_VERIFICATION') return 'warning'
//   return 'default'
// }

// export default function RecyclablesPage() {
//   const qc = useQueryClient()
//   const [status, setStatus] = useState('')
//   const [limit, setLimit] = useState('100')

//   const q = useQuery({
//     queryKey: ['citizen_recyclables', status, limit],
//     queryFn: () => sdk.citizen.listRecyclables({ status: status || undefined, limit: Number(limit || 100) })
//   })
//   const items = q.data?.items || []

//   const hhQ = useQuery({
//     queryKey: ['citizen_households'],
//     queryFn: () => sdk.citizen.listMyHouseholds()
//   })
//   const households = hhQ.data?.items || []

//   useEffect(() => {
//   // Auto select if only one
//     if (!form.householdId && households.length === 1) {
//       setForm((p) => ({ ...p, householdId: households[0]._id }))
//     }
//   }, [households, form.householdId])

//   const [form, setForm] = useState({
//     householdId: '',
//     category: '',
//     pieces: '',
//     avgWeightKg: '',
//     estimatedTotalWeightKg: '',
//     scheduledDate: ''
//   })
//   const [files, setFiles] = useState([])
//   const [created, setCreated] = useState(null)

//   const computedKg = useMemo(() => {
//     const p = Number(form.pieces || 0)
//     const avg = Number(form.avgWeightKg || 0)
//     if (p > 0 && avg > 0) return p * avg
//     return 0
//   }, [form.pieces, form.avgWeightKg])

//   const create = useMutation({
//     mutationFn: () =>
//       sdk.citizen.createRecyclableSubmission(
//         {
//           householdId: form.householdId.trim(),
//           category: form.category.trim(),
//           pieces: form.pieces === '' ? undefined : Number(form.pieces),
//           avgWeightKg: form.avgWeightKg === '' ? undefined : Number(form.avgWeightKg),
//           estimatedTotalWeightKg: form.estimatedTotalWeightKg === '' ? undefined : Number(form.estimatedTotalWeightKg),
//           scheduledDate: form.scheduledDate || undefined
//         },
//         files
//       ),
//     onSuccess: (res) => {
//       setCreated(res?.submission || res)
//       toast.success('Recyclable submission created')
//       qc.invalidateQueries({ queryKey: ['citizen_recyclables'] })
//       qc.invalidateQueries({ queryKey: ['citizen_wallet'] })
//     },
//     onError: (e) => toast.error(pickErrorMessage(e))
//   })

//   const canSubmit = form.householdId.trim() && form.category.trim()

//   function onPickFiles(e) {
//     const next = Array.from(e.target.files || [])
//     setFiles(next.slice(0, 5))
//   }

//   function removeFile(name) {
//     setFiles((prev) => prev.filter((f) => f.name !== name))
//   }

//   return (
//     <div className="space-y-6">
//       <PageHeader
//         title="Recyclables"
//         subtitle="Submit recyclable waste for pickup. Crew verifies your submission and credits your wallet automatically."
//         right={
//           <div className="flex flex-wrap items-center gap-2">
//             <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[220px]">
//               <option value="">All statuses</option>
//               {STATUSES.filter(Boolean).map((s) => (
//                 <option key={s} value={s}>
//                   {s}
//                 </option>
//               ))}
//             </Select>
//             <Select value={limit} onChange={(e) => setLimit(e.target.value)} className="w-[160px]">
//               <option value="50">Last 50</option>
//               <option value="100">Last 100</option>
//               <option value="200">Last 200</option>
//             </Select>
//           </div>
//         }
//       />

//       <Card>
//         <CardHeader>
//           <div className="text-base font-semibold">Create submission</div>
//           <div className="text-sm text-muted">
//             Notes: (1) Household must belong to you. (2) Category must be active in Admin → Reward Rates (e.g., PLASTIC/GLASS/etc). (3) Upload up to 5 photos.
//           </div>
//         </CardHeader>
//         <CardContent className="grid gap-4">
//           <div className="grid gap-4 sm:grid-cols-2">
//             <div>
//               <Label>Household ID *</Label>
//               <Input value={form.householdId} onChange={(e) => setForm((p) => ({ ...p, householdId: e.target.value }))} placeholder="Mongo ObjectId" />
//             </div>

//             {/* <div>
//               <Label>Household *</Label>

//               <Select
//                 value={form.householdId}
//                 onChange={(e) => setForm((p) => ({ ...p, householdId: e.target.value }))}
//               >
//                 <option value="">
//                   {hhQ.isLoading ? 'Loading households…' : 'Select your household'}
//                 </option>

//                 {households.map((h) => (
//                   <option key={h._id} value={h._id}>
//                     {h.address ? `${h.address} (${h._id})` : h._id}
//                   </option>
//                 ))}
//               </Select>

//               {hhQ.isError ? (
//                 <div className="mt-1 text-xs text-red-600">
//                   Failed to load households. Please refresh or contact admin.
//                 </div>
//               ) : null}

//               {!hhQ.isLoading && households.length === 0 ? (
//                 <div className="mt-1 text-xs text-muted">
//                   No household linked to your account. Ask admin to assign your household.
//                 </div>
//               ) : null}
//             </div> */}

//             <div>
//               <Label>Category *</Label>
//               <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="PLASTIC / GLASS / PAPER" />
//             </div>
//           </div>

//           <div className="grid gap-4 sm:grid-cols-3">
//             <div>
//               <Label>Pieces</Label>
//               <Input value={form.pieces} onChange={(e) => setForm((p) => ({ ...p, pieces: e.target.value }))} inputMode="numeric" placeholder="10" />
//             </div>
//             <div>
//               <Label>Avg weight per piece (kg)</Label>
//               <Input value={form.avgWeightKg} onChange={(e) => setForm((p) => ({ ...p, avgWeightKg: e.target.value }))} inputMode="decimal" placeholder="0.2" />
//             </div>
//             <div>
//               <Label>Estimated total weight (kg)</Label>
//               <Input
//                 value={form.estimatedTotalWeightKg}
//                 onChange={(e) => setForm((p) => ({ ...p, estimatedTotalWeightKg: e.target.value }))}
//                 inputMode="decimal"
//                 placeholder={computedKg > 0 ? `Auto: ${computedKg.toFixed(2)}` : '2.0'}
//               />
//               <div className="mt-1 text-xs text-muted">If empty, backend estimates using pieces × avg weight when provided.</div>
//             </div>
//           </div>

//           <div className="grid gap-4 sm:grid-cols-2">
//             <div>
//               <Label>Scheduled date (optional)</Label>
//               <Input value={form.scheduledDate} onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))} placeholder="YYYY-MM-DD" />
//               <div className="mt-1 text-xs text-muted">If empty, the backend schedules on the next pickup day based on your household schedule.</div>
//             </div>
//             <div>
//               <Label>Photos (max 5)</Label>
//               <Input type="file" multiple accept="image/*" onChange={onPickFiles} />
//               {files.length ? (
//                 <div className="mt-2 flex flex-wrap gap-2">
//                   {files.map((f) => (
//                     <button
//                       key={f.name}
//                       type="button"
//                       className="rounded-full border border-app bg-[rgb(var(--card))] px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
//                       onClick={() => removeFile(f.name)}
//                       title="Remove"
//                     >
//                       {f.name}
//                     </button>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="mt-1 text-xs text-muted">Tip: clearer photos help faster verification.</div>
//               )}
//             </div>
//           </div>

//           <div className="flex justify-end">
//             <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
//               {create.isPending ? 'Submitting…' : 'Submit recyclables'}
//             </Button>
//           </div>

//           {created ? (
//             <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
//               <div className="font-semibold">Submission created</div>
//               <div className="mt-1 text-xs text-muted">ID: {created._id || created.id}</div>
//               <div className="mt-2 text-sm">
//                 Status: <span className="font-semibold">{created.status || 'PENDING_VERIFICATION'}</span>
//               </div>
//             </div>
//           ) : null}
//         </CardContent>
//       </Card>

//       {q.isLoading ? (
//         <div className="text-sm text-muted">Loading submissions…</div>
//       ) : items.length === 0 ? (
//         <EmptyState title="No submissions" description="Submit recyclable waste for pickup and earn wallet credits after verification." />
//       ) : (
//         <Table>
//           <THead>
//             <tr>
//               <TH>Category</TH>
//               <TH>Status</TH>
//               <TH>Estimated weight</TH>
//               <TH>Estimated payout</TH>
//               <TH>Created</TH>
//               <TH>Verification</TH>
//             </tr>
//           </THead>
//           <tbody>
//             {items.map((s) => (
//               <TR key={s._id || s.id}>
//                 <TD className="font-medium">{s.category}</TD>
//                 <TD>
//                   <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
//                 </TD>
//                 <TD>
//                   {Number(s.estimatedTotalWeightKg || 0) > 0 ? `${formatMoney(s.estimatedTotalWeightKg)} kg` : <span className="text-muted">—</span>}
//                 </TD>
//                 <TD>Rs. {formatMoney(s.estimatedPayout)}</TD>
//                 <TD className="text-xs text-muted">{formatDateTime(s.createdAt)}</TD>
//                 <TD className="text-xs">
//                   {s.verification ? (
//                     <div className="space-y-1">
//                       <div className="text-muted">Verified payout: Rs. {formatMoney(s.verification.verifiedPayout)}</div>
//                       {s.verification.note ? <div className="text-muted">Note: {s.verification.note}</div> : null}
//                     </div>
//                   ) : (
//                     <span className="text-muted">Pending</span>
//                   )}
//                 </TD>
//               </TR>
//             ))}
//           </tbody>
//         </Table>
//       )}
//     </div>
//   )
// }
