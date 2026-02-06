import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { sdk } from '../../lib/sdk'
import { pickErrorMessage } from '../../lib/utils'

export default function BulkyRequestPage() {
  const qc = useQueryClient()
  const [householdId, setHouseholdId] = useState('')
  const [bulkyWeightKg, setBulkyWeightKg] = useState('')
  const [description, setDescription] = useState('')
  const [created, setCreated] = useState(null)

  const weightOk = useMemo(() => {
    const w = Number(bulkyWeightKg)
    return Number.isFinite(w) && w > 0
  }, [bulkyWeightKg])

  const create = useMutation({
    mutationFn: () =>
      sdk.citizen.createBulkyRequest({
        householdId: householdId.trim(),
        bulkyWeightKg: Number(bulkyWeightKg),
        description: description || ''
      }),
    onSuccess: (res) => {
      setCreated(res?.case || res?.item || res)
      toast.success('Bulky pickup request submitted')
      qc.invalidateQueries({ queryKey: ['citizen_cases'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulky Waste Request"
        subtitle="Request a special pickup for bulky items (furniture, large debris). Requests are validated before scheduling."
      />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Household required</div>
          <div className="text-sm text-muted">Bulky requests use your household location and zone. Enter your Household ID (provided by admin).</div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label>Household ID *</Label>
            <Input value={householdId} onChange={(e) => setHouseholdId(e.target.value)} placeholder="Mongo ObjectId" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Estimated weight (kg) *</Label>
              <Input
                value={bulkyWeightKg}
                onChange={(e) => setBulkyWeightKg(e.target.value)}
                placeholder="25"
                inputMode="decimal"
              />
              <div className="mt-1 text-xs text-muted">Used for planning crew/vehicle requirement.</div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Eg. Old sofa + broken table, near gate"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={!householdId.trim() || !weightOk || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {created ? (
        <Card>
          <CardHeader>
            <div className="text-base font-semibold">Submitted</div>
            <div className="text-sm text-muted">Track approval and scheduling in Citizen → My Cases.</div>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
              <div className="font-semibold">Case ID: {created._id || created.id}</div>
              <div className="mt-1 text-xs text-muted">Status: {created.status || 'PENDING_VALIDATION'}</div>
              <div className="mt-2 text-sm">Weight: {created.bulkyWeightKg ?? bulkyWeightKg} kg</div>
              {created.description ? <div className="mt-2">{created.description}</div> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
