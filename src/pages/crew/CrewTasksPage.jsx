import React, { useMemo, useRef, useState } from 'react'
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
import { Card, CardContent } from '../../components/ui/card'
import { sdk } from '../../lib/sdk'
import { TASK_STATUSES } from '../../lib/constants'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

function statusVariant(status) {
  if (status === TASK_STATUSES.COMPLETED) return 'success'
  if (status === TASK_STATUSES.FAILED || status === TASK_STATUSES.CANCELLED) return 'danger'
  if (status === TASK_STATUSES.ASSIGNED || status === TASK_STATUSES.IN_PROGRESS || status === TASK_STATUSES.ARRIVED) return 'warning'
  return 'default'
}

export default function CrewTasksPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')

  const q = useQuery({
    queryKey: ['crew_tasks', status],
    queryFn: () => sdk.crew.listMyTasks(status ? { status } : undefined)
  })
  const items = q.data?.items || []

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => sdk.crew.updateTaskStatus(id, { status }),
    onSuccess: () => {
      toast.success('Task updated')
      qc.invalidateQueries({ queryKey: ['crew_tasks'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  // Proof upload modal
  const [proofOpen, setProofOpen] = useState(false)
  const [activeTask, setActiveTask] = useState(null)
  const fileRef = useRef(null)

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0]
      if (!file) throw new Error('Please choose a file')
      const id = activeTask?._id || activeTask?.id
      return sdk.crew.uploadProof(id, file)
    },
    onSuccess: () => {
      toast.success('Proof uploaded')
      setProofOpen(false)
      setActiveTask(null)
      qc.invalidateQueries({ queryKey: ['crew_tasks'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openProof(t) {
    setActiveTask(t)
    setProofOpen(true)
    setTimeout(() => fileRef.current?.focus?.(), 0)
  }

  const rows = useMemo(() => items.map((t) => ({
    id: t._id || t.id,
    status: t.status,
    requiredVehicle: t.requiredVehicle,
    scheduledDate: t.scheduledDate,
    hasProof: !!t.proofEvidenceId,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    createdAt: t.createdAt
  })), [items])

  function canAction(status, action) {
    if (status === TASK_STATUSES.CANCELLED || status === TASK_STATUSES.COMPLETED) return false
    if (action === 'ARRIVED') return [TASK_STATUSES.ASSIGNED, TASK_STATUSES.CREATED].includes(status)
    if (action === 'IN_PROGRESS') return [TASK_STATUSES.ASSIGNED, TASK_STATUSES.ARRIVED].includes(status)
    if (action === 'COMPLETED') return [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.ARRIVED, TASK_STATUSES.ASSIGNED].includes(status)
    if (action === 'FAILED') return [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.ARRIVED, TASK_STATUSES.ASSIGNED].includes(status)
    return true
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        subtitle="Update task progress and upload proof when required."
        right={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[220px]">
            <option value="">All statuses</option>
            {Object.values(TASK_STATUSES).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        }
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading tasks...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No tasks" description="You have no tasks for the selected filter." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Status</TH>
              <TH>Required</TH>
              <TH>Scheduled</TH>
              <TH>Proof</TH>
              <TH>Started</TH>
              <TH>Completed</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((t) => (
              <TR key={t.id}>
                <TD><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TD>
                <TD>{t.requiredVehicle}</TD>
                <TD className="text-xs text-muted">{t.scheduledDate || '—'}</TD>
                <TD>{t.hasProof ? <Badge variant="success">Uploaded</Badge> : <Badge variant="warning">Missing</Badge>}</TD>
                <TD className="text-xs text-muted">{formatDateTime(t.startedAt)}</TD>
                <TD className="text-xs text-muted">{formatDateTime(t.completedAt)}</TD>
                <TD className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => openProof(items.find(x => (x._id||x.id)===t.id))}>Upload proof</Button>
                    <Button
                      variant="secondary"
                      disabled={updateStatus.isPending || !canAction(t.status, 'ARRIVED')}
                      onClick={() => updateStatus.mutate({ id: t.id, status: TASK_STATUSES.ARRIVED })}
                    >
                      Arrived
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={updateStatus.isPending || !canAction(t.status, 'IN_PROGRESS')}
                      onClick={() => updateStatus.mutate({ id: t.id, status: TASK_STATUSES.IN_PROGRESS })}
                    >
                      Start
                    </Button>
                    <Button
                      disabled={updateStatus.isPending || !canAction(t.status, 'COMPLETED')}
                      onClick={() => updateStatus.mutate({ id: t.id, status: TASK_STATUSES.COMPLETED })}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="danger"
                      disabled={updateStatus.isPending || !canAction(t.status, 'FAILED')}
                      onClick={() => {
                        if (confirm('Mark this task as FAILED?')) updateStatus.mutate({ id: t.id, status: TASK_STATUSES.FAILED })
                      }}
                    >
                      Fail
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={proofOpen}
        onOpenChange={setProofOpen}
        title="Upload proof"
        description="Proof may be required for BULKY and BIN_SERVICE tasks before completion."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setProofOpen(false)}>Cancel</Button>
            <Button disabled={upload.isPending} onClick={() => upload.mutate()}>
              {upload.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
            <div className="font-semibold">Task ID: {activeTask?._id || activeTask?.id}</div>
            <div className="mt-1 text-xs text-muted">Status: {activeTask?.status}</div>
          </div>
          <div>
            <Label>Choose image/file</Label>
            <input ref={fileRef} type="file" className="mt-2 w-full text-sm" />
            <div className="mt-1 text-xs text-muted">Accepted depends on backend file middleware (usually images).</div>
          </div>
          <Card>
            <CardContent className="py-4 text-xs text-muted">
              If you see “Proof upload is required before completing”, upload proof first, then complete.
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  )
}
