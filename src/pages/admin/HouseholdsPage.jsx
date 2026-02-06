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
import { WEEKDAYS } from '../../lib/constants'
import { formatDateTime, pickErrorMessage, toPoint } from '../../lib/utils'

function DayToggle({ value, onChange }) {
  const set = new Set(value || [])
  function toggle(d) {
    const next = new Set(set)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    onChange(Array.from(next))
  }
  return (
    <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
      {WEEKDAYS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={[
            'rounded-xl border border-app px-3 py-2 text-xs font-semibold transition',
            set.has(d) ? 'bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand2))]' : 'hover:bg-black/5 dark:hover:bg-white/5'
          ].join(' ')}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

export default function HouseholdsPage() {
  const qc = useQueryClient()

  const [zoneId, setZoneId] = useState('')

  const zonesQ = useQuery({ queryKey: ['admin_zones'], queryFn: () => sdk.admin.listZones() })
  const usersQ = useQuery({ queryKey: ['admin_users'], queryFn: () => sdk.admin.listUsers() })
  const plansQ = useQuery({ queryKey: ['admin_billing_plans'], queryFn: () => sdk.admin.listBillingPlans() })
  const householdsQ = useQuery({
    queryKey: ['admin_households', zoneId],
    queryFn: () => sdk.admin.listHouseholds(zoneId ? { zoneId } : undefined)
  })

  const zones = zonesQ.data?.items || []
  const users = (usersQ.data?.items || []).filter((u) => u.role === 'CITIZEN')
  const plans = plansQ.data?.items || []
  const items = householdsQ.data?.items || []

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    zoneId: '',
    citizenUserId: '',
    address: '',
    lat: '',
    lng: '',
    planId: '',
    pickupScheduleDays: ['MON', 'WED', 'FRI']
  })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.zoneId) throw new Error('Zone is required')
      if (!form.address.trim()) throw new Error('Address is required')
      const payload = {
        zoneId: form.zoneId,
        citizenUserId: form.citizenUserId || null,
        address: form.address.trim(),
        location: toPoint(form.lng, form.lat),
        planId: form.planId || null,
        pickupScheduleDays: form.pickupScheduleDays || []
      }
      return sdk.admin.createHousehold(payload)
    },
    onSuccess: () => {
      toast.success('Household created')
      setOpen(false)
      setForm({
        zoneId: '',
        citizenUserId: '',
        address: '',
        lat: '',
        lng: '',
        planId: '',
        pickupScheduleDays: ['MON', 'WED', 'FRI']
      })
      qc.invalidateQueries({ queryKey: ['admin_households'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const zoneById = useMemo(() => Object.fromEntries(zones.map((z) => [String(z._id || z.id), z])), [zones])
  const userById = useMemo(() => Object.fromEntries(users.map((u) => [String(u._id || u.id), u])), [users])
  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [String(p._id || p.id), p])), [plans])

  function openCreate() {
    setForm((p) => ({ ...p, zoneId: zoneId || p.zoneId }))
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Households"
        subtitle="Register citizen households and set pickup schedules."
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
            <Button onClick={openCreate}>Create household</Button>
          </div>
        }
      />

      {householdsQ.isLoading ? (
        <div className="text-sm text-muted">Loading households...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No households"
          description="Create your first household to start billing and service scheduling."
          action={<Button onClick={openCreate}>Create household</Button>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Address</TH>
              <TH>Zone</TH>
              <TH>Citizen</TH>
              <TH>Plan</TH>
              <TH>Schedule</TH>
              <TH>Location</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((h) => {
              const id = h._id || h.id
              const z = zoneById[String(h.zoneId)]
              const u = h.citizenUserId ? userById[String(h.citizenUserId)] : null
              const p = h.planId ? planById[String(h.planId)] : null
              const coords = h.location?.coordinates || []
              return (
                <TR key={id}>
                  <TD className="font-medium">{h.address}</TD>
                  <TD>{z?.name || <span className="text-muted">{String(h.zoneId || '—')}</span>}</TD>
                  <TD>{u?.email || <span className="text-muted">Unassigned</span>}</TD>
                  <TD>
                    {p ? (
                      <div className="flex items-center gap-2">
                        <Badge variant={p.billingMode === 'DAILY_PICKUP' ? 'warning' : 'success'}>{p.billingMode}</Badge>
                        <span>{p.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </TD>
                  <TD className="text-xs">{(h.pickupScheduleDays || []).join(', ') || '—'}</TD>
                  <TD className="text-xs text-muted">{coords.length ? `${coords[1]}, ${coords[0]}` : '—'}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(h.createdAt)}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create household"
        description="Zone + address + coordinates are required."
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
        <div className="grid gap-4">
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

          <div>
            <Label>Citizen user (optional)</Label>
            <Select value={form.citizenUserId} onChange={(e) => set('citizenUserId', e.target.value)}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.email}
                </option>
              ))}
            </Select>
            <div className="mt-1 text-xs text-muted">If not assigned, the household can be linked later via seed or manual DB update.</div>
          </div>

          <div>
            <Label>Address *</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g., Ward 01, Street 10, Kathmandu" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitude *</Label>
              <Input value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="27.7172" />
            </div>
            <div>
              <Label>Longitude *</Label>
              <Input value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="85.3240" />
            </div>
          </div>

          <div>
            <Label>Billing plan (optional)</Label>
            <Select value={form.planId} onChange={(e) => set('planId', e.target.value)}>
              <option value="">None</option>
              {plans.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} ({p.billingMode})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Pickup schedule days</Label>
            <DayToggle value={form.pickupScheduleDays} onChange={(v) => set('pickupScheduleDays', v)} />
            <div className="mt-1 text-xs text-muted">Used for ROUTINE_PICKUP auto generation when routes are generated.</div>
          </div>

          <Card>
            <CardContent className="py-4 text-xs text-muted">
              Note: Household update/delete endpoints are not present in the backend. This UI focuses on create + list.
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  )
}
