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

export default function RewardRatesPage() {
  const qc = useQueryClient()

  const q = useQuery({ queryKey: ['admin_reward_rates'], queryFn: () => sdk.admin.listRewardRates() })
  const items = q.data?.items || []

  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    category: '',
    ratePerUnit: '',
    isActive: true
  })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.category.trim()) throw new Error('Category is required')
      const rate = Number(form.ratePerUnit)
      if (!Number.isFinite(rate)) throw new Error('ratePerUnit must be a number')

      const payload = {
        category: form.category.trim(),
        ratePerUnit: rate,
        isActive: !!form.isActive
      }

      return sdk.admin.createRewardRate(payload)
    },
    onSuccess: () => {
      toast.success('Reward rate created')
      setOpen(false)
      setForm({ category: '', ratePerUnit: '', isActive: true })
      qc.invalidateQueries({ queryKey: ['admin_reward_rates'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const update = useMutation({
    mutationFn: async () => {
      const id = editing?._id || editing?.id
      if (!id) throw new Error('Missing reward rate id')

      const patch = {}
      if (form.category.trim()) patch.category = form.category.trim()
      if (form.ratePerUnit !== '') {
        const rate = Number(form.ratePerUnit)
        if (!Number.isFinite(rate)) throw new Error('ratePerUnit must be a number')
        patch.ratePerUnit = rate
      }
      if (form.isActive !== undefined) patch.isActive = !!form.isActive

      if (Object.keys(patch).length === 0) throw new Error('Nothing to update')
      return sdk.admin.updateRewardRate(id, patch)
    },
    onSuccess: () => {
      toast.success('Reward rate updated')
      setEditOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['admin_reward_rates'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const del = useMutation({
    mutationFn: async (rate) => {
      const id = rate?._id || rate?.id
      if (!id) throw new Error('Missing reward rate id')
      return sdk.admin.deleteRewardRate(id)
    },
    onSuccess: () => {
      toast.success('Reward rate deleted')
      qc.invalidateQueries({ queryKey: ['admin_reward_rates'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openEdit(rate) {
    setEditing(rate)
    setForm({
      category: rate?.category || '',
      ratePerUnit: rate?.ratePerUnit ?? '',
      isActive: rate?.isActive ?? true
    })
    setEditOpen(true)
  }

  const stats = useMemo(() => {
    const active = items.filter((x) => x.isActive !== false).length
    const inactive = items.length - active
    return { active, inactive }
  }, [items])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward Rates"
        subtitle="Configure reward earning rates per recyclable category."
        right={<Button onClick={() => setOpen(true)}>Create reward rate</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-6">
            <div className="text-sm text-muted">Active</div>
            <div className="mt-2 text-2xl font-semibold">{stats.active}</div>
            <div className="mt-1 text-xs text-muted">Used for calculating wallet rewards</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-sm text-muted">Inactive</div>
            <div className="mt-2 text-2xl font-semibold">{stats.inactive}</div>
            <div className="mt-1 text-xs text-muted">Not applied to new claims</div>
          </CardContent>
        </Card>
      </div>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading reward rates...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No reward rates"
          description="Create reward rates so citizens can earn from recyclables."
          action={<Button onClick={() => setOpen(true)}>Create reward rate</Button>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Category</TH>
              <TH>Rate/Unit</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((r) => (
              <TR key={r._id || r.id}>
                <TD className="font-medium">{r.category}</TD>
                <TD>{r.ratePerUnit}</TD>
                <TD>
                  <Badge variant={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
                </TD>
                <TD className="text-xs text-muted">{formatDateTime(r.createdAt)}</TD>
                <TD className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      disabled={del.isPending}
                      onClick={() => {
                        if (confirm(`Delete reward rate "${r.category}"?`)) del.mutate(r)
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
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v)
          if (!v) setEditing(null)
        }}
        title="Edit reward rate"
        description="Update reward category, rate per unit, and active status."
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
        <RewardRateForm form={form} set={set} />
      </Modal>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create reward rate"
        description="Category should be unique."
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
        <RewardRateForm form={form} set={set} />
      </Modal>
    </div>
  )
}

function RewardRateForm({ form, set }) {
  return (
    <div className="grid gap-4">
      <div>
        <Label>Category *</Label>
        <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g., PLASTIC" />
        <div className="mt-1 text-xs text-muted">Must be unique (backend enforces uniqueness).</div>
      </div>

      <div>
        <Label>Rate per unit *</Label>
        <Input value={form.ratePerUnit} onChange={(e) => set('ratePerUnit', e.target.value)} placeholder="e.g., 5" />
      </div>

      <div>
        <Label>Status</Label>
        <Select value={String(!!form.isActive)} onChange={(e) => set('isActive', e.target.value === 'true')}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>
    </div>
  )
}
