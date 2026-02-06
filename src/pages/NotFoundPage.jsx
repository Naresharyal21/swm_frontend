import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'

export default function NotFoundPage() {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <div className="text-2xl font-semibold">404</div>
        <div className="mt-2 text-sm text-muted">Page not found.</div>
        <div className="mt-6">
          <Link to="/app">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
