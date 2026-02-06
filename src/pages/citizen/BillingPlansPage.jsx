import React from 'react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatMoney } from '../../lib/utils'

export default function CitizenBillingPlansPage() {
  const q = useQuery({ queryKey: ['citizen_billing_plans'], queryFn: () => sdk.citizen.listBillingPlans() })
  const items = q.data?.items || []

  return (
    <div className="space-y-6">
      <PageHeader title="Billing Plans" subtitle="Available plans you can apply to your household." />

      <Card>
        <CardContent className="py-5 text-xs text-muted">
          To change your plan, go to <span className="font-semibold">Citizen → Household Settings</span> and update your plan using your Household ID.
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
            </tr>
          </THead>
          <tbody>
            {items.map((p) => (
              <TR key={p._id || p.id}>
                <TD className="font-medium">{p.name}</TD>
                <TD><Badge variant={p.billingMode === 'MONTHLY' ? 'success' : 'warning'}>{p.billingMode}</Badge></TD>
                <TD>Rs. {formatMoney(p.monthlyFee || 0)}</TD>
                <TD>Rs. {formatMoney(p.dailyPickupFee || 0)}</TD>
                <TD className="text-sm">{p.bulkyDailyChargeOverride == null ? <span className="text-muted">—</span> : `Rs. ${formatMoney(p.bulkyDailyChargeOverride)}`}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
