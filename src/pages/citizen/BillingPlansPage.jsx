// src/pages/citizen/BillingPlansPage.jsx
import React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'

import { sdk } from '../../lib/sdk'
import { formatMoney, pickErrorMessage } from '../../lib/utils'
import { postForm } from '../../lib/postForm'

function startEsewaPayment(data) {
  const { formUrl, fields } = data || {}
  if (!formUrl || !fields) {
    toast.error('Invalid eSewa initiate response')
    return
  }
  if (fields.transaction_uuid) {
    localStorage.setItem('last_esewa_tx_uuid', fields.transaction_uuid)
  }
  postForm(formUrl, fields)
}

function EsewaPayButton({ disabled, loading, onClick, label }) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="h-auto w-full px-3 py-3"
      title={disabled ? 'Not available for this plan' : ''}
    >
      <div className="flex flex-col items-center justify-center gap-1 leading-tight">
      
        <div className="text-[11px] font-semibold">{loading ? 'Starting…' : label}</div>
      </div>
    </Button>
  )
}

function PayTile({ title, subtitle, price, badge, disabled, loading, onPay }) {
  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? <div className="text-xs text-muted mt-1">{subtitle}</div> : null}
          </div>
          {badge ? <Badge variant={badge.variant}>{badge.text}</Badge> : null}
        </div>

        <div className="rounded-xl border border-app bg-black/5 dark:bg-white/5 px-3 py-2">
          <div className="text-[11px] text-muted">Price</div>
          <div className="text-base font-semibold">Rs. {formatMoney(price || 0)}</div>
        </div>

        <EsewaPayButton
          disabled={disabled}
          loading={loading}
          label={title}
          onClick={onPay}
        />
      </CardContent>
    </Card>
  )
}

export default function BillingPlansPage() {
  const q = useQuery({
    queryKey: ['citizen_billing_plans'],
    queryFn: () => sdk.citizen.listBillingPlans()
  })
  const items = q.data?.items || []

  const [pendingKey, setPendingKey] = React.useState('')

  const pay = useMutation({
    mutationFn: ({ planId, kind }) => sdk.citizen.initiateEsewa({ planId, kind }),
    onSuccess: (data) => {
      startEsewaPayment(data)
      setPendingKey('')
    },
    onError: (e) => {
      toast.error(pickErrorMessage(e))
      setPendingKey('')
    }
  })

  const handlePay = (planId, kind) => {
    const key = `${planId}:${kind}`
    setPendingKey(key)
    pay.mutate({ planId, kind })
  }

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing Plans" subtitle="Choose what you want to pay via eSewa." />
        <div className="text-sm text-muted">Loading plans...</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing Plans" subtitle="Choose what you want to pay via eSewa." />
        <EmptyState title="No plans available" description="Ask admin to create billing plans." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing Plans" subtitle="Each fee has its own payment tile (like other websites)." />

      <Card>
        <CardContent className="py-5 text-xs text-muted">
          To change your plan, go to <span className="font-semibold">Citizen → Household Settings</span> and update your
          plan using your Household ID.
        </CardContent>
      </Card>

      {/* Plans list */}
      <div className="space-y-8">
        {items.map((p) => {
          const id = p._id || p.id

          const monthlyFee = Number(p.monthlyFee || 0)
          const dailyFee = Number(p.dailyPickupFee || 0)
          const bulkyFee = p.bulkyDailyChargeOverride == null ? 0 : Number(p.bulkyDailyChargeOverride || 0)

          const canMonthly = monthlyFee > 0
          const canDaily = dailyFee > 0
          const canBulky = bulkyFee > 0

          const disabledBase = pay.isPending || p.isActive === false

          const isMonthlyPending = pendingKey === `${id}:MONTHLY`
          const isDailyPending = pendingKey === `${id}:DAILY`
          const isBulkyPending = pendingKey === `${id}:BULKY`

          return (
            <Card key={id}>
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{p.name}</div>
                    <div className="mt-1 text-xs text-muted">
                      Pay components separately using eSewa.
                    </div>
                  </div>
                  <Badge variant={p.isActive === false ? 'secondary' : p.billingMode === 'MONTHLY' ? 'success' : 'warning'}>
                    {p.isActive === false ? 'INACTIVE' : p.billingMode}
                  </Badge>
                </div>

                {/* Grid of payment tiles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <PayTile
                    title="Pay Monthly Plan"
                    subtitle="Monthly subscription fee"
                    price={monthlyFee}
                    badge={{ text: 'MONTHLY', variant: 'success' }}
                    disabled={disabledBase || !canMonthly}
                    loading={isMonthlyPending}
                    onPay={() => handlePay(id, 'MONTHLY')}
                  />

                  <PayTile
                    title="Pay Daily Plan"
                    subtitle="Daily pickup fee"
                    price={dailyFee}
                    badge={{ text: 'DAILY', variant: 'warning' }}
                    disabled={disabledBase || !canDaily}
                    loading={isDailyPending}
                    onPay={() => handlePay(id, 'DAILY')}
                  />

                  <PayTile
                    title="Pay Bulky Plan"
                    subtitle="Bulky pickup override"
                    price={bulkyFee}
                    badge={{ text: 'BULKY', variant: 'secondary' }}
                    disabled={disabledBase || !canBulky}
                    loading={isBulkyPending}
                    onPay={() => handlePay(id, 'BULKY')}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
