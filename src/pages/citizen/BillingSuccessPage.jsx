import React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

export default function BillingSuccessPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payment Successful" subtitle="Your subscription/payment was completed." />

      <Card>
        <CardContent className="py-6 space-y-4">
          <div className="text-sm text-muted">
            Thank you! If your plan status doesn’t update immediately, refresh after a few seconds.
          </div>

          <div className="flex gap-2">
            <Link to="/app/citizen/billing-plans">
              <Button variant="outline">Back to Billing Plans</Button>
            </Link>
            <Link to="/app/citizen/wallet">
              <Button>Go to Wallet</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
