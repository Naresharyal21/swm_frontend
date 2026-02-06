import React from 'react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime, formatMoney } from '../../lib/utils'

export default function WalletPage() {
  const q = useQuery({ queryKey: ['citizen_wallet'], queryFn: () => sdk.citizen.wallet() })
  const tx = q.data?.transactions || []
  const balance = q.data?.balance || 0

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet" subtitle="Track credits earned from rewards and credits applied to invoices." />

      <Card>
        <CardContent className="py-8">
          <div className="text-sm text-muted">Current balance</div>
          <div className="mt-2 text-3xl font-semibold">Rs. {formatMoney(balance)}</div>
          <div className="mt-2 text-xs text-muted">Wallet credits are applied automatically during invoice generation.</div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading wallet...</div>
      ) : tx.length === 0 ? (
        <EmptyState title="No transactions" description="Earn credits by submitting recyclables or approved reward claims." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Type</TH>
              <TH>Amount</TH>
              <TH>Reason</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <tbody>
            {tx.map((t) => (
              <TR key={t._id || t.id}>
                <TD><Badge variant={t.type === 'CREDIT' ? 'success' : 'warning'}>{t.type}</Badge></TD>
                <TD className="font-semibold">{t.type === 'CREDIT' ? '+' : '-'} Rs. {formatMoney(t.amount)}</TD>
                <TD className="text-sm">{t.reason || <span className="text-muted">—</span>}</TD>
                <TD className="text-xs text-muted">{formatDateTime(t.createdAt)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
