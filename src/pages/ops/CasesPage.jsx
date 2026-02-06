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
import { Card, CardContent } from '../../components/ui/card'
import { sdk } from '../../lib/sdk'
import { CASE_STATUSES, CASE_TYPES } from '../../lib/constants'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

function statusVariant(status) {
  if (status === CASE_STATUSES.COMPLETED) return 'success'
  if (status === CASE_STATUSES.REJECTED || status === CASE_STATUSES.FAILED || status === CASE_STATUSES.CANCELLED) return 'danger'
  if (status === CASE_STATUSES.PENDING_VALIDATION) return 'warning'
  return 'default'
}

export default function CasesPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')

  const q = useQuery({
    queryKey: ['ops_cases', status, type],
    queryFn: () => sdk.ops.listCases({ status: status || undefined, type: type || undefined })
  })
  const items = q.data?.items || []

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [activeCase, setActiveCase] = useState(null)

  const [approveForm, setApproveForm] = useState({ scheduledDate: '', priority: '3', note: '' })
  const [rejectNote, setRejectNote] = useState('')

  const approve = useMutation({
    mutationFn: () => sdk.ops.approveCase(activeCase._id || activeCase.id, {
      scheduledDate: approveForm.scheduledDate || null,
      priority: Number(approveForm.priority || 3),
      note: approveForm.note || ''
    }),
    onSuccess: () => {
      toast.success('Case approved')
      setApproveOpen(false)
      setActiveCase(null)
      qc.invalidateQueries({ queryKey: ['ops_cases'] })
      qc.invalidateQueries({ queryKey: ['ops_tasks'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const reject = useMutation({
    mutationFn: () => sdk.ops.rejectCase(activeCase._id || activeCase.id, { note: rejectNote || '' }),
    onSuccess: () => {
      toast.success('Case rejected')
      setRejectOpen(false)
      setActiveCase(null)
      setRejectNote('')
      qc.invalidateQueries({ queryKey: ['ops_cases'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const rows = useMemo(() => items.map((c) => ({
    id: c._id || c.id,
    type: c.type,
    status: c.status,
    description: c.description,
    createdAt: c.createdAt,
    priority: c.priority,
    serviceDate: c.serviceDate,
    bulkyWeightKg: c.bulkyWeightKg
  })), [items])

  function openApprove(c) {
    setActiveCase(c)
    setApproveForm({ scheduledDate: '', priority: String(c.priority ?? 3), note: '' })
    setApproveOpen(true)
  }

  function openReject(c) {
    setActiveCase(c)
    setRejectNote('')
    setRejectOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        subtitle="Validate citizen reports and generate tasks for service execution."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[200px]">
              <option value="">All statuses</option>
              {Object.values(CASE_STATUSES).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-[200px]">
              <option value="">All types</option>
              {Object.values(CASE_TYPES).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
        }
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading cases...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No cases" description="No cases match your current filters." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Type</TH>
              <TH>Status</TH>
              <TH>Description</TH>
              <TH>Priority</TH>
              <TH>Service date</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((c) => {
              const raw = items.find((x) => String(x._id || x.id) === String(c.id))
              const canReview = c.status === CASE_STATUSES.PENDING_VALIDATION
              return (
                <TR key={c.id}>
                  <TD className="font-medium">{c.type}</TD>
                  <TD><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TD>
                  <TD className="text-sm">
                    <div className="line-clamp-2">{c.description || <span className="text-muted">—</span>}</div>
                    {c.type === CASE_TYPES.BULKY && c.bulkyWeightKg != null ? (
                      <div className="mt-1 text-xs text-muted">Weight: {c.bulkyWeightKg} kg</div>
                    ) : null}
                  </TD>
                  <TD>{c.priority ?? 3}</TD>
                  <TD className="text-xs text-muted">{c.serviceDate || '—'}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(c.createdAt)}</TD>
                  <TD className="text-right">
                    {canReview ? (
                      <div className="inline-flex gap-2">
                        <Button variant="outline" onClick={() => openApprove(raw)}>Approve</Button>
                        <Button variant="danger" onClick={() => openReject(raw)}>Reject</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <Modal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve case"
        description="Approving creates or updates an associated task (scheduled date optional)."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button disabled={approve.isPending} onClick={() => approve.mutate()}>
              {approve.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
            <div className="font-semibold">{activeCase?.type}</div>
            <div className="mt-1 text-xs text-muted">Case ID: {activeCase?._id || activeCase?.id}</div>
            <div className="mt-2 text-sm">{activeCase?.description || <span className="text-muted">—</span>}</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Scheduled date</Label>
              <Input value={approveForm.scheduledDate} onChange={(e) => setApproveForm((p) => ({ ...p, scheduledDate: e.target.value }))} placeholder="YYYY-MM-DD" />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={approveForm.priority} onChange={(e) => setApproveForm((p) => ({ ...p, priority: e.target.value }))}>
                <option value="1">1 (Highest)</option>
                <option value="2">2</option>
                <option value="3">3 (Normal)</option>
                <option value="4">4</option>
                <option value="5">5 (Lowest)</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <Input value={approveForm.note} onChange={(e) => setApproveForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional validation note" />
          </div>

          <Card>
            <CardContent className="py-4 text-xs text-muted">
              After approval, use Ops → Tasks to assign a crew/vehicle and schedule execution.
            </CardContent>
          </Card>
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject case"
        description="Rejected cases are closed and won't generate tasks."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate()}>
              {reject.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
            <div className="font-semibold">{activeCase?.type}</div>
            <div className="mt-1 text-xs text-muted">Case ID: {activeCase?._id || activeCase?.id}</div>
            <div className="mt-2 text-sm">{activeCase?.description || <span className="text-muted">—</span>}</div>
          </div>
          <div>
            <Label>Reason / note</Label>
            <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Optional reason" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
