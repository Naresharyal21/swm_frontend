import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatMoney, pickErrorMessage } from '../../lib/utils'

function invVariant(status) {
  if (status === 'PAID') return 'success'
  if (status === 'ISSUED') return 'warning'
  return 'default'
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['citizen_invoices'], queryFn: () => sdk.citizen.listInvoices() })
  const items = q.data?.items || []

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(null)
  const [provider, setProvider] = useState('MOCK')
  const [intent, setIntent] = useState(null)

  const pay = useMutation({
    mutationFn: () => sdk.citizen.payInvoice(active._id || active.id, { provider }),
    onSuccess: (res) => {
      setIntent(res?.intent || res)
      toast.success('Payment intent created')
      qc.invalidateQueries({ queryKey: ['citizen_invoices'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openPay(inv) {
    setActive(inv)
    setIntent(null)
    setProvider('MOCK')
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="View monthly invoices and initiate payment." />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Payment providers</div>
          <div className="text-sm text-muted">Backend supports MOCK (default) and optional Khalti depending on configuration.</div>
        </CardHeader>
        <CardContent className="text-xs text-muted">
          Invoice generation is done by Ops → Generate Billing.
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading invoices...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No invoices" description="Invoices will appear after monthly generation by supervisor/admin." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Month</TH>
              <TH>Status</TH>
              <TH>Total</TH>
              <TH>Credits applied</TH>
              <TH>Amount due</TH>
              <TH className="text-right">Action</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((inv) => (
              <TR key={inv._id || inv.id}>
                <TD className="font-medium">{inv.month}</TD>
                <TD><Badge variant={invVariant(inv.status)}>{inv.status}</Badge></TD>
                <TD>Rs. {formatMoney(inv.total)}</TD>
                <TD>Rs. {formatMoney(inv.creditsApplied)}</TD>
                <TD className="font-semibold">Rs. {formatMoney(inv.amountDue)}</TD>
                <TD className="text-right">
                  {inv.status === 'PAID' || Number(inv.amountDue || 0) <= 0 ? (
                    <span className="text-xs text-muted">—</span>
                  ) : (
                    <Button variant="outline" onClick={() => openPay(inv)}>Pay</Button>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Pay invoice"
        description="Creates a payment intent. Completion depends on configured provider."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button disabled={pay.isPending} onClick={() => pay.mutate()}>
              {pay.isPending ? 'Creating...' : 'Create intent'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
            <div className="font-semibold">Invoice: {active?._id || active?.id}</div>
            <div className="mt-1 text-xs text-muted">Month: {active?.month}</div>
            <div className="mt-2 text-sm">Amount due: <span className="font-semibold">Rs. {formatMoney(active?.amountDue)}</span></div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted">Provider</div>
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="MOCK">MOCK</option>
              <option value="KHALTI">KHALTI</option>
            </Select>
          </div>

          {intent ? (
            <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
              <div className="font-semibold">Payment intent created</div>
              <pre className="mt-2 max-h-64 overflow-auto text-xs text-muted">{JSON.stringify(intent, null, 2)}</pre>
            </div>
          ) : (
            <div className="text-xs text-muted">After creating the intent, complete payment according to the provider response.</div>
          )}
        </div>
      </Modal>
    </div>
  )
}
