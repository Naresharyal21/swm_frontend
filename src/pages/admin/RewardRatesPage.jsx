import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime, formatMoney, pickErrorMessage } from '../../lib/utils'

export default function RewardRatesPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin_reward_rates'], queryFn: () => sdk.admin.listRewardRates() })
  const items = q.data?.items || []

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ category: '', ratePerUnit: '', isActive: true })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.category.trim()) throw new Error('Category is required')
      const payload = { category: form.category.trim().toUpperCase(), ratePerUnit: Number(form.ratePerUnit || 0), isActive: !!form.isActive }
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward Rates"
        subtitle="Set payout rates for recyclable categories (used when citizens claim rewards)."
        right={<Button onClick={() => setOpen(true)}>Create rate</Button>}
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading reward rates...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No reward rates" description="Create categories like PLASTIC/GLASS/PAPER." action={<Button onClick={() => setOpen(true)}>Create rate</Button>} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Category</TH>
              <TH>Rate per unit</TH>
              <TH>Status</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((r) => (
              <TR key={r._id || r.id}>
                <TD className="font-medium">{r.category}</TD>
                <TD>Rs. {formatMoney(r.ratePerUnit)}</TD>
                <TD><Badge variant={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Inactive'}</Badge></TD>
                <TD className="text-xs text-muted">{formatDateTime(r.createdAt)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create reward rate"
        description="Category must be unique."
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
            <Label>Category *</Label>
            <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g., PLASTIC" />
          </div>
          <div>
            <Label>Rate per unit *</Label>
            <Input value={form.ratePerUnit} onChange={(e) => set('ratePerUnit', e.target.value)} placeholder="e.g., 10" />
            <div className="mt-1 text-xs text-muted">Interpretation depends on your implementation (per kg / per piece). Keep consistent in client instructions.</div>
          </div>
          <Card>
            <CardContent className="py-4 text-xs text-muted">
              Note: Update/delete endpoints for reward rates are not present in the backend yet.
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  )
}
