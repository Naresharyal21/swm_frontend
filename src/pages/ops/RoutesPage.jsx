import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage, toPoint } from '../../lib/utils'

function routeVariant(status) {
  if (status === 'PUBLISHED') return 'success'
  return 'warning'
}

export default function RoutesPage() {
  const qc = useQueryClient()
  const [date, setDate] = useState('')

  const routesQ = useQuery({
    queryKey: ['ops_routes', date],
    queryFn: () => sdk.ops.listRoutes(date ? { date } : undefined)
  })
  const items = routesQ.data?.items || []

  const vehiclesQ = useQuery({ queryKey: ['admin_vehicles_all'], queryFn: () => sdk.admin.listVehicles() })
  const vehicles = vehiclesQ.data?.items || []
  const vehicleById = useMemo(() => Object.fromEntries(vehicles.map((v) => [String(v._id || v.id), v])), [vehicles])

  const gen = useMutation({
    mutationFn: () => sdk.ops.generateRoutes({ date: date || undefined }),
    onSuccess: (res) => {
      toast.success(`Routes generated for ${res?.date}`)
      qc.invalidateQueries({ queryKey: ['ops_routes'] })
      qc.invalidateQueries({ queryKey: ['ops_tasks'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const publish = useMutation({
    mutationFn: (id) => sdk.ops.publishRoute(id),
    onSuccess: () => {
      toast.success('Route published')
      qc.invalidateQueries({ queryKey: ['ops_routes'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  // Vehicle location update (testing)
  const [locForm, setLocForm] = useState({ vehicleId: '', lat: '', lng: '' })
  const postLoc = useMutation({
    mutationFn: () => sdk.ops.postVehicleLocation(locForm.vehicleId, { coordinates: [Number(locForm.lng), Number(locForm.lat)], source: 'MANUAL' }),
    onSuccess: (res) => {
      toast.success(`Location updated. Alerts: ${res?.alertsSent ?? 0}`)
      setLocForm({ vehicleId: '', lat: '', lng: '' })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const rows = useMemo(() => items.map((r) => ({
    id: r._id || r.id,
    date: r.date,
    vehicleId: r.vehicleId,
    vehicleType: r.vehicleType,
    status: r.status,
    version: r.version,
    createdAt: r.createdAt,
    publishedAt: r.publishedAt
  })), [items])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routes"
        subtitle="Generate draft routes from unassigned tasks and publish them for crew."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Filter date (YYYY-MM-DD)" className="w-[220px]" />
            <Button variant="secondary" disabled={gen.isPending} onClick={() => gen.mutate()}>
              {gen.isPending ? 'Generating...' : 'Generate routes'}
            </Button>
          </div>
        }
      />

      {routesQ.isLoading ? (
        <div className="text-sm text-muted">Loading routes...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No routes" description="Generate routes to create DRAFT routes per vehicle." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Vehicle</TH>
              <TH>Type</TH>
              <TH>Status</TH>
              <TH>Version</TH>
              <TH>Created</TH>
              <TH>Published</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((r) => {
              const v = vehicleById[String(r.vehicleId)]
              const canPublish = r.status !== 'PUBLISHED'
              return (
                <TR key={r.id}>
                  <TD className="font-medium">{r.date}</TD>
                  <TD>{v?.code || <span className="text-muted">{String(r.vehicleId)}</span>}</TD>
                  <TD>{r.vehicleType}</TD>
                  <TD><Badge variant={routeVariant(r.status)}>{r.status}</Badge></TD>
                  <TD>{r.version}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(r.createdAt)}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(r.publishedAt)}</TD>
                  <TD className="text-right">
                    {canPublish ? (
                      <Button variant="outline" disabled={publish.isPending} onClick={() => publish.mutate(r.id)}>Publish</Button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Vehicle location update (testing)</div>
          <div className="text-sm text-muted">Post a manual vehicle location to trigger geo-fence alerts (if enabled).</div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>Vehicle</Label>
              <Select value={locForm.vehicleId} onChange={(e) => setLocForm((p) => ({ ...p, vehicleId: e.target.value }))}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v._id || v.id} value={v._id || v.id}>
                    {v.code} ({v.vehicleType})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Latitude</Label>
              <Input value={locForm.lat} onChange={(e) => setLocForm((p) => ({ ...p, lat: e.target.value }))} placeholder="27.7" />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input value={locForm.lng} onChange={(e) => setLocForm((p) => ({ ...p, lng: e.target.value }))} placeholder="85.3" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="secondary"
              disabled={!locForm.vehicleId || postLoc.isPending}
              onClick={() => postLoc.mutate()}
            >
              {postLoc.isPending ? 'Posting...' : 'Post location'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5 text-xs text-muted">
          Tip: If route generation creates no routes, ensure vehicles exist and tasks are in CREATED status with requiredVehicle TRUCK/SCOOTER.
        </CardContent>
      </Card>
    </div>
  )
}
