import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime } from '../../lib/utils'

export default function TodayRoutePage() {
  const [date, setDate] = useState('')

  const q = useQuery({
    queryKey: ['crew_today_route', date],
    queryFn: () => sdk.crew.todayRoute(date ? { date } : undefined)
  })

  const routes = q.data?.routes || []
  const effectiveDate = q.data?.date || date || ''

  const stopsCount = useMemo(() => routes.reduce((s, r) => s + (r.stops?.length || 0), 0), [routes])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Route"
        subtitle="Published routes assigned to your vehicle(s)."
        right={
          <div className="flex items-end gap-2">
            <div>
              <Label>Date (YYYY-MM-DD)</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="leave empty for today" className="w-[220px]" />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <div className="text-sm text-muted">Date</div>
            <div className="mt-2 text-2xl font-semibold">{effectiveDate || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-sm text-muted">Routes</div>
            <div className="mt-2 text-2xl font-semibold">{routes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-sm text-muted">Stops</div>
            <div className="mt-2 text-2xl font-semibold">{stopsCount}</div>
          </CardContent>
        </Card>
      </div>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading routes...</div>
      ) : routes.length === 0 ? (
        <EmptyState title="No published routes" description="Ask your supervisor to publish routes for your assigned vehicle." />
      ) : (
        <div className="space-y-4">
          {routes.map((r) => (
            <Card key={r._id || r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold">Vehicle: {String(r.vehicleId).slice(-6)}</div>
                    <div className="text-sm text-muted">Route: {r.date} • Version {r.version}</div>
                  </div>
                  <Badge variant="success">{r.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {(r.stops || []).length === 0 ? (
                  <div className="text-sm text-muted">No stops</div>
                ) : (
                  <Table className="rounded-xl">
                    <THead>
                      <tr>
                        <TH>#</TH>
                        <TH>Location</TH>
                        <TH>Tasks</TH>
                      </tr>
                    </THead>
                    <tbody>
                      {(r.stops || []).map((s) => {
                        const coords = s.location?.coordinates || []
                        return (
                          <TR key={s._id || s.id || s.order}>
                            <TD className="font-medium">{s.order}</TD>
                            <TD className="text-xs text-muted">{coords.length ? `${coords[1]}, ${coords[0]}` : '—'}</TD>
                            <TD className="text-xs">{(s.taskIds || []).length}</TD>
                          </TR>
                        )
                      })}
                    </tbody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="py-5 text-xs text-muted">
          Tip: If you see no routes, make sure your user is assigned to a vehicle (Admin → Vehicles), and the route is PUBLISHED (Ops → Routes).
        </CardContent>
      </Card>
    </div>
  )
}
