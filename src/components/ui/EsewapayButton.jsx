// src/pages/citizen/BillingPlansPage.jsx
import React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
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
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="h-auto px-3 py-2"
      title={disabled ? 'Not available for this plan' : ''}
    >
      <div className="flex flex-col items-center justify-center gap-1 leading-tight">
        <img
          src="/esewalogo.jpg"
          alt="eSewa"
          className="h-7 w-auto object-contain"
          draggable={false}
        />
        <div className="text-[11px] font-semibold">
          {loading ? 'Starting…' : label}
        </div>
      </div>
    </Button>
  )
}

export default function BillingPlansPage() {
  const q = useQuery({
    queryKey: ['citizen_billing_plans'],
    queryFn: () => sdk.citizen.listBillingPlans()
  })
  const items = q.data?.items || []

  // only the clicked button shows loading
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Plans"
        subtitle="Pay Monthly Plan / Daily Plan / Bulky Plan separately via eSewa."
      />

      <Card>
        <CardContent className="py-5 text-xs text-muted">
          To change your plan, go to <span className="font-semibold">Citizen → Household Settings</span> and update your
          plan using your Household ID.
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading plans...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No plans available" description="Ask admin to create billing plans." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Mode</TH>
              <TH>Monthly fee</TH>
              <TH>Daily pickup fee</TH>
              <TH>Bulky override</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>

          <tbody>
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
                <TR key={id}>
                  <TD className="font-medium">{p.name}</TD>

                  <TD>
                    <Badge variant={p.billingMode === 'MONTHLY' ? 'success' : 'warning'}>
                      {p.billingMode}
                    </Badge>
                  </TD>

                  <TD>Rs. {formatMoney(monthlyFee)}</TD>
                  <TD>Rs. {formatMoney(dailyFee)}</TD>

                  <TD className="text-sm">
                    {p.bulkyDailyChargeOverride == null ? <span className="text-muted">—</span> : `Rs. ${formatMoney(bulkyFee)}`}
                  </TD>

                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <EsewaPayButton
                        disabled={disabledBase || !canMonthly}
                        loading={isMonthlyPending}
                        label="Pay Monthly Plan"
                        onClick={() => handlePay(id, 'MONTHLY')}
                      />

                      <EsewaPayButton
                        disabled={disabledBase || !canDaily}
                        loading={isDailyPending}
                        label="Pay Daily Plan"
                        onClick={() => handlePay(id, 'DAILY')}
                      />

                      <EsewaPayButton
                        disabled={disabledBase || !canBulky}
                        loading={isBulkyPending}
                        label="Pay Bulky Plan"
                        onClick={() => handlePay(id, 'BULKY')}
                      />
                    </div>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}
