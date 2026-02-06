import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { sdk } from '../../lib/sdk'
import { WEEKDAYS } from '../../lib/constants'
import { pickErrorMessage } from '../../lib/utils'

function DayToggle({ value, onChange }) {
  const set = new Set(value || [])
  function toggle(d) {
    const next = new Set(set)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    onChange(Array.from(next))
  }
  return (
    <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
      {WEEKDAYS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={[
            'rounded-xl border border-app px-3 py-2 text-xs font-semibold transition',
            set.has(d) ? 'bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand2))]' : 'hover:bg-black/5 dark:hover:bg-white/5'
          ].join(' ')}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

export default function HouseholdSettingsPage() {
  const plansQ = useQuery({ queryKey: ['citizen_billing_plans'], queryFn: () => sdk.citizen.listBillingPlans() })
  const plans = plansQ.data?.items || []

  const [householdId, setHouseholdId] = useState('')
  const [planId, setPlanId] = useState('')
  const [days, setDays] = useState(['MON', 'WED', 'FRI'])

  const updatePlan = useMutation({
    mutationFn: () => sdk.citizen.updateHouseholdPlan(householdId.trim(), { planId: planId || null }),
    onSuccess: () => toast.success('Plan updated'),
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const updateSchedule = useMutation({
    mutationFn: () => sdk.citizen.updatePickupSchedule(householdId.trim(), { pickupScheduleDays: days }),
    onSuccess: () => toast.success('Pickup schedule updated'),
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Household Settings" subtitle="Update your billing plan and pickup schedule." />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Household ID required</div>
          <div className="text-sm text-muted">The backend does not expose a “my households” endpoint. Enter your Household ID (provided by admin).</div>
        </CardHeader>
        <CardContent>
          <Label>Household ID *</Label>
          <Input value={householdId} onChange={(e) => setHouseholdId(e.target.value)} placeholder="Mongo ObjectId" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Billing plan</div>
          <div className="text-sm text-muted">Choose a plan and update your household.</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Plan</Label>
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">None</option>
              {plans.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} ({p.billingMode})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              disabled={!householdId.trim() || updatePlan.isPending}
              onClick={() => updatePlan.mutate()}
            >
              {updatePlan.isPending ? 'Updating...' : 'Update plan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Pickup schedule</div>
          <div className="text-sm text-muted">These weekdays are used for routine pickup service generation.</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Days</Label>
            <DayToggle value={days} onChange={setDays} />
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              disabled={!householdId.trim() || updateSchedule.isPending}
              onClick={() => updateSchedule.mutate()}
            >
              {updateSchedule.isPending ? 'Updating...' : 'Update schedule'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
