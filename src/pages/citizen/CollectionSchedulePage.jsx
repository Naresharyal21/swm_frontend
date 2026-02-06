import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty'
import { sdk } from '../../lib/sdk'
import { pickErrorMessage } from '../../lib/utils'

const DAY_MAP = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday'
}

function daysLabel(days) {
  if (!Array.isArray(days) || days.length === 0) return '—'
  return days
    .map((d) => {
      const k = String(d || '').slice(0, 3).toUpperCase()
      return DAY_MAP[k] || String(d)
    })
    .join(', ')
}

export default function CollectionSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [households, setHouseholds] = useState([])

  async function load() {
    try {
      setLoading(true)

      // Prefer explicit schedule endpoint if your backend supports it.
      let schedule = null
      try {
        schedule = await sdk.citizen.getSchedule()
      } catch {
        schedule = null
      }

      const hh = await sdk.citizen.listMyHouseholds()
      const items = Array.isArray(hh) ? hh : hh?.items || []

      setData(schedule)
      setHouseholds(items)
    } catch (e) {
      toast.error(pickErrorMessage(e))
      setData(null)
      setHouseholds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scheduleCards = useMemo(() => {
    const fromSchedule = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    if (fromSchedule.length) {
      return fromSchedule.map((s, idx) => ({
        key: s._id || s.id || idx,
        title: s.title || s.householdName || s.zoneName || 'Collection schedule',
        days: s.daysOfWeek || s.days || [],
        timeWindow: s.timeWindow || s.window || s.time || null,
        notes: s.notes || s.description || null
      }))
    }

    // Fallback: derive schedule from household pickupSchedule if present.
    return (households || []).map((h, idx) => ({
      key: h._id || h.id || idx,
      title: h.nickname || h.addressLine1 || h.name || `Household ${idx + 1}`,
      days: h.pickupSchedule?.daysOfWeek || h.pickupDays || [],
      timeWindow: h.pickupSchedule?.timeWindow || h.pickupSchedule?.time || null,
      notes: h.pickupSchedule?.notes || null,
      ward: h.zone?.wardCode || h.wardCode || null
    }))
  }, [data, households])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collection Schedule"
        subtitle="Your routine collection days (derived from your household settings)."
        right={<Button variant="secondary" onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</Button>}
      />

      {loading ? (
        <div className="text-sm text-muted">Loading schedule...</div>
      ) : scheduleCards.length === 0 ? (
        <EmptyState
          title="No schedule found"
          description="Set pickup days in Household Settings, or ensure /citizen/schedule is implemented in your backend."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {scheduleCards.map((s) => (
            <Card key={s.key}>
              <CardContent className="py-6">
                <div className="text-sm font-semibold">{s.title}</div>
                {s.ward ? <div className="mt-1 text-xs text-muted">Ward {s.ward}</div> : null}
                <div className="mt-4 grid gap-1 text-sm">
                  <div><span className="text-muted">Days:</span> {daysLabel(s.days)}</div>
                  <div><span className="text-muted">Time window:</span> {s.timeWindow || '—'}</div>
                  {s.notes ? <div><span className="text-muted">Notes:</span> {s.notes}</div> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
