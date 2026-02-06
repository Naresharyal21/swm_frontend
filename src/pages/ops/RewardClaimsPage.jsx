import React, { useState } from 'react'
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
import { formatDateTime, formatMoney, pickErrorMessage } from '../../lib/utils'

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED']

function variant(status) {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning'
}

export default function RewardClaimsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')

  const q = useQuery({
    queryKey: ['ops_reward_claims', status],
    queryFn: () => sdk.ops.listRewardClaims(status ? { status } : undefined)
  })
  const items = q.data?.items || []

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('APPROVE')
  const [active, setActive] = useState(null)
  const [note, setNote] = useState('')

  const approve = useMutation({
    mutationFn: () => sdk.ops.approveRewardClaim(active._id || active.id, { note }),
    onSuccess: () => {
      toast.success('Claim approved')
      setOpen(false)
      setActive(null)
      setNote('')
      qc.invalidateQueries({ queryKey: ['ops_reward_claims'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const reject = useMutation({
    mutationFn: () => sdk.ops.rejectRewardClaim(active._id || active.id, { note }),
    onSuccess: () => {
      toast.success('Claim rejected')
      setOpen(false)
      setActive(null)
      setNote('')
      qc.invalidateQueries({ queryKey: ['ops_reward_claims'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openApprove(c) {
    setActive(c)
    setMode('APPROVE')
    setNote('')
    setOpen(true)
  }

  function openReject(c) {
    setActive(c)
    setMode('REJECT')
    setNote('')
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward Claims"
        subtitle="Approve or reject citizen reward claims (wallet credit)."
        right={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[220px]">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        }
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading reward claims...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No claims" description="No reward claims match your filters." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Status</TH>
              <TH>Category</TH>
              <TH>Quantity</TH>
              <TH>User</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((c) => {
              const id = c._id || c.id
              const canReview = c.status === 'PENDING'
              return (
                <TR key={id}>
                  <TD><Badge variant={variant(c.status)}>{c.status}</Badge></TD>
                  <TD className="font-medium">{c.category}</TD>
                  <TD>{c.quantity}</TD>
                  <TD className="text-xs text-muted">{String(c.userId || '').slice(-6)}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(c.createdAt)}</TD>
                  <TD className="text-right">
                    {canReview ? (
                      <div className="inline-flex gap-2">
                        <Button variant="outline" onClick={() => openApprove(c)}>Approve</Button>
                        <Button variant="danger" onClick={() => openReject(c)}>Reject</Button>
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
        open={open}
        onOpenChange={setOpen}
        title={mode === 'APPROVE' ? 'Approve claim' : 'Reject claim'}
        description="Optional note will be stored in audit log."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            {mode === 'APPROVE' ? (
              <Button disabled={approve.isPending} onClick={() => approve.mutate()}>
                {approve.isPending ? 'Approving...' : 'Approve'}
              </Button>
            ) : (
              <Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate()}>
                {reject.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            )}
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
            <div className="font-semibold">{active?.category}</div>
            <div className="mt-1 text-xs text-muted">Quantity: {active?.quantity}</div>
            <div className="mt-1 text-xs text-muted">User: {active?.userId}</div>
          </div>
          <div>
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional reviewer note" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
