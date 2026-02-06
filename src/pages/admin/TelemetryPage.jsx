import React, { useEffect, useMemo, useState } from 'react'
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

function toNumberOrNull(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default function TelemetryPage() {
  const [zoneFilter, setZoneFilter] = useState('')
  const zonesQ = sdk.admin.listZones

  const [zones, setZones] = useState([])
  const zoneById = useMemo(() => new Map((zones || []).map((z) => [String(z._id || z.id), z])), [zones])

  const [telemetry, setTelemetry] = useState({ binId: '', fillPercent: '', batteryPercent: '', ts: '' })
  const [sending, setSending] = useState(false)

  const [dtLoading, setDtLoading] = useState(false)
  const [dtItems, setDtItems] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await zonesQ()
        setZones(res?.items || [])
      } catch {
        setZones([])
      }
    })()
  }, [])

  async function loadDtList() {
    try {
      setDtLoading(true)
      const res = await sdk.ops.dtListVirtualBins(zoneFilter ? { zoneId: zoneFilter } : undefined)
      setDtItems(res?.items || [])
    } catch (e) {
      toast.error(pickErrorMessage(e))
      setDtItems([])
    } finally {
      setDtLoading(false)
    }
  }

  useEffect(() => {
    loadDtList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneFilter])

  async function ingest(e) {
    e?.preventDefault?.()
    if (!telemetry.binId.trim()) {
      toast.error('Bin ID is required')
      return
    }

    const fill = toNumberOrNull(telemetry.fillPercent)
    const batt = toNumberOrNull(telemetry.batteryPercent)
    if (fill != null && (fill < 0 || fill > 100)) return toast.error('Fill % must be 0..100')
    if (batt != null && (batt < 0 || batt > 100)) return toast.error('Battery % must be 0..100')

    const payload = {
      binId: telemetry.binId.trim(),
      ...(fill != null ? { fillPercent: fill } : {}),
      ...(batt != null ? { batteryPercent: batt } : {}),
      ...(telemetry.ts.trim() ? { ts: telemetry.ts.trim() } : {})
    }

    try {
      setSending(true)
      await sdk.iot.ingestTelemetry(payload)
      toast.success('Telemetry ingested')
      setTelemetry((p) => ({ ...p, fillPercent: '', batteryPercent: '', ts: '' }))
    } catch (e) {
      toast.error(pickErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  async function runAggregate() {
    try {
      setDtLoading(true)
      await sdk.ops.dtAggregate()
      toast.success('Aggregation triggered')
      await loadDtList()
    } catch (e) {
      toast.error(pickErrorMessage(e))
    } finally {
      setDtLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Telemetry" subtitle="Ingest IoT bin telemetry and view digital-twin aggregation." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="py-6">
            <div className="text-sm font-semibold">Ingest telemetry</div>
            <div className="mt-1 text-xs text-muted">POST /api/iot/telemetry</div>

            <form onSubmit={ingest} className="mt-4 grid gap-3">
              <div>
                <Label>Bin ID *</Label>
                <Input value={telemetry.binId} onChange={(e) => setTelemetry((p) => ({ ...p, binId: e.target.value }))} placeholder="BIN-000123" />
              </div>

              <div>
                <Label>Fill % (optional)</Label>
                <Input value={telemetry.fillPercent} onChange={(e) => setTelemetry((p) => ({ ...p, fillPercent: e.target.value }))} placeholder="0..100" />
              </div>

              <div>
                <Label>Battery % (optional)</Label>
                <Input value={telemetry.batteryPercent} onChange={(e) => setTelemetry((p) => ({ ...p, batteryPercent: e.target.value }))} placeholder="0..100" />
              </div>

              <div>
                <Label>Timestamp ISO (optional)</Label>
                <Input value={telemetry.ts} onChange={(e) => setTelemetry((p) => ({ ...p, ts: e.target.value }))} placeholder="2026-02-04T06:00:00Z" />
              </div>

              <Button type="submit" disabled={sending}>
                {sending ? 'Sending...' : 'Send telemetry'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold">Digital Twin</div>
                <div className="mt-1 text-xs text-muted">{dtLoading ? 'Loading...' : `${dtItems.length} item(s)`}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-[220px]">
                  <option value="">All zones</option>
                  {zones.map((z) => (
                    <option key={z._id || z.id} value={z._id || z.id}>
                      {z.wardCode} · {z.name}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" onClick={loadDtList} disabled={dtLoading}>
                  Refresh
                </Button>
                <Button onClick={runAggregate} disabled={dtLoading}>
                  Trigger aggregate
                </Button>
              </div>
            </div>

            <div className="mt-4">
              {dtItems.length === 0 ? (
                <EmptyState title="No DT items" description="No virtual-bin twins returned." />
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <TH>Virtual bin</TH>
                      <TH>Zone</TH>
                      <TH>Avg / Max fill</TH>
                      <TH>Risk</TH>
                      <TH>Computed</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {dtItems.map((it) => {
                      const vb = it.virtualBin || null
                      const z = vb?.zoneId ? zoneById.get(String(vb.zoneId)) : null
                      const name = vb?.name || it.name || it.virtualBinName || String(it.virtualBinId || it._id)
                      const avg = it.avgFillPct ?? it.avgFill ?? null
                      const max = it.maxFillPct ?? it.maxFill ?? null
                      return (
                        <TR key={it._id || it.virtualBinId || name}>
                          <TD className="font-medium">{name}</TD>
                          <TD className="text-sm">{z ? `${z.wardCode} · ${z.name}` : <span className="text-muted">—</span>}</TD>
                          <TD className="text-sm">{avg == null && max == null ? <span className="text-muted">—</span> : `${avg ?? '—'} / ${max ?? '—'}`}</TD>
                          <TD>{it.riskScore == null ? <Badge variant="default">—</Badge> : <Badge variant={Number(it.riskScore) >= 70 ? 'danger' : Number(it.riskScore) >= 40 ? 'warning' : 'success'}>{it.riskScore}</Badge>}</TD>
                          <TD className="text-xs text-muted">{formatDateTime(it.computedAt || it.updatedAt || it.createdAt)}</TD>
                        </TR>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
