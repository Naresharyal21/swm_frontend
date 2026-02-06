import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { sdk } from '../../lib/sdk'
import { pickErrorMessage } from '../../lib/utils'

export default function BillingPendingPage() {
  const nav = useNavigate()

  const txUuid = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('last_esewa_tx_uuid') || ''
  }, [])

  const [checking, setChecking] = useState(false)
  const [lastStatus, setLastStatus] = useState(null)

  async function checkOnce() {
    if (!txUuid) return
    setChecking(true)
    try {
      // You already have: GET /api/payments/esewa/status/:txUuid (auth)
      // Note: your axios interceptor should attach Authorization: Bearer <token>
      const res = await sdk.citizen.esewaStatus(txUuid)

      // res shape from your controller: { tx, status }
      const gatewayStatus = res?.status?.status || res?.tx?.status || null
      setLastStatus(gatewayStatus)

      if (gatewayStatus === 'COMPLETE') {
        nav('/billing/success', { replace: true })
        return
      }

      // Common non-success end states (keep a broad net)
      const failedStates = new Set(['FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED'])
      if (failedStates.has(String(gatewayStatus || '').toUpperCase())) {
        nav('/billing/failed', { replace: true })
        return
      }
    } catch (e) {
      // Don’t spam toast every poll; show once on manual retry
    } finally {
      setChecking(false)
    }
  }

  // Auto-poll every 3s
  useEffect(() => {
    if (!txUuid) return

    // first check immediately
    checkOnce()

    const t = setInterval(() => {
      checkOnce()
    }, 3000)

    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txUuid])

  async function manualRetry() {
    try {
      await checkOnce()
      toast.success('Checked payment status')
    } catch (e) {
      toast.error(pickErrorMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Pending" subtitle="We are waiting for confirmation from eSewa." />

      <Card>
        <CardContent className="py-6 space-y-4">
          <div className="text-sm text-muted">
            If you just paid on eSewa, confirmation can take a short time. This page will auto-check the status.
          </div>

          {!txUuid ? (
            <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
              <div className="font-semibold">No transaction found</div>
              <div className="mt-1 text-xs text-muted">
                We couldn’t find <code>last_esewa_tx_uuid</code> in localStorage. Start payment again from Billing Plans.
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-app bg-black/5 p-4 text-xs dark:bg-white/5 space-y-2">
              <div>
                <div className="font-semibold">Transaction UUID</div>
                <div className="mt-1 break-all text-muted">{txUuid}</div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Last status</div>
                  <div className="mt-1 text-muted">{lastStatus || '—'}</div>
                </div>

                <Button variant="outline" disabled={checking} onClick={manualRetry}>
                  {checking ? 'Checking...' : 'Retry now'}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Link to="/app/citizen/billing-plans">
              <Button>Back to Billing Plans</Button>
            </Link>
            <Link to="/app">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
