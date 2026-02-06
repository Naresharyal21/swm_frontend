import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage, toPoint } from '../../lib/utils'

function numOrNull(x) {
  const n = Number(x)
  return Number.isFinite(n) && String(x).trim() !== '' ? n : null
}

export default function VirtualBinsPage() {
  const qc = useQueryClient()
  const [zoneId, setZoneId] = useState('')

  const zonesQ = useQuery({ queryKey: ['admin_zones'], queryFn: () => sdk.admin.listZones() })
  const householdsQ = useQuery({ queryKey: ['admin_households_all'], queryFn: () => sdk.admin.listHouseholds() })
  const binsQ = useQuery({ queryKey: ['admin_bins_all'], queryFn: () => sdk.admin.listBins() })
  const vbsQ = useQuery({
    queryKey: ['admin_virtual_bins', zoneId],
    queryFn: () => sdk.admin.listVirtualBins(zoneId ? { zoneId } : undefined)
  })

  const zones = zonesQ.data?.items || []
  const households = householdsQ.data?.items || []
  const bins = binsQ.data?.items || []
  const items = vbsQ.data?.items || []

  const householdById = useMemo(() => Object.fromEntries(households.map((h) => [String(h._id || h.id), h])), [households])
  const zoneById = useMemo(() => Object.fromEntries(zones.map((z) => [String(z._id || z.id), z])), [zones])

  // Bin -> zone inference via household.zoneId
  const binsByZone = useMemo(() => {
    const map = {}
    for (const b of bins) {
      const h = householdById[String(b.householdId)]
      const z = h?.zoneId ? String(h.zoneId) : 'UNKNOWN'
      map[z] = map[z] || []
      map[z].push(b)
    }
    return map
  }, [bins, householdById])

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    zoneId: '',
    lat: '',
    lng: '',
    over80: '',
    over95: '',
    risk: '',
    isActive: true
  })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Name is required')
      if (!form.zoneId) throw new Error('Zone is required')
      const payload = {
        name: form.name.trim(),
        zoneId: form.zoneId,
        centroid: toPoint(form.lng || 0, form.lat || 0),
        thresholds: {
          over80: numOrNull(form.over80),
          over95: numOrNull(form.over95),
          risk: numOrNull(form.risk)
        },
        isActive: !!form.isActive
      }
      return sdk.admin.createVirtualBin(payload)
    },
    onSuccess: () => {
      toast.success('Virtual bin created')
      setOpen(false)
      setForm({ name: '', zoneId: '', lat: '', lng: '', over80: '', over95: '', risk: '', isActive: true })
      qc.invalidateQueries({ queryKey: ['admin_virtual_bins'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  // Members modal
  const [membersOpen, setMembersOpen] = useState(false)
  const [selectedVB, setSelectedVB] = useState(null)
  const [selectedBinIds, setSelectedBinIds] = useState([])
  const [binSearch, setBinSearch] = useState('')

  function openMembers(vb) {
    setSelectedVB(vb)
    const vbId = String(vb._id || vb.id)
    const zone = String(vb.zoneId)
    const zoneBins = binsByZone[zone] || []
    const pre = zoneBins.filter((b) => String(b.virtualBinId || '') === vbId).map((b) => String(b._id || b.id))
    setSelectedBinIds(pre)
    setBinSearch('')
    setMembersOpen(true)
  }

  function toggleBin(id) {
    setSelectedBinIds((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return Array.from(s)
    })
  }

  const saveMembers = useMutation({
    mutationFn: async () => {
      if (!selectedVB) return
      const vbId = selectedVB._id || selectedVB.id
      return sdk.admin.setVirtualBinMembers(vbId, { binIds: selectedBinIds })
    },
    onSuccess: (res) => {
      toast.success(`Members updated (${res?.count ?? selectedBinIds.length})`)
      setMembersOpen(false)
      qc.invalidateQueries({ queryKey: ['admin_bins_all'] })
      qc.invalidateQueries({ queryKey: ['admin_bins'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openCreate() {
    setForm((p) => ({ ...p, zoneId: zoneId || p.zoneId }))
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Virtual Bins"
        subtitle="Group multiple bins into a service area and apply digital twin thresholds."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="w-[220px]">
              <option value="">All zones</option>
              {zones.map((z) => (
                <option key={z._id || z.id} value={z._id || z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
            <Button onClick={openCreate}>Create virtual bin</Button>
          </div>
        }
      />

      {vbsQ.isLoading ? (
        <div className="text-sm text-muted">Loading virtual bins...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No virtual bins" description="Create a virtual bin to group household bins." action={<Button onClick={openCreate}>Create virtual bin</Button>} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Zone</TH>
              <TH>Active</TH>
              <TH>Thresholds</TH>
              <TH>Members</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((vb) => {
              const id = vb._id || vb.id
              const z = zoneById[String(vb.zoneId)]
              const zoneBins = binsByZone[String(vb.zoneId)] || []
              const memberCount = zoneBins.filter((b) => String(b.virtualBinId || '') === String(id)).length
              return (
                <TR key={id}>
                  <TD className="font-medium">{vb.name}</TD>
                  <TD>{z?.name || <span className="text-muted">{String(vb.zoneId)}</span>}</TD>
                  <TD>
                    <Badge variant={vb.isActive ? 'success' : 'warning'}>{vb.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TD>
                  <TD className="text-xs text-muted">
                    over80: {vb.thresholds?.over80 ?? '—'} | over95: {vb.thresholds?.over95 ?? '—'} | risk: {vb.thresholds?.risk ?? '—'}
                  </TD>
                  <TD>{memberCount}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(vb.createdAt)}</TD>
                  <TD className="text-right">
                    <Button variant="outline" onClick={() => openMembers(vb)}>Manage members</Button>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create virtual bin"
        description="Digital twin thresholds are optional. Members are managed after creation."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., Ward 01 Cluster A" />
          </div>
          <div>
            <Label>Zone *</Label>
            <Select value={form.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
              <option value="">Select zone</option>
              {zones.map((z) => (
                <option key={z._id || z.id} value={z._id || z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitude</Label>
              <Input value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="27.7" />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="85.3" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>over80 threshold (0-1)</Label>
              <Input value={form.over80} onChange={(e) => set('over80', e.target.value)} placeholder="0.20" />
            </div>
            <div>
              <Label>over95 threshold (0-1)</Label>
              <Input value={form.over95} onChange={(e) => set('over95', e.target.value)} placeholder="0.10" />
            </div>
            <div>
              <Label>risk threshold (0-100)</Label>
              <Input value={form.risk} onChange={(e) => set('risk', e.target.value)} placeholder="65" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="text-sm font-semibold">How members work</div>
              <div className="text-xs text-muted">Members are bins. Use “Manage members” after creation to assign bins.</div>
            </CardHeader>
            <CardContent className="text-xs text-muted">
              Note: Edit/delete endpoints for virtual bins are not in the backend; you can deactivate through DB if needed.
            </CardContent>
          </Card>
        </div>
      </Modal>

      <Modal
        open={membersOpen}
        onOpenChange={setMembersOpen}
        title="Manage members"
        description="Select bins that belong to this virtual bin. Saved bins will have virtualBinId set."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMembersOpen(false)}>Cancel</Button>
            <Button disabled={saveMembers.isPending} onClick={() => saveMembers.mutate()}>
              {saveMembers.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        {!selectedVB ? null : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-app bg-black/5 p-3 text-sm dark:bg-white/5">
              <div className="font-semibold">{selectedVB.name}</div>
              <div className="text-xs text-muted">Zone: {zoneById[String(selectedVB.zoneId)]?.name || String(selectedVB.zoneId)}</div>
            </div>

            <div>
              <Label>Search bins</Label>
              <Input value={binSearch} onChange={(e) => setBinSearch(e.target.value)} placeholder="Search by binId or address..." />
            </div>

            <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-app">
              {(binsByZone[String(selectedVB.zoneId)] || [])
                .filter((b) => {
                  const h = householdById[String(b.householdId)]
                  const q = binSearch.trim().toLowerCase()
                  if (!q) return true
                  return String(b.binId || '').toLowerCase().includes(q) || String(h?.address || '').toLowerCase().includes(q)
                })
                .map((b) => {
                  const bid = String(b._id || b.id)
                  const checked = selectedBinIds.includes(bid)
                  const h = householdById[String(b.householdId)]
                  return (
                    <label key={bid} className="flex cursor-pointer items-start gap-3 border-b border-app px-4 py-3 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggleBin(bid)} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{b.binId}</div>
                        <div className="text-xs text-muted truncate">{h?.address || '—'}</div>
                      </div>
                      <div className="ml-auto text-xs text-muted">{checked ? 'Selected' : ''}</div>
                    </label>
                  )
                })}
            </div>

            <div className="text-xs text-muted">Selected: {selectedBinIds.length}</div>
          </div>
        )}
      </Modal>
    </div>
  )
}
