import React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

export default function BillingFailedPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payment Failed" subtitle="The payment did not complete." />

      <Card>
        <CardContent className="py-6 space-y-4">
          <div className="text-sm text-muted">
            Possible reasons: user cancelled, login error, timeout, or gateway verification failed.
          </div>

          <div className="flex gap-2">
            <Link to="/app/citizen/billing-plans">
              <Button>Try Again</Button>
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
