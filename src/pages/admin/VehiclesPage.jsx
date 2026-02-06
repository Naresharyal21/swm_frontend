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
import { VEHICLE_TYPES } from '../../lib/constants'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

export default function VehiclesPage() {
  const qc = useQueryClient()
  const [vehicleType, setVehicleType] = useState('')

  const usersQ = useQuery({ queryKey: ['admin_users'], queryFn: () => sdk.admin.listUsers() })
  const vehiclesQ = useQuery({
    queryKey: ['admin_vehicles', vehicleType],
    queryFn: () => sdk.admin.listVehicles(vehicleType ? { vehicleType } : undefined)
  })

  const users = usersQ.data?.items || []
  const crew = users.filter((u) => u.role === 'CREW' && u.isActive !== false)
  const items = vehiclesQ.data?.items || []

  const crewById = useMemo(() => Object.fromEntries(crew.map((u) => [String(u._id || u.id), u])), [crew])

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    code: '',
    vehicleType: VEHICLE_TYPES.TRUCK,
    capacityKg: '',
    isActive: true,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    crewUserIds: []
  })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function toggleCrew(id) {
    setForm((p) => {
      const s = new Set(p.crewUserIds || [])
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return { ...p, crewUserIds: Array.from(s) }
    })
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.code.trim()) throw new Error('Vehicle code is required')
      const payload = {
        code: form.code.trim(),
        vehicleType: form.vehicleType,
        capacityKg: form.capacityKg === '' ? null : Number(form.capacityKg),
        isActive: !!form.isActive,
        shiftStart: form.shiftStart || '08:00',
        shiftEnd: form.shiftEnd || '16:00',
        crewUserIds: form.crewUserIds || []
      }
      return sdk.admin.createVehicle(payload)
    },
    onSuccess: () => {
      toast.success('Vehicle created')
      setOpen(false)
      setForm({ code: '', vehicleType: VEHICLE_TYPES.TRUCK, capacityKg: '', isActive: true, shiftStart: '08:00', shiftEnd: '16:00', crewUserIds: [] })
      qc.invalidateQueries({ queryKey: ['admin_vehicles'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openCreate() {
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        subtitle="Register trucks/scooters and assign crew members."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="w-[180px]">
              <option value="">All types</option>
              {Object.values(VEHICLE_TYPES).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Button onClick={openCreate}>Create vehicle</Button>
          </div>
        }
      />

      {vehiclesQ.isLoading ? (
        <div className="text-sm text-muted">Loading vehicles...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No vehicles" description="Create vehicles to enable route generation and task assignment." action={<Button onClick={openCreate}>Create vehicle</Button>} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Type</TH>
              <TH>Capacity</TH>
              <TH>Shift</TH>
              <TH>Crew</TH>
              <TH>Status</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((v) => {
              const id = v._id || v.id
              const crewIds = v.crewUserIds || []
              const crewList = crewIds.map((cid) => crewById[String(cid)]?.email).filter(Boolean)
              return (
                <TR key={id}>
                  <TD className="font-medium">{v.code}</TD>
                  <TD><Badge variant={v.vehicleType === 'TRUCK' ? 'success' : 'warning'}>{v.vehicleType}</Badge></TD>
                  <TD className="text-sm">{v.capacityKg != null ? `${v.capacityKg} kg` : <span className="text-muted">—</span>}</TD>
                  <TD className="text-xs text-muted">{v.shiftStart || '—'} - {v.shiftEnd || '—'}</TD>
                  <TD className="text-xs">{crewList.length ? crewList.join(', ') : <span className="text-muted">Unassigned</span>}</TD>
                  <TD><Badge variant={v.isActive ? 'success' : 'danger'}>{v.isActive ? 'Active' : 'Inactive'}</Badge></TD>
                  <TD className="text-xs text-muted">{formatDateTime(v.createdAt)}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create vehicle"
        description="Vehicle codes must be unique. Assign crew to enable crew route visibility."
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
            <Label>Code *</Label>
            <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g., TRUCK-01" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Vehicle type *</Label>
              <Select value={form.vehicleType} onChange={(e) => set('vehicleType', e.target.value)}>
                {Object.values(VEHICLE_TYPES).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Capacity (kg)</Label>
              <Input value={form.capacityKg} onChange={(e) => set('capacityKg', e.target.value)} placeholder="e.g., 1500" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Shift start</Label>
              <Input value={form.shiftStart} onChange={(e) => set('shiftStart', e.target.value)} placeholder="08:00" />
            </div>
            <div>
              <Label>Shift end</Label>
              <Input value={form.shiftEnd} onChange={(e) => set('shiftEnd', e.target.value)} placeholder="16:00" />
            </div>
          </div>

          <div>
            <Label>Crew assignment</Label>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-app">
              {crew.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted">No crew users found. Create crew in Admin → Users.</div>
              ) : (
                crew.map((u) => {
                  const uid = String(u._id || u.id)
                  const checked = (form.crewUserIds || []).includes(uid)
                  return (
                    <label key={uid} className="flex cursor-pointer items-center gap-3 border-b border-app px-4 py-3 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <input type="checkbox" checked={checked} onChange={() => toggleCrew(uid)} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{u.email}</div>
                        <div className="text-xs text-muted">{u.name || 'Crew member'}</div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <Card>
            <CardContent className="py-4 text-xs text-muted">
              Note: Vehicle update/delete endpoints are not present in the backend. Use DB changes if needed.
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  )
}
