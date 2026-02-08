// src/pages/admin/BillingPlansPage.jsx
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
import { formatDateTime, formatMoney, pickErrorMessage } from '../../lib/utils'

/**
 * ✅ Added ANNUAL (yearly) option for admin plans.
 * NOTE: Your backend Joi schema currently allows only "MONTHLY" and "DAILY_PICKUP".
 * You MUST also update backend to accept "ANNUAL" and store annualFee (or reuse monthlyFee*12).
 */
const MODES = ['MONTHLY', 'ANNUAL', 'DAILY_PICKUP']

export default function BillingPlansPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin_billing_plans'], queryFn: () => sdk.admin.listBillingPlans() })
  const items = q.data?.items || []

  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // ✅ added annualFee
  const [form, setForm] = useState({
    name: '',
    billingMode: 'MONTHLY',
    monthlyFee: '',
    annualFee: '',
    dailyPickupFee: '',
    bulkyDailyChargeOverride: '',
    isActive: true
  })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Name is required')

      const payload = {
        name: form.name.trim(),
        billingMode: form.billingMode,

        // Keep all numeric fields (backend can ignore unknown fields if not in schema,
        // but ideally you will add annualFee to backend model/schema)
        monthlyFee: form.monthlyFee === '' ? 0 : Number(form.monthlyFee),
        annualFee: form.annualFee === '' ? 0 : Number(form.annualFee),
        dailyPickupFee: form.dailyPickupFee === '' ? 0 : Number(form.dailyPickupFee),
        bulkyDailyChargeOverride: form.bulkyDailyChargeOverride === '' ? null : Number(form.bulkyDailyChargeOverride),
        isActive: !!form.isActive
      }

      // ✅ basic frontend validation
      if (payload.billingMode === 'DAILY_PICKUP' && Number(payload.dailyPickupFee || 0) <= 0) {
        throw new Error('Daily pickup fee must be > 0 for DAILY_PICKUP mode')
      }
      if (payload.billingMode === 'ANNUAL' && Number(payload.annualFee || 0) <= 0) {
        throw new Error('Annual fee must be > 0 for ANNUAL mode')
      }

      return sdk.admin.createBillingPlan(payload)
    },
    onSuccess: () => {
      toast.success('Billing plan created')
      setOpen(false)
      setForm({
        name: '',
        billingMode: 'MONTHLY',
        monthlyFee: '',
        annualFee: '',
        dailyPickupFee: '',
        bulkyDailyChargeOverride: '',
        isActive: true
      })
      qc.invalidateQueries({ queryKey: ['admin_billing_plans'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const update = useMutation({
    mutationFn: async () => {
      const id = editing?._id || editing?.id
      if (!id) throw new Error('Missing plan id')
      if (!form.name.trim()) throw new Error('Name is required')

      const payload = {
        name: form.name.trim(),
        billingMode: form.billingMode,
        monthlyFee: form.monthlyFee === '' ? 0 : Number(form.monthlyFee),
        annualFee: form.annualFee === '' ? 0 : Number(form.annualFee),
        dailyPickupFee: form.dailyPickupFee === '' ? 0 : Number(form.dailyPickupFee),
        bulkyDailyChargeOverride: form.bulkyDailyChargeOverride === '' ? null : Number(form.bulkyDailyChargeOverride),
        isActive: !!form.isActive
      }

      if (payload.billingMode === 'DAILY_PICKUP' && Number(payload.dailyPickupFee || 0) <= 0) {
        throw new Error('Daily pickup fee must be > 0 for DAILY_PICKUP mode')
      }
      if (payload.billingMode === 'ANNUAL' && Number(payload.annualFee || 0) <= 0) {
        throw new Error('Annual fee must be > 0 for ANNUAL mode')
      }

      return sdk.admin.updateBillingPlan(id, payload)
    },
    onSuccess: () => {
      toast.success('Billing plan updated')
      setEditOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['admin_billing_plans'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const del = useMutation({
    mutationFn: async (plan) => {
      const id = plan?._id || plan?.id
      if (!id) throw new Error('Missing plan id')
      return sdk.admin.deleteBillingPlan(id)
    },
    onSuccess: () => {
      toast.success('Billing plan deleted')
      qc.invalidateQueries({ queryKey: ['admin_billing_plans'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openEdit(plan) {
    setEditing(plan)
    setForm({
      name: plan?.name || '',
      billingMode: plan?.billingMode || 'MONTHLY',
      monthlyFee: plan?.monthlyFee ?? '',
      annualFee: plan?.annualFee ?? '', // ✅ new
      dailyPickupFee: plan?.dailyPickupFee ?? '',
      bulkyDailyChargeOverride: plan?.bulkyDailyChargeOverride ?? '',
      isActive: plan?.isActive ?? true
    })
    setEditOpen(true)
  }

  const byMode = useMemo(() => {
    const m = { MONTHLY: 0, ANNUAL: 0, DAILY_PICKUP: 0 }
    for (const p of items) m[p.billingMode] = (m[p.billingMode] || 0) + 1
    return m
  }, [items])

  const modeBadgeVariant = (mode) => {
    if (mode === 'MONTHLY') return 'success'
    if (mode === 'ANNUAL') return 'secondary'
    return 'warning'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Plans"
        subtitle="Configure monthly / annual / daily-pickup fee billing."
        right={<Button onClick={() => setOpen(true)}>Create plan</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {MODES.map((m) => (
          <Card key={m}>
            <CardContent className="py-6">
              <div className="text-sm text-muted">{m}</div>
              <div className="mt-2 text-2xl font-semibold">{byMode[m] || 0}</div>
              <div className="mt-1 text-xs text-muted">
                {m === 'MONTHLY'
                  ? 'Flat monthly charge'
                  : m === 'ANNUAL'
                  ? 'Flat yearly charge'
                  : 'Charged only when pickup completed'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading plans...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No billing plans"
          description="Create a billing plan to start invoicing citizens."
          action={<Button onClick={() => setOpen(true)}>Create plan</Button>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Mode</TH>
              <TH>Monthly Fee</TH>
              <TH>Annual Fee</TH>
              <TH>Daily Pickup Fee</TH>
              <TH>Bulky Override</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((p) => (
              <TR key={p._id || p.id}>
                <TD className="font-medium">{p.name}</TD>
                <TD>
                  <Badge variant={modeBadgeVariant(p.billingMode)}>{p.billingMode}</Badge>
                </TD>
                <TD>Rs. {formatMoney(p.monthlyFee || 0)}</TD>
                <TD>Rs. {formatMoney(p.annualFee || 0)}</TD>
                <TD>Rs. {formatMoney(p.dailyPickupFee || 0)}</TD>
                <TD className="text-sm">
                  {p.bulkyDailyChargeOverride == null ? <span className="text-muted">—</span> : `Rs. ${formatMoney(p.bulkyDailyChargeOverride)}`}
                </TD>
                <TD>
                  <Badge variant={p.isActive ? 'success' : 'danger'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </TD>
                <TD className="text-xs text-muted">{formatDateTime(p.createdAt)}</TD>
                <TD className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                    <Button
                      variant="danger"
                      disabled={del.isPending}
                      onClick={() => {
                        if (confirm(`Delete billing plan "${p.name}"?`)) del.mutate(p)
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

      {/* EDIT MODAL */}
      <Modal
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v)
          if (!v) setEditing(null)
        }}
        title="Edit billing plan"
        description="Update billing plan fields (requires backend PUT/DELETE support)."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={update.isPending} onClick={() => update.mutate()}>
              {update.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., Standard Monthly" />
          </div>

          <div>
            <Label>Billing mode *</Label>
            <Select value={form.billingMode} onChange={(e) => set('billingMode', e.target.value)}>
              {MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>

          {form.billingMode === 'MONTHLY' ? (
            <div>
              <Label>Monthly fee</Label>
              <Input value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} placeholder="e.g., 250" />
            </div>
          ) : form.billingMode === 'ANNUAL' ? (
            <div>
              <Label>Annual fee *</Label>
              <Input value={form.annualFee} onChange={(e) => set('annualFee', e.target.value)} placeholder="e.g., 2500" />
              <div className="mt-1 text-xs text-muted">This is the yearly subscription amount.</div>
            </div>
          ) : (
            <div>
              <Label>Daily pickup fee *</Label>
              <Input value={form.dailyPickupFee} onChange={(e) => set('dailyPickupFee', e.target.value)} placeholder="e.g., 10" />
            </div>
          )}

          <div>
            <Label>Bulky daily charge override (optional)</Label>
            <Input value={form.bulkyDailyChargeOverride} onChange={(e) => set('bulkyDailyChargeOverride', e.target.value)} placeholder="e.g., 50" />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={String(!!form.isActive)} onChange={(e) => set('isActive', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
        </div>
      </Modal>

      {/* CREATE MODAL */}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create billing plan"
        description="If DAILY_PICKUP, dailyPickupFee must be > 0. If ANNUAL, annualFee must be > 0."
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
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., Standard Monthly" />
          </div>

          <div>
            <Label>Billing mode *</Label>
            <Select value={form.billingMode} onChange={(e) => set('billingMode', e.target.value)}>
              {MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>

          {form.billingMode === 'MONTHLY' ? (
            <div>
              <Label>Monthly fee</Label>
              <Input value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} placeholder="e.g., 250" />
            </div>
          ) : form.billingMode === 'ANNUAL' ? (
            <div>
              <Label>Annual fee *</Label>
              <Input value={form.annualFee} onChange={(e) => set('annualFee', e.target.value)} placeholder="e.g., 2500" />
              <div className="mt-1 text-xs text-muted">This is the yearly subscription amount.</div>
            </div>
          ) : (
            <div>
              <Label>Daily pickup fee *</Label>
              <Input value={form.dailyPickupFee} onChange={(e) => set('dailyPickupFee', e.target.value)} placeholder="e.g., 10" />
              <div className="mt-1 text-xs text-muted">Charged only for completed ROUTINE_PICKUP tasks in the billing month.</div>
            </div>
          )}

          <div>
            <Label>Bulky daily charge override (optional)</Label>
            <Input value={form.bulkyDailyChargeOverride} onChange={(e) => set('bulkyDailyChargeOverride', e.target.value)} placeholder="e.g., 50" />
          </div>

          <Card>
            <CardContent className="py-4 text-xs text-muted">
              Tip: If your backend does not yet implement billing-plan update/delete, only create will work.
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  )
}
