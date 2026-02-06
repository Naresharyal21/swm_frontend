import React, { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { pickErrorMessage } from '../../lib/utils'

export default function RewardClaimPage() {
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [created, setCreated] = useState(null)

  const qtyOk = useMemo(() => {
    const q = Number(quantity)
    return Number.isFinite(q) && q > 0
  }, [quantity])

  const create = useMutation({
    mutationFn: () => sdk.citizen.createRewardClaim({ category: category.trim(), quantity: Number(quantity) }),
    onSuccess: (res) => {
      setCreated(res?.claim || res)
      toast.success('Reward claim submitted')
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward Claim"
        subtitle="Request wallet credits based on reward categories configured by admin (Reward Rates). Claims are reviewed by supervisors."
      />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Create a claim</div>
          <div className="text-sm text-muted">
            Category must match an <span className="font-semibold">active</span> reward rate. Example categories depend on your municipality setup.
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category *</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Eg. PLASTIC" />
              <div className="mt-1 text-xs text-muted">Tip: Ask admin to share the valid category names.</div>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Eg. 5"
                inputMode="decimal"
              />
              <div className="mt-1 text-xs text-muted">Quantity is a unit defined by your reward rate (kg, pieces, etc.).</div>
            </div>
          </div>

          <div>
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for the reviewer" />
            <div className="mt-1 text-xs text-muted">
              Backend reward claim API doesn’t store note right now; this field is kept for UI completeness.
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={!category.trim() || !qtyOk || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Submitting…' : 'Submit claim'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {created ? (
        <Card>
          <CardHeader>
            <div className="text-base font-semibold">Submitted</div>
            <div className="text-sm text-muted">You’ll get a notification once this claim is approved/rejected.</div>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">Claim ID: {created._id || created.id}</div>
                  <div className="mt-1 text-xs text-muted">Category: {created.category}</div>
                </div>
                <Badge variant={created.status === 'PENDING' ? 'warning' : created.status === 'APPROVED' ? 'success' : 'danger'}>
                  {created.status || 'PENDING'}
                </Badge>
              </div>
              <div className="mt-3 text-sm">
                Quantity: <span className="font-semibold">{created.quantity}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">How credits work</div>
          <div className="text-sm text-muted">Approved rewards credit your wallet. Credits are applied to invoices automatically.</div>
        </CardHeader>
        <CardContent className="text-xs text-muted">
          For recyclable submissions with images, use Citizen → Recyclables (that flow creates a pickup task and verification).
        </CardContent>
      </Card>
    </div>
  )
}
