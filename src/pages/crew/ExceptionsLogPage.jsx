import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

const TYPES = [
  'BLOCKED_ACCESS',
  'BIN_DAMAGED',
  'BIN_MISSING',
  'ROAD_CLOSED',
  'WEATHER',
  'CUSTOMER_NOT_AVAILABLE',
  'OTHER'
]

export default function ExceptionsLogPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState([])

  const [type, setType] = useState(TYPES[0])
  const [taskId, setTaskId] = useState('')
  const [locationText, setLocationText] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    try {
      setLoading(true)
      const res = await sdk.crew.listExceptions()
      const rows = Array.isArray(res) ? res : res?.items || []
      setItems(rows)
    } catch (e) {
      toast.error(pickErrorMessage(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sorted = useMemo(() => {
    return [...(items || [])].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }, [items])

  async function submit() {
    if (!description.trim()) return toast.error('Please describe the exception')
    try {
      setSubmitting(true)
      const payload = {
        type,
        taskId: taskId.trim() || undefined,
        locationText: locationText.trim() || undefined,
        description: description.trim()
      }
      await sdk.crew.createException(payload)
      toast.success('Exception logged')
      setDescription('')
      setTaskId('')
      setLocationText('')
      await load()
    } catch (e) {
      toast.error(pickErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exceptions Log"
        subtitle="Record issues during collection (blocked access, damaged bin, etc.)."
        right={
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="text-sm font-semibold">Log a new exception</div>
            <div className="text-xs text-muted">POST /api/crew/exceptions</div>

            <div>
              <Label>Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Task ID (optional)</Label>
              <Input value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="Paste task _id" />
            </div>

            <div>
              <Label>Location (optional)</Label>
              <Input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="e.g. Ward 10, street near school" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened? What action did you take?" />
            </div>

            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="text-sm font-semibold">Recent exceptions</div>
            <div className="mt-1 text-xs text-muted">{loading ? 'Loading...' : `${sorted.length} record(s)`}</div>

            <div className="mt-4 space-y-2">
              {sorted.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-app p-6 text-sm text-muted">No exceptions yet.</div>
              ) : (
                sorted.map((x) => (
                  <div key={x._id || x.id} className="rounded-2xl border border-app p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{x.type || x.kind || 'EXCEPTION'}</div>
                        <div className="mt-1 text-sm text-muted">{x.description || x.message || '—'}</div>
                        {x.locationText ? <div className="mt-2 text-xs text-muted">Location: {x.locationText}</div> : null}
                        <div className="mt-2 text-xs text-muted">{formatDateTime(x.createdAt)}</div>
                      </div>
                      {x.taskId ? <div className="shrink-0 text-xs font-mono text-muted">{String(x.taskId).slice(-8)}</div> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
