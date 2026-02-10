// src/pages/admin/ZonesPage.jsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Modal } from "../../components/ui/modal";
import { Table, THead, TH, TR, TD } from "../../components/ui/table";
import { EmptyState } from "../../components/ui/empty";
import { sdk } from "../../lib/sdk";
import { formatDateTime, pickErrorMessage } from "../../lib/utils";

function toPayload(form) {
  return {
    name: form.name.trim(),
    wardCode: form.wardCode || "",
    centroid: { type: "Point", coordinates: [Number(form.lng || 0), Number(form.lat || 0)] },
    polygon: form.polygon || null,
  };
}

/* -------------------------------------------------------
  BinId Section (below zone listing)
  IMPORTANT: uses sdk.admin.generateBinIdRange and sdk.admin.deleteBinIdRange (camelCase)
------------------------------------------------------- */
function BinIdSection() {
  const qc = useQueryClient();

  // ✅ Hide by default
  const [showList, setShowList] = useState(false);

  // Generate
  const [prefix, setPrefix] = useState("BIN-");
  const [pad, setPad] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Delete range
  const [delStart, setDelStart] = useState("");
  const [delEnd, setDelEnd] = useState("");

  // List controls
  const [q, setQ] = useState("");
  const [assigned, setAssigned] = useState(""); // "", "true", "false"
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
    // ✅ IMPORTANT: do not fetch when hidden
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
      // if user is viewing list, refresh it
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

    const ok = confirm(
      `Delete BinIds from ${px}${String(s).padStart(pd, "0")} to ${px}${String(en).padStart(pd, "0")}?`
    );
    if (!ok) return;

    deleteRangeMut.mutate({ start: s, end: en, pad: pd, prefix: px });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Bin ID Generator</div>
              <div className="text-xs text-muted mt-1">
                Generate BIN IDs by range, delete single or delete by range. Listing is optional.
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowList((v) => {
                    const next = !v;
                    // when turning on, fetch immediately
                    if (!v) setPage(1);
                    return next;
                  });
                }}
              >
                {showList ? "Hide Bins" : "Show Bins"}
              </Button>

              <Button
                variant="outline"
                onClick={() => listQuery.refetch()}
                disabled={!showList || listQuery.isFetching}
                title={!showList ? "Show bins first" : ""}
              >
                {listQuery.isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {/* Generate */}
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

          {/* Delete Range */}
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

      {/* ✅ Bin listing hidden by default */}
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
                <EmptyState
                  title="No Bin IDs"
                  description="Generate a range to create BIN IDs."
                  action={<Button onClick={() => listQuery.refetch()}>Refresh</Button>}
                />
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
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        Prev
                      </Button>
                      <div className="text-xs text-muted">
                        Page <span className="font-semibold">{page}</span> / {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
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


export default function ZonesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin_zones"], queryFn: () => sdk.admin.listZones() });
  const items = q.data?.items || [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", wardCode: "", lat: "", lng: "", polygon: "" });

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const create = useMutation({
    mutationFn: () => sdk.admin.createZone(toPayload(form)),
    onSuccess: () => {
      toast.success("Zone created");
      setOpen(false);
      setForm({ name: "", wardCode: "", lat: "", lng: "", polygon: "" });
      qc.invalidateQueries({ queryKey: ["admin_zones"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: () => sdk.admin.updateZone(editing._id || editing.id, toPayload(form)),
    onSuccess: () => {
      toast.success("Zone updated");
      setOpen(false);
      setEditing(null);
      setForm({ name: "", wardCode: "", lat: "", lng: "", polygon: "" });
      qc.invalidateQueries({ queryKey: ["admin_zones"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id) => sdk.admin.deleteZone(id),
    onSuccess: () => {
      toast.success("Zone deleted");
      qc.invalidateQueries({ queryKey: ["admin_zones"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const modalTitle = editing ? "Edit zone" : "Create zone";

  const rows = useMemo(() => {
    return items.map((z) => {
      const coords = z?.centroid?.coordinates || [];
      return {
        id: z._id || z.id,
        name: z.name,
        wardCode: z.wardCode,
        lng: coords[0],
        lat: coords[1],
        createdAt: z.createdAt,
      };
    });
  }, [items]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", wardCode: "", lat: "", lng: "", polygon: "" });
    setOpen(true);
  }

  function openEdit(z) {
    setEditing(z);
    const coords = z?.centroid?.coordinates || [];
    setForm({
      name: z.name || "",
      wardCode: z.wardCode || "",
      lng: coords[0] ?? "",
      lat: coords[1] ?? "",
      polygon: z.polygon ? JSON.stringify(z.polygon) : "",
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zones"
        subtitle="Define operational areas using ward code and a centroid location."
        right={<Button onClick={openCreate}>Create zone</Button>}
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading zones...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No zones"
          description="Create your first zone to start mapping households and bins."
          action={<Button onClick={openCreate}>Create zone</Button>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Ward</TH>
              <TH>Centroid</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((z) => (
              <TR key={z.id}>
                <TD className="font-medium">{z.name}</TD>
                <TD>{z.wardCode || "—"}</TD>
                <TD className="text-xs text-muted">{z.lng != null ? `${z.lat}, ${z.lng}` : "—"}</TD>
                <TD className="text-xs text-muted">{formatDateTime(z.createdAt)}</TD>
                <TD className="text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" onClick={() => openEdit(items.find((i) => (i._id || i.id) === z.id))}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm("Delete this zone?")) del.mutate(z.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        title={modalTitle}
        description="Centroid coordinates are required. Use (lat, lng)."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={create.isPending || update.isPending}
              onClick={() => (editing ? update.mutate() : create.mutate())}
            >
              {create.isPending || update.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Ward 01" />
          </div>
          <div>
            <Label>Ward code</Label>
            <Input value={form.wardCode} onChange={(e) => set("wardCode", e.target.value)} placeholder="e.g., W01" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitude *</Label>
              <Input value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="27.7" />
            </div>
            <div>
              <Label>Longitude *</Label>
              <Input value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="85.3" />
            </div>
          </div>
          <div>
            <Label>Polygon (optional)</Label>
            <Input
              value={form.polygon}
              onChange={(e) => set("polygon", e.target.value)}
              placeholder='{"type":"Polygon","coordinates":[...]}'
            />
            <div className="mt-1 text-xs text-muted">You can leave this empty; centroid is enough for most workflows.</div>
          </div>
        </div>
      </Modal>

     

      {/* ✅ BELOW zone listing + footer card */}
      <BinIdSection />
    </div>
  );
}
