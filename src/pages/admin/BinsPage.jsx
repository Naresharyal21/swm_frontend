// src/pages/admin/BinsPage.jsx
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Modal } from "../../components/ui/modal";
import { Table, THead, TH, TR, TD } from "../../components/ui/table";
import { EmptyState } from "../../components/ui/empty";
import { Badge } from "../../components/ui/badge";

import { sdk } from "../../lib/sdk";
import { formatDateTime, pickErrorMessage } from "../../lib/utils";

export default function BinsPage() {
  const qc = useQueryClient();

  const householdsQ = useQuery({ queryKey: ["admin_households_all"], queryFn: () => sdk.admin.listHouseholds({}) });
  const vbsQ = useQuery({ queryKey: ["admin_virtual_bins"], queryFn: () => sdk.admin.listVirtualBins({}) });

  const households = householdsQ.data?.items || [];
  const vbs = vbsQ.data?.items || [];

  const [filters, setFilters] = useState({ householdId: "", virtualBinId: "" });

  const q = useQuery({
    queryKey: ["admin_bins", filters.householdId, filters.virtualBinId],
    queryFn: () =>
      sdk.admin.listBins({
        ...(filters.householdId ? { householdId: filters.householdId } : {}),
        ...(filters.virtualBinId ? { virtualBinId: filters.virtualBinId } : {}),
      }),
  });

  const items = q.data?.items || [];

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    binId: "",
    householdId: "",
    virtualBinId: "",
    status: "",
    lng: "",
    lat: "",
  });

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function buildLocation() {
    const lng = Number(form.lng);
    const lat = Number(form.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { type: "Point", coordinates: [lng, lat] };
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.binId.trim()) throw new Error("binId is required");
      if (!form.householdId) throw new Error("householdId is required");

      const payload = {
        binId: form.binId.trim(),
        householdId: form.householdId,
        virtualBinId: form.virtualBinId?.trim() ? form.virtualBinId.trim() : null,
        status: form.status?.trim() || undefined,
      };

      if (String(form.lng).trim() !== "" || String(form.lat).trim() !== "") {
        const loc = buildLocation();
        if (!loc) throw new Error("Valid lng/lat required to set location");
        payload.location = loc;
      }

      return sdk.admin.createBin(payload);
    },
    onSuccess: () => {
      toast.success("Bin created");
      setOpen(false);
      setForm({ binId: "", householdId: "", virtualBinId: "", status: "", lng: "", lat: "" });
      qc.invalidateQueries({ queryKey: ["admin_bins"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: async () => {
      const id = editing?._id || editing?.id;
      if (!id) throw new Error("Missing bin id");

      const patch = {};
      if (form.binId.trim()) patch.binId = form.binId.trim();
      if (form.householdId) patch.householdId = form.householdId;
      if (form.virtualBinId !== "") patch.virtualBinId = form.virtualBinId?.trim() ? form.virtualBinId.trim() : null;
      if (form.status !== "") patch.status = form.status?.trim() || "";

      if (String(form.lng).trim() !== "" || String(form.lat).trim() !== "") {
        const loc = buildLocation();
        if (!loc) throw new Error("Valid lng/lat required to update location");
        patch.location = loc;
      }

      if (Object.keys(patch).length === 0) throw new Error("Nothing to update");
      return sdk.admin.updateBin(id, patch);
    },
    onSuccess: () => {
      toast.success("Bin updated");
      setEditOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin_bins"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async (b) => {
      const id = b?._id || b?.id;
      if (!id) throw new Error("Missing bin id");
      return sdk.admin.deleteBin(id);
    },
    onSuccess: () => {
      toast.success("Bin deleted");
      qc.invalidateQueries({ queryKey: ["admin_bins"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  function openEdit(b) {
    setEditing(b);
    const coords = b?.location?.coordinates || [];
    setForm({
      binId: b?.binId || "",
      householdId: b?.householdId || "",
      virtualBinId: b?.virtualBinId || "",
      status: b?.status || "",
      lng: coords?.[0] ?? "",
      lat: coords?.[1] ?? "",
    });
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* <PageHeader
        title="Bins"
        subtitle="Manage bins and virtual-bin membership."
        right={<Button onClick={() => setOpen(true)}>Create bin</Button>}
      /> */}

      <Card>
        <CardContent className="py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Filter by household</Label>
              <Select value={filters.householdId} onChange={(e) => setFilters((p) => ({ ...p, householdId: e.target.value }))}>
                <option value="">All</option>
                {households.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.address || h._id}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Filter by virtual bin</Label>
              <Select value={filters.virtualBinId} onChange={(e) => setFilters((p) => ({ ...p, virtualBinId: e.target.value }))}>
                <option value="">All</option>
                {vbs.map((vb) => (
                  <option key={vb._id} value={vb._id}>
                    {vb.name || vb._id}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => q.refetch()}>
                Refresh
              </Button>
              <Button variant="ghost" onClick={() => setFilters({ householdId: "", virtualBinId: "" })}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading bins...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No bins" description="Create bins and attach them to households." action={<Button onClick={() => setOpen(true)}>Create bin</Button>} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Bin</TH>
              <TH>Household</TH>
              <TH>Virtual Bin</TH>
              <TH>Status</TH>
              <TH>Location</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((b) => {
              const coords = b?.location?.coordinates || [];
              const hh = households.find((h) => h._id === b.householdId);
              const vb = vbs.find((x) => x._id === b.virtualBinId);
              return (
                <TR key={b._id || b.id}>
                  <TD className="font-medium">{b.binId}</TD>
                  <TD className="text-sm">{hh?.address || b.householdId || <span className="text-muted">—</span>}</TD>
                  <TD className="text-sm">{vb?.name || (b.virtualBinId ? b.virtualBinId : <span className="text-muted">—</span>)}</TD>
                  <TD>
                    <Badge variant={b.status ? "success" : "warning"}>{b.status || "—"}</Badge>
                  </TD>
                  <TD className="text-xs text-muted">{coords?.length === 2 ? `${coords[0]}, ${coords[1]}` : "—"}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(b.createdAt)}</TD>
                  <TD className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <Button variant="outline" onClick={() => openEdit(b)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        disabled={del.isPending}
                        onClick={() => {
                          if (confirm(`Delete bin "${b.binId}"?`)) del.mutate(b);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* ✅ MOVED HERE FROM ZONES */}
      <BinIdSection />

      <Modal
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
        title="Edit bin"
        description="Update bin fields."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={update.isPending} onClick={() => update.mutate()}>
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        }
      >
        <BinForm form={form} set={set} households={households} vbs={vbs} />
      </Modal>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create bin"
        description="Attach a bin to a household (virtual bin optional)."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        }
      >
        <BinForm form={form} set={set} households={households} vbs={vbs} />
      </Modal>
    </div>
  );
}

function BinForm({ form, set, households, vbs }) {
  return (
    <div className="grid gap-4">
      <div>
        <Label>Bin ID *</Label>
        <Input value={form.binId} onChange={(e) => set("binId", e.target.value)} placeholder="e.g., BIN-001" />
      </div>

      <div>
        <Label>Household *</Label>
        <Select value={form.householdId} onChange={(e) => set("householdId", e.target.value)}>
          <option value="">Select household</option>
          {households.map((h) => (
            <option key={h._id} value={h._id}>
              {h.address || h._id}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Virtual bin (optional)</Label>
        <Select value={form.virtualBinId} onChange={(e) => set("virtualBinId", e.target.value)}>
          <option value="">None</option>
          {vbs.map((vb) => (
            <option key={vb._id} value={vb._id}>
              {vb.name || vb._id}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Status (optional)</Label>
        <Input value={form.status} onChange={(e) => set("status", e.target.value)} placeholder="e.g., ACTIVE" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Longitude (lng)</Label>
          <Input value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="85.3240" />
        </div>
        <div>
          <Label>Latitude (lat)</Label>
          <Input value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="27.7172" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
  ✅ MOVED FROM ZonesPage.jsx
  BinId Section (Generator + optional list)
------------------------------------------------------- */
function BinIdSection() {
  const qc = useQueryClient();

  const [showList, setShowList] = useState(false);

  const [prefix, setPrefix] = useState("BIN-");
  const [pad, setPad] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [delStart, setDelStart] = useState("");
  const [delEnd, setDelEnd] = useState("");

  const [q, setQ] = useState("");
  const [assigned, setAssigned] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  const listQuery = useQuery({
    queryKey: ["admin_binids", { q, assigned, page, limit }],
    queryFn: () =>
      sdk.admin.listBinIds({
        q: q || undefined,
        assigned: assigned || undefined,
        page,
        limit,
      }),
    enabled: showList,
    keepPreviousData: true,
  });

  const items = listQuery.data?.data?.items || listQuery.data?.items || [];
  const total = listQuery.data?.data?.total ?? listQuery.data?.total ?? items.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const generateMut = useMutation({
    mutationFn: (payload) => sdk.admin.generateBinIdRange(payload),
    onSuccess: (res) => {
      const created = res?.data?.created ?? res?.created ?? 0;
      const skipped = res?.data?.skipped ?? res?.skipped ?? 0;
      toast.success(`BinIds generated: ${created} (skipped: ${skipped})`);
      if (showList) qc.invalidateQueries({ queryKey: ["admin_binids"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const deleteOneMut = useMutation({
    mutationFn: (id) => sdk.admin.deleteBinId(id),
    onSuccess: () => {
      toast.success("BinId deleted");
      if (showList) qc.invalidateQueries({ queryKey: ["admin_binids"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const deleteRangeMut = useMutation({
    mutationFn: (payload) => sdk.admin.deleteBinIdRange(payload),
    onSuccess: (res) => {
      const deleted = res?.data?.deleted ?? res?.deleted ?? 0;
      toast.success(`Deleted: ${deleted}`);
      if (showList) qc.invalidateQueries({ queryKey: ["admin_binids"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  function toInt(v) {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : NaN;
  }

  function onGenerate(e) {
    e.preventDefault();
    const s = toInt(start);
    const en = toInt(end);
    const pd = toInt(pad);
    const px = String(prefix || "BIN-").trim() || "BIN-";

    if (!Number.isInteger(s) || !Number.isInteger(en) || s <= 0 || en <= 0 || s > en) {
      toast.error("Invalid start/end range");
      return;
    }
    if (!Number.isInteger(pd) || pd < 1 || pd > 4) {
      toast.error("length must be 1–4");
      return;
    }

    generateMut.mutate({ start: s, end: en, pad: pd, prefix: px });
  }

  function onDeleteRange(e) {
    e.preventDefault();
    const s = toInt(delStart);
    const en = toInt(delEnd);
    const pd = toInt(pad);
    const px = String(prefix || "BIN-").trim() || "BIN-";

    if (!Number.isInteger(s) || !Number.isInteger(en) || s <= 0 || en <= 0 || s > en) {
      toast.error("Invalid delete range");
      return;
    }

    const ok = confirm(`Delete BinIds from ${px}${String(s).padStart(pd, "0")} to ${px}${String(en).padStart(pd, "0")}?`);
    if (!ok) return;

    deleteRangeMut.mutate({ start: s, end: en, pad: pd, prefix: px });
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Bin ID Generator</div>
              <div className="text-xs text-muted mt-1">Generate BIN IDs by range, delete single or delete by range. Listing is optional.</div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowList((v) => {
                    const next = !v;
                    if (!v) setPage(1);
                    return next;
                  });
                }}
              >
                {showList ? "Hide Bin IDs" : "Show Bin IDs"}
              </Button>

              <Button
                variant="outline"
                onClick={() => listQuery.refetch()}
                disabled={!showList || listQuery.isFetching}
                title={!showList ? "Show Bin IDs first" : ""}
              >
                {listQuery.isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          <form onSubmit={onGenerate} className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label>Prefix</Label>
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="BIN-" />
              </div>
              <div>
                <Label>Length</Label>
                <Input value={pad} onChange={(e) => setPad(e.target.value)} placeholder="4" />
              </div>
              <div>
                <Label>Start</Label>
                <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="1" />
              </div>
              <div>
                <Label>End</Label>
                <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="10" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={generateMut.isPending} type="submit">
                {generateMut.isPending ? "Generating..." : "Generate Range"}
              </Button>
            </div>
          </form>

          <form onSubmit={onDeleteRange} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Delete Start</Label>
                <Input value={delStart} onChange={(e) => setDelStart(e.target.value)} placeholder="1" />
              </div>
              <div>
                <Label>Delete End</Label>
                <Input value={delEnd} onChange={(e) => setDelEnd(e.target.value)} placeholder="10" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="danger" disabled={deleteRangeMut.isPending} type="submit">
                {deleteRangeMut.isPending ? "Deleting..." : "Delete Range"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showList ? (
        <Card>
          <CardContent className="py-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>Search BinId</Label>
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="BIN-0001"
                />
              </div>
              <div>
                <Label>Assigned</Label>
                <select
                  className="w-full h-10 rounded-md border border-border bg-transparent px-3 text-sm"
                  value={assigned}
                  onChange={(e) => {
                    setAssigned(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="false">Unassigned</option>
                  <option value="true">Assigned</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              {listQuery.isLoading ? (
                <div className="text-sm text-muted">Loading Bin IDs...</div>
              ) : items.length === 0 ? (
                <EmptyState title="No Bin IDs" description="Generate a range to create BIN IDs." action={<Button onClick={() => listQuery.refetch()}>Refresh</Button>} />
              ) : (
                <>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Code</TH>
                        <TH>Status</TH>
                        <TH>Created</TH>
                        <TH className="text-right">Actions</TH>
                      </tr>
                    </THead>
                    <tbody>
                      {items.map((b) => (
                        <TR key={b._id || b.id}>
                          <TD className="font-medium">{b.code || b.binCode || b.value}</TD>
                          <TD className="text-xs text-muted">{b.isAssigned ? "Assigned" : "Unassigned"}</TD>
                          <TD className="text-xs text-muted">{formatDateTime(b.createdAt)}</TD>
                          <TD className="text-right">
                            <Button
                              variant="danger"
                              onClick={() => {
                                const code = b.code || "this BinId";
                                if (confirm(`Delete ${code}?`)) deleteOneMut.mutate(b._id || b.id);
                              }}
                              disabled={deleteOneMut.isPending}
                            >
                              Delete
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="text-xs text-muted">
                      Total: <span className="font-semibold">{total}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                        Prev
                      </Button>
                      <div className="text-xs text-muted">
                        Page <span className="font-semibold">{page}</span> / {totalPages}
                      </div>
                      <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
