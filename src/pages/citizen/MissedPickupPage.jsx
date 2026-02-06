import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { sdk } from '../../lib/sdk'
import { pickErrorMessage } from '../../lib/utils'

export default function MissedPickupPage() {
  const [loadingHouseholds, setLoadingHouseholds] = useState(true)
  const [households, setHouseholds] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const [householdId, setHouseholdId] = useState('')
  const [bsDate, setBsDate] = useState('')
  const [serviceType, setServiceType] = useState('REGULAR_COLLECTION')
  const [note, setNote] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setLoadingHouseholds(true)
        const res = await sdk.citizen.listMyHouseholds()
        const items = Array.isArray(res) ? res : res?.items || []
        setHouseholds(items)
        if (!householdId && items.length) setHouseholdId(items[0]._id || items[0].id)
      } catch {
        setHouseholds([])
      } finally {
        setLoadingHouseholds(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options = useMemo(() => (households || []).map((h) => ({
    id: String(h._id || h.id),
    label: h.nickname || h.addressLine1 || h.name || String(h._id || h.id),
    ward: h.zone?.wardCode || h.wardCode || ''
  })), [households])

  async function submit() {
    if (!householdId) return toast.error('Household is required')
    if (!bsDate.trim()) return toast.error('Missed date (BS) is required')
    try {
      setSubmitting(true)
      const payload = {
        householdId,
        bsDate: bsDate.trim(),
        serviceType,
        ...(note.trim() ? { note: note.trim() } : {})
      }
      await sdk.citizen.createMissedPickup(payload)
      toast.success('Missed pickup submitted')
      setNote('')
    } catch (e) {
      toast.error(pickErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missed Pickup"
        subtitle="Report a missed routine/bulky pickup so Ops can validate and reschedule."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="text-sm font-semibold">Request</div>
            <div className="text-xs text-muted">POST /api/citizen/missed-pickups</div>

            <div>
              <Label>Household</Label>
              {options.length ? (
                <Select value={householdId} onChange={(e) => setHouseholdId(e.target.value)}>
                  {options.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label}{h.ward ? ` (Ward ${h.ward})` : ''}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  placeholder={loadingHouseholds ? 'Loading households…' : 'Paste household _id'}
                />
              )}
              <div className="mt-1 text-xs text-muted">
                {options.length ? 'Select the household linked to your account.' : 'If households do not load, paste the household id.'}
              </div>
            </div>

            <div>
              <Label>Missed date (BS)</Label>
              <Input value={bsDate} onChange={(e) => setBsDate(e.target.value)} placeholder="2082-10-21" />
              <div className="mt-1 text-xs text-muted">Use your standard BS date format (e.g., 2082-10-21).</div>
            </div>

            <div>
              <Label>Service type</Label>
              <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                <option value="REGULAR_COLLECTION">REGULAR_COLLECTION</option>
                <option value="BULKY_PICKUP">BULKY_PICKUP</option>
              </Select>
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any details for the crew?" />
            </div>

            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6 space-y-3">
            <div className="text-sm font-semibold">What happens next</div>
            <div className="text-sm text-muted">A missed pickup becomes a case for Ops to validate and schedule.</div>

            <div className="space-y-2 text-sm">
              <div>• You submit the missed pickup with date and household.</div>
              <div>• Ops validates and assigns a crew/vehicle.</div>
              <div>• You’ll receive updates in Notifications once the backend sends them.</div>
            </div>

            <div className="rounded-2xl border border-app p-4 text-xs text-muted">
              If your backend does not yet implement missed pickups, this request will return an error.
              In that case, implement <span className="font-mono">POST /api/citizen/missed-pickups</span> (same contract as frontend1).
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
