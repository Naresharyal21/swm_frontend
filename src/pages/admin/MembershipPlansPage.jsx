import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime, formatMoney, pickErrorMessage } from '../../lib/utils'

function toPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description || '',
    monthlyFee: Number(form.monthlyFee || 0),
    discountPercent: Number(form.discountPercent || 0),
    recyclableBonusPercent: Number(form.recyclableBonusPercent || 0),
    isActive: !!form.isActive
  }
}

export default function MembershipPlansPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin_membership_plans'], queryFn: () => sdk.admin.listMembershipPlans() })
  const items = q.data?.items || []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    monthlyFee: '',
    discountPercent: '',
    recyclableBonusPercent: '',
    isActive: true
  })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const create = useMutation({
    mutationFn: () => sdk.admin.createMembershipPlan(toPayload(form)),
    onSuccess: () => {
      toast.success('Membership plan created')
      setOpen(false)
      setForm({ name: '', description: '', monthlyFee: '', discountPercent: '', recyclableBonusPercent: '', isActive: true })
      qc.invalidateQueries({ queryKey: ['admin_membership_plans'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const update = useMutation({
    mutationFn: () => sdk.admin.updateMembershipPlan(editing._id || editing.id, toPayload(form)),
    onSuccess: () => {
      toast.success('Membership plan updated')
      setOpen(false)
      setEditing(null)
      setForm({ name: '', description: '', monthlyFee: '', discountPercent: '', recyclableBonusPercent: '', isActive: true })
      qc.invalidateQueries({ queryKey: ['admin_membership_plans'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const deactivate = useMutation({
    mutationFn: (id) => sdk.admin.deactivateMembershipPlan(id),
    onSuccess: () => {
      toast.success('Plan deactivated')
      qc.invalidateQueries({ queryKey: ['admin_membership_plans'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', monthlyFee: '', discountPercent: '', recyclableBonusPercent: '', isActive: true })
    setOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      name: p.name || '',
      description: p.description || '',
      monthlyFee: String(p.monthlyFee ?? ''),
      discountPercent: String(p.discountPercent ?? ''),
      recyclableBonusPercent: String(p.recyclableBonusPercent ?? ''),
      isActive: p.isActive !== false
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Plans"
        subtitle="Optional subscriptions that add invoice discounts and recyclable bonus payouts."
        right={<Button onClick={openCreate}>Create plan</Button>}
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading membership plans...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No membership plans" description="Create a plan to enable citizen subscriptions." action={<Button onClick={openCreate}>Create plan</Button>} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Monthly fee</TH>
              <TH>Invoice discount</TH>
              <TH>Recyclable bonus</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((p) => (
              <TR key={p._id || p.id}>
                <TD>
                  <div className="font-medium">{p.name}</div>
                  {p.description ? <div className="mt-1 text-xs text-muted line-clamp-2">{p.description}</div> : null}
                </TD>
                <TD>Rs. {formatMoney(p.monthlyFee || 0)}</TD>
                <TD>{Number(p.discountPercent || 0)}%</TD>
                <TD>{Number(p.recyclableBonusPercent || 0)}%</TD>
                <TD><Badge variant={p.isActive ? 'success' : 'danger'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></TD>
                <TD className="text-xs text-muted">{formatDateTime(p.createdAt)}</TD>
                <TD className="text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                    <Button
                      variant="danger"
                      disabled={!p.isActive || deactivate.isPending}
                      onClick={() => {
                        if (confirm('Deactivate this plan?')) deactivate.mutate(p._id || p.id)
                      }}
                    >
                      Deactivate
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
          setOpen(v)
          if (!v) setEditing(null)
        }}
        title={editing ? 'Edit membership plan' : 'Create membership plan'}
        description="discountPercent and recyclableBonusPercent must be between 0 and 100."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={create.isPending || update.isPending} onClick={() => (editing ? update.mutate() : create.mutate())}>
              {(create.isPending || update.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., GreenPlus" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short plan description..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Monthly fee</Label>
              <Input value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Discount %</Label>
              <Input value={form.discountPercent} onChange={(e) => set('discountPercent', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Recyclable bonus %</Label>
              <Input value={form.recyclableBonusPercent} onChange={(e) => set('recyclableBonusPercent', e.target.value)} placeholder="0" />
            </div>
          </div>

          <Card>
            <CardContent className="py-4 text-xs text-muted">
              Deactivation is supported (soft disable). Reactivation is not exposed in backend; use DB if needed.
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  )
}
