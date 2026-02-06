import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { REQUIRED_VEHICLE, TASK_STATUSES } from '../../lib/constants'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

function statusVariant(status) {
  if (status === TASK_STATUSES.COMPLETED) return 'success'
  if (status === TASK_STATUSES.FAILED || status === TASK_STATUSES.CANCELLED) return 'danger'
  if (status === TASK_STATUSES.ASSIGNED || status === TASK_STATUSES.IN_PROGRESS || status === TASK_STATUSES.ARRIVED) return 'warning'
  return 'default'
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [requiredVehicle, setRequiredVehicle] = useState('')

  const tasksQ = useQuery({
    queryKey: ['ops_tasks', status, requiredVehicle],
    queryFn: () => sdk.ops.listTasks({ status: status || undefined, requiredVehicle: requiredVehicle || undefined })
  })
  const items = tasksQ.data?.items || []

  const usersQ = useQuery({ queryKey: ['admin_users'], queryFn: () => sdk.admin.listUsers() })
  const vehiclesQ = useQuery({ queryKey: ['admin_vehicles_all'], queryFn: () => sdk.admin.listVehicles() })

  const crew = (usersQ.data?.items || []).filter((u) => u.role === 'CREW' && u.isActive !== false)
  const vehicles = (vehiclesQ.data?.items || []).filter((v) => v.isActive !== false)

  const crewById = useMemo(() => Object.fromEntries(crew.map((u) => [String(u._id || u.id), u])), [crew])
  const vehicleById = useMemo(() => Object.fromEntries(vehicles.map((v) => [String(v._id || v.id), v])), [vehicles])

  const [open, setOpen] = useState(false)
  const [activeTask, setActiveTask] = useState(null)
  const [form, setForm] = useState({ assignedToUserId: '', vehicleId: '', scheduledDate: '' })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const assign = useMutation({
    mutationFn: () =>
      sdk.ops.assignTask(activeTask._id || activeTask.id, {
        assignedToUserId: form.assignedToUserId || null,
        vehicleId: form.vehicleId || null,
        scheduledDate: form.scheduledDate || null
      }),
    onSuccess: () => {
      toast.success('Task assigned')
      setOpen(false)
      setActiveTask(null)
      setForm({ assignedToUserId: '', vehicleId: '', scheduledDate: '' })
      qc.invalidateQueries({ queryKey: ['ops_tasks'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openAssign(t) {
    setActiveTask(t)
    setForm({
      assignedToUserId: t.assignedToUserId ? String(t.assignedToUserId) : '',
      vehicleId: t.vehicleId ? String(t.vehicleId) : '',
      scheduledDate: t.scheduledDate || ''
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Assign crew and vehicles to approved cases."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[220px]">
              <option value="">All statuses</option>
              {Object.values(TASK_STATUSES).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Select value={requiredVehicle} onChange={(e) => setRequiredVehicle(e.target.value)} className="w-[220px]">
              <option value="">All required vehicles</option>
              {Object.values(REQUIRED_VEHICLE).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </Select>
          </div>
        }
      />

      {tasksQ.isLoading ? (
        <div className="text-sm text-muted">Loading tasks...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No tasks" description="Approve cases to generate tasks, then assign them here." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Status</TH>
              <TH>Required</TH>
              <TH>Scheduled</TH>
              <TH>Assigned to</TH>
              <TH>Vehicle</TH>
              <TH>Started</TH>
              <TH>Completed</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((t) => {
              const id = t._id || t.id
              const crewUser = t.assignedToUserId ? crewById[String(t.assignedToUserId)] : null
              const v = t.vehicleId ? vehicleById[String(t.vehicleId)] : null
              return (
                <TR key={id}>
                  <TD><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TD>
                  <TD className="text-sm">{t.requiredVehicle}</TD>
                  <TD className="text-xs text-muted">{t.scheduledDate || '—'}</TD>
                  <TD className="text-sm">{crewUser?.email || <span className="text-muted">—</span>}</TD>
                  <TD className="text-sm">{v?.code || <span className="text-muted">—</span>}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(t.startedAt)}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(t.completedAt)}</TD>
                  <TD className="text-right">
                    <Button variant="outline" onClick={() => openAssign(t)}>Assign</Button>
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
        title="Assign task"
        description="Assigning sets the task status to ASSIGNED."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={assign.isPending} onClick={() => assign.mutate()}>
              {assign.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
            <div className="font-semibold">Task</div>
            <div className="mt-1 text-xs text-muted">ID: {activeTask?._id || activeTask?.id}</div>
            <div className="mt-2 text-sm">Required: {activeTask?.requiredVehicle}</div>
          </div>

          <div>
            <Label>Scheduled date</Label>
            <Input value={form.scheduledDate} onChange={(e) => set('scheduledDate', e.target.value)} placeholder="YYYY-MM-DD" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Crew user</Label>
              <Select value={form.assignedToUserId} onChange={(e) => set('assignedToUserId', e.target.value)}>
                <option value="">Unassigned</option>
                {crew.map((u) => (
                  <option key={u._id || u.id} value={u._id || u.id}>
                    {u.email}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
                <option value="">Unassigned</option>
                {vehicles.map((v) => (
                  <option key={v._id || v.id} value={v._id || v.id}>
                    {v.code} ({v.vehicleType})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="text-xs text-muted">
            Tip: Crew can see today’s published routes if they are assigned to the vehicle.
          </div>
        </div>
      </Modal>
    </div>
  )
}
