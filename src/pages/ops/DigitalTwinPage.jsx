import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime, formatPercent, pickErrorMessage } from '../../lib/utils'

function riskVariant(score) {
  const n = Number(score || 0)
  if (n >= 75) return 'danger'
  if (n >= 45) return 'warning'
  return 'success'
}

export default function DigitalTwinPage() {
  const qc = useQueryClient()
  const [zoneId, setZoneId] = useState('')

  const zonesQ = useQuery({ queryKey: ['admin_zones'], queryFn: () => sdk.admin.listZones() })

  const twinsQ = useQuery({
    queryKey: ['dt_virtual_bins', zoneId],
    queryFn: () => sdk.ops.dtListVirtualBins(zoneId ? { zoneId } : undefined),
    retry: 0
  })

  const zones = zonesQ.data?.items || []
  const items = twinsQ.data?.items || []

  const aggregate = useMutation({
    mutationFn: () => sdk.ops.dtAggregate(),
    onSuccess: () => {
      toast.success('Aggregation triggered')
      qc.invalidateQueries({ queryKey: ['dt_virtual_bins'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const errorNote = useMemo(() => {
    const msg = twinsQ.error?.response?.data?.message || twinsQ.error?.message
    if (!msg) return null
    // Known backend bug: listVirtualBinTwins not exported
    if (String(msg).toLowerCase().includes('listvirtualbintwins')) {
      return 'Backend issue detected: ops dtListVirtualBins endpoint calls listVirtualBinTwins, but virtualBinService does not export it. Fix backend export to enable this table.'
    }
    return msg
  }, [twinsQ.error])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Twin"
        subtitle="Aggregate bin-level telemetry into virtual-bin health & risk scores."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="w-[220px]">
              <option value="">All zones</option>
              {zones.map((z) => (
                <option key={z._id || z.id} value={z._id || z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
            <Button variant="secondary" disabled={aggregate.isPending} onClick={() => aggregate.mutate()}>
              {aggregate.isPending ? 'Aggregating...' : 'Run aggregation'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">How it works</div>
          <div className="text-sm text-muted">Aggregation computes avg fill, max fill, offline %, and a risk score (0-100).</div>
        </CardHeader>
        <CardContent className="text-xs text-muted">
          If thresholds are exceeded, the system can auto-create BIN_SERVICE cases and tasks. (Requires backend DT triggers enabled.)
        </CardContent>
      </Card>

      {errorNote ? (
        <Card>
          <CardContent className="py-5 text-sm text-[rgb(var(--danger))]">
            {errorNote}
          </CardContent>
        </Card>
      ) : null}

      {twinsQ.isLoading ? (
        <div className="text-sm text-muted">Loading digital twin data...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No twin data" description="Run aggregation to compute risk scores for active virtual bins." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Virtual Bin</TH>
              <TH>Computed</TH>
              <TH>Bins</TH>
              <TH>Avg</TH>
              <TH>Max</TH>
              <TH>Over80</TH>
              <TH>Over95</TH>
              <TH>Offline</TH>
              <TH>Risk</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((t) => (
              <TR key={t._id || t.id || t.virtualBinId}>
                <TD className="font-medium">{String(t.virtualBinId || '').slice(-6) || '—'}</TD>
                <TD className="text-xs text-muted">{formatDateTime(t.computedAt || t.updatedAt)}</TD>
                <TD>{t.binsCount ?? 0}</TD>
                <TD>{t.avgFill ?? 0}%</TD>
                <TD>{t.maxFill ?? 0}%</TD>
                <TD className="text-xs text-muted">{t.over80Count ?? 0} ({formatPercent(t.pctOver80 ?? 0, 1)})</TD>
                <TD className="text-xs text-muted">{t.over95Count ?? 0} ({formatPercent(t.pctOver95 ?? 0, 1)})</TD>
                <TD className="text-xs text-muted">{t.offlineCount ?? 0} ({formatPercent(t.offlinePct ?? 0, 1)})</TD>
                <TD><Badge variant={riskVariant(t.riskScore)}>{t.riskScore ?? 0}</Badge></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
