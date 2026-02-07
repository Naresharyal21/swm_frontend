import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'

import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function HouseholdsPage() {
  const qc = useQueryClient()

  const zonesQ = useQuery({ queryKey: ['admin_zones'], queryFn: () => sdk.admin.listZones() })
  const plansQ = useQuery({ queryKey: ['admin_billing_plans'], queryFn: () => sdk.admin.listBillingPlans() })

  const [zoneId, setZoneId] = useState('')

  const q = useQuery({
    queryKey: ['admin_households', zoneId],
    queryFn: () => sdk.admin.listHouseholds(zoneId ? { zoneId } : {})
  })

  const items = q.data?.items || []
  const zones = zonesQ.data?.items || []
  const plans = plansQ.data?.items || []

  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    zoneId: '',
    citizenUserId: '',
    address: '',
    lng: '',
    lat: '',
    planId: '',
    pickupScheduleDays: ['MON', 'WED', 'FRI']
  })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function toggleDay(day) {
    setForm((p) => {
      const s = new Set(p.pickupScheduleDays || [])
      if (s.has(day)) s.delete(day)
      else s.add(day)
      return { ...p, pickupScheduleDays: Array.from(s) }
    })
  }

  function buildLocation() {
    const lng = Number(form.lng)
    const lat = Number(form.lat)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
    return { type: 'Point', coordinates: [lng, lat] }
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.zoneId) throw new Error('Zone is required')
      if (!form.address.trim()) throw new Error('Address is required')

      const location = buildLocation()
      if (!location) throw new Error('Valid lng/lat required')

      const payload = {
        zoneId: form.zoneId,
        citizenUserId: form.citizenUserId?.trim() ? form.citizenUserId.trim() : null,
        address: form.address.trim(),
        location,
        planId: form.planId?.trim() ? form.planId.trim() : null,
        pickupScheduleDays: Array.isArray(form.pickupScheduleDays) ? form.pickupScheduleDays : undefined
      }

      return sdk.admin.createHousehold(payload)
    },
    onSuccess: () => {
      toast.success('Household created')
      setOpen(false)
      setForm({ zoneId: '', citizenUserId: '', address: '', lng: '', lat: '', planId: '', pickupScheduleDays: ['MON', 'WED', 'FRI'] })
      qc.invalidateQueries({ queryKey: ['admin_households'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const update = useMutation({
    mutationFn: async () => {
      const id = editing?._id || editing?.id
      if (!id) throw new Error('Missing household id')

      const patch = {}
      if (form.zoneId) patch.zoneId = form.zoneId
      if (form.citizenUserId !== '') patch.citizenUserId = form.citizenUserId?.trim() ? form.citizenUserId.trim() : null
      if (form.address.trim()) patch.address = form.address.trim()

      // allow location update only if both present and valid
      if (String(form.lng).trim() !== '' || String(form.lat).trim() !== '') {
        const loc = buildLocation()
        if (!loc) throw new Error('Valid lng/lat required to update location')
        patch.location = loc
      }

      if (form.planId !== '') patch.planId = form.planId?.trim() ? form.planId.trim() : null
      if (Array.isArray(form.pickupScheduleDays)) patch.pickupScheduleDays = form.pickupScheduleDays

      if (Object.keys(patch).length === 0) throw new Error('Nothing to update')
      return sdk.admin.updateHousehold(id, patch)
    },
    onSuccess: () => {
      toast.success('Household updated')
      setEditOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['admin_households'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const del = useMutation({
    mutationFn: async (h) => {
      const id = h?._id || h?.id
      if (!id) throw new Error('Missing household id')
      return sdk.admin.deleteHousehold(id)
    },
    onSuccess: () => {
      toast.success('Household deleted')
      qc.invalidateQueries({ queryKey: ['admin_households'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openEdit(h) {
    setEditing(h)
    const coords = h?.location?.coordinates || []
    setForm({
      zoneId: h?.zoneId || '',
      citizenUserId: h?.citizenUserId || '',
      address: h?.address || '',
      lng: coords?.[0] ?? '',
      lat: coords?.[1] ?? '',
      planId: h?.planId || '',
      pickupScheduleDays: h?.pickupScheduleDays?.length ? h.pickupScheduleDays : ['MON', 'WED', 'FRI']
    })
    setEditOpen(true)
  }

  const byZone = useMemo(() => {
    const m = {}
    for (const h of items) {
      const z = h.zoneId || 'UNKNOWN'
      m[z] = (m[z] || 0) + 1
    }
    return m
  }, [items])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Households"
        subtitle="Manage households (location, plan, pickup schedule)."
        right={<Button onClick={() => setOpen(true)}>Create household</Button>}
      />

      <Card>
        <CardContent className="py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Filter by zone</Label>
              <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">All zones</option>
                {zones.map((z) => (
                  <option key={z._id} value={z._id}>
                    {z.name || z._id} ({byZone[z._id] || 0})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => q.refetch()}>
                Refresh
              </Button>
              <Button variant="ghost" onClick={() => setZoneId('')}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading households...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No households"
          description="Create households to attach bins and schedules."
          action={<Button onClick={() => setOpen(true)}>Create household</Button>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Address</TH>
              <TH>Zone</TH>
              <TH>Plan</TH>
              <TH>Schedule</TH>
              <TH>Location</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((h) => {
              const coords = h?.location?.coordinates || []
              const z = zones.find((x) => x._id === h.zoneId)
              const p = plans.find((x) => x._id === h.planId)
              return (
                <TR key={h._id || h.id}>
                  <TD className="font-medium">{h.address}</TD>
                  <TD>{z?.name || h.zoneId || <span className="text-muted">—</span>}</TD>
                  <TD>{p?.name || (h.planId ? h.planId : <span className="text-muted">—</span>)}</TD>
                  <TD className="text-xs">
                    {(h.pickupScheduleDays || []).length ? (
                      <div className="flex flex-wrap gap-1">
                        {(h.pickupScheduleDays || []).map((d) => (
                          <Badge key={d} variant="success">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TD>
                  <TD className="text-xs text-muted">
                    {coords?.length === 2 ? `${coords[0]}, ${coords[1]}` : '—'}
                  </TD>
                  <TD className="text-xs text-muted">{formatDateTime(h.createdAt)}</TD>
                  <TD className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <Button variant="outline" onClick={() => openEdit(h)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        disabled={del.isPending}
                        onClick={() => {
                          if (confirm(`Delete household "${h.address}"?`)) del.mutate(h)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      {/* Edit */}
      <Modal
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v)
          if (!v) setEditing(null)
        }}
        title="Edit household"
        description="Update household fields."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={update.isPending} onClick={() => update.mutate()}>
              {update.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <HouseholdForm zones={zones} plans={plans} form={form} set={set} toggleDay={toggleDay} />
      </Modal>

      {/* Create */}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create household"
        description="Add a household with location and pickup schedule."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <HouseholdForm zones={zones} plans={plans} form={form} set={set} toggleDay={toggleDay} />
      </Modal>
    </div>
  )
}

function HouseholdForm({ zones, plans, form, set, toggleDay }) {
  return (
    <div className="grid gap-4">
      <div>
        <Label>Zone *</Label>
        <Select value={form.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
          <option value="">Select zone</option>
          {zones.map((z) => (
            <option key={z._id} value={z._id}>
              {z.name || z._id}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Address *</Label>
        <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="House address" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Longitude (lng) *</Label>
          <Input value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="85.3240" />
        </div>
        <div>
          <Label>Latitude (lat) *</Label>
          <Input value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="27.7172" />
        </div>
      </div>

      <div>
        <Label>Citizen userId (optional)</Label>
        <Input value={form.citizenUserId} onChange={(e) => set('citizenUserId', e.target.value)} placeholder="User ObjectId" />
      </div>

      <div>
        <Label>Billing plan (optional)</Label>
        <Select value={form.planId} onChange={(e) => set('planId', e.target.value)}>
          <option value="">No plan</option>
          {plans.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name || p._id}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Pickup schedule days</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <Button
              key={d}
              type="button"
              variant={form.pickupScheduleDays?.includes(d) ? 'default' : 'outline'}
              onClick={() => toggleDay(d)}
            >
              {d}
            </Button>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted">Stored in Household.pickupScheduleDays</div>
      </div>
    </div>
  )
}
