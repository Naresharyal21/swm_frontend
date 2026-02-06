import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { sdk } from '../../lib/sdk'
import { formatMoney, pickErrorMessage } from '../../lib/utils'

export default function BillingGeneratePage() {
  const [month, setMonth] = useState('')
  const [result, setResult] = useState(null)

  const gen = useMutation({
    mutationFn: () => sdk.ops.generateInvoices({ month: month || undefined }),
    onSuccess: (res) => {
      setResult(res)
      toast.success(`Generated invoices for ${res?.month}`)
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const rows = result?.results || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Billing"
        subtitle="Generate monthly invoices for citizens (uses billing plans + membership discounts)."
        right={
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label>Month (YYYY-MM)</Label>
              <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="e.g., 2026-01" className="w-[180px]" />
            </div>
            <Button variant="secondary" disabled={gen.isPending} onClick={() => gen.mutate()}>
              {gen.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">What gets billed?</div>
          <div className="text-sm text-muted">MONTHLY plans add one fee; DAILY_PICKUP adds fees only for completed routine pickups.</div>
        </CardHeader>
        <CardContent className="text-xs text-muted">
          Bulky pickups add a daily charge when the bulky task is completed with proof. Wallet credits are auto-applied.
        </CardContent>
      </Card>

      {!result ? (
        <EmptyState title="No results yet" description="Run generation to create invoices for the selected month." />
      ) : rows.length === 0 ? (
        <EmptyState title="No invoices generated" description="Invoices may already exist for this month, or no eligible households were found." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>User</TH>
              <TH>Invoice</TH>
              <TH>Total</TH>
              <TH>Credits applied</TH>
              <TH>Amount due</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((r) => (
              <TR key={r.invoiceId}>
                <TD className="text-xs text-muted">{r.userId}</TD>
                <TD className="font-medium">{r.invoiceId}</TD>
                <TD>Rs. {formatMoney(r.total)}</TD>
                <TD>Rs. {formatMoney(r.creditsApplied)}</TD>
                <TD className="font-semibold">Rs. {formatMoney(r.amountDue)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
