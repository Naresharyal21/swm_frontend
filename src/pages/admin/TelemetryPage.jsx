import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'

import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

export default function TelemetryPage() {
  const householdsQ = useQuery({ queryKey: ['admin_households_all'], queryFn: () => sdk.admin.listHouseholds({}) })
  const vbsQ = useQuery({ queryKey: ['admin_virtual_bins'], queryFn: () => sdk.admin.listVirtualBins({}) })

  const households = householdsQ.data?.items || []
  const vbs = vbsQ.data?.items || []

  const [filters, setFilters] = useState({
    householdId: '',
    virtualBinId: '',
    status: ''
  })

  const q = useQuery({
    queryKey: ['admin_telemetry_bins', filters.householdId, filters.virtualBinId, filters.status],
    queryFn: () =>
      sdk.admin.listBins({
        ...(filters.householdId ? { householdId: filters.householdId } : {}),
        ...(filters.virtualBinId ? { virtualBinId: filters.virtualBinId } : {})
        // NOTE: backend listBins doesn't filter by status currently; we do client-side filter below
      }),
    refetchInterval: 10000
  })

  const rawItems = q.data?.items || []

  const items = useMemo(() => {
    if (!filters.status.trim()) return rawItems
    const s = filters.status.trim().toLowerCase()
    return rawItems.filter((b) => String(b.status || '').toLowerCase().includes(s))
  }, [rawItems, filters.status])

  const summary = useMemo(() => {
    const total = items.length
    const byStatus = {}
    for (const b of items) {
      const st = b.status || '—'
      byStatus[st] = (byStatus[st] || 0) + 1
    }
    return { total, byStatus }
  }, [items])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telemetry"
        subtitle="Live view of bin records (auto refresh every 10s)."
        right={
          <Button
            variant="outline"
            onClick={() => {
              q.refetch().catch((e) => toast.error(pickErrorMessage(e)))
            }}
          >
            Refresh now
          </Button>
        }
      />

      <Card>
        <CardContent className="py-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Household</Label>
              <Select value={filters.householdId} onChange={(e) => setFilters((p) => ({ ...p, householdId: e.target.value }))}>
                <option value="">All</option>
                {households.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.address || h._id}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Virtual bin</Label>
              <Select value={filters.virtualBinId} onChange={(e) => setFilters((p) => ({ ...p, virtualBinId: e.target.value }))}>
                <option value="">All</option>
                {vbs.map((vb) => (
                  <option key={vb._id} value={vb._id}>
                    {vb.name || vb._id}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Status contains</Label>
              <Input value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} placeholder="e.g., ACTIVE" />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="ghost" onClick={() => setFilters({ householdId: '', virtualBinId: '', status: '' })}>
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted">
            {q.isFetching ? 'Refreshing…' : 'Idle'} • Total: {summary.total}
          </div>
        </CardContent>
      </Card>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(summary.byStatus).map(([k, v]) => (
          <Badge key={k} variant={k === '—' ? 'warning' : 'success'}>
            {k}: {v}
          </Badge>
        ))}
      </div>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading telemetry...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No telemetry records" description="No bins matched the current filters." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Bin</TH>
              <TH>Status</TH>
              <TH>Household</TH>
              <TH>Virtual Bin</TH>
              <TH>Location</TH>
              <TH>Updated</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((b) => {
              const coords = b?.location?.coordinates || []
              const hh = households.find((h) => h._id === b.householdId)
              const vb = vbs.find((x) => x._id === b.virtualBinId)

              return (
                <TR key={b._id || b.id}>
                  <TD className="font-medium">{b.binId || b._id}</TD>
                  <TD>
                    <Badge variant={b.status ? 'success' : 'warning'}>{b.status || '—'}</Badge>
                  </TD>
                  <TD className="text-sm">{hh?.address || b.householdId || <span className="text-muted">—</span>}</TD>
                  <TD className="text-sm">{vb?.name || (b.virtualBinId ? b.virtualBinId : <span className="text-muted">—</span>)}</TD>
                  <TD className="text-xs text-muted">{coords?.length === 2 ? `${coords[0]}, ${coords[1]}` : '—'}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(b.updatedAt || b.createdAt)}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}
