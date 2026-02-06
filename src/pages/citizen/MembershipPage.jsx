import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatMoney, pickErrorMessage } from '../../lib/utils'

export default function MembershipPage() {
  const qc = useQueryClient()
  const plansQ = useQuery({ queryKey: ['citizen_membership_plans'], queryFn: () => sdk.citizen.listMembershipPlans() })
  const activeQ = useQuery({ queryKey: ['citizen_membership_active'], queryFn: () => sdk.citizen.getMyMembership() })

  const plans = plansQ.data?.items || []
  const active = activeQ.data?.active || null

  const [open, setOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const subscribe = useMutation({
    mutationFn: () => sdk.citizen.subscribeMembership({ planId: selectedPlanId }),
    onSuccess: () => {
      toast.success('Subscribed')
      setOpen(false)
      setSelectedPlanId('')
      qc.invalidateQueries({ queryKey: ['citizen_membership_active'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const cancel = useMutation({
    mutationFn: () => sdk.citizen.cancelMembership({ note: 'Cancelled by user' }),
    onSuccess: () => {
      toast.success('Cancelled')
      qc.invalidateQueries({ queryKey: ['citizen_membership_active'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const activePlan = active?.plan || null

  return (
    <div className="space-y-6">
      <PageHeader title="Membership" subtitle="Optional subscription benefits (discounts + recyclable bonuses)." />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Your membership</div>
          <div className="text-sm text-muted">If you subscribe, billing generation adds membership fee and applies discount.</div>
        </CardHeader>
        <CardContent>
          {!activePlan ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">No active membership</div>
                <div className="mt-1 text-xs text-muted">Choose a plan below to subscribe.</div>
              </div>
              <Button onClick={() => setOpen(true)}>Subscribe</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{activePlan.name}</div>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className="mt-1 text-xs text-muted">{activePlan.description || '—'}</div>
                <div className="mt-2 text-xs text-muted">
                  Fee: Rs. {formatMoney(activePlan.monthlyFee || 0)} / month • Discount: {activePlan.discountPercent || 0}% • Bonus: {activePlan.recyclableBonusPercent || 0}%
                </div>
              </div>
              <Button variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                {cancel.isPending ? 'Cancelling...' : 'Cancel'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.filter((p) => p.isActive !== false).map((p) => (
          <Card key={p._id || p.id}>
            <CardContent className="py-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{p.name}</div>
                  <div className="mt-1 text-xs text-muted line-clamp-2">{p.description || '—'}</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="mt-4 text-sm">
                <div>Monthly: <span className="font-semibold">Rs. {formatMoney(p.monthlyFee || 0)}</span></div>
                <div className="mt-1 text-xs text-muted">
                  Discount: {p.discountPercent || 0}% • Bonus: {p.recyclableBonusPercent || 0}%
                </div>
              </div>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSelectedPlanId(p._id || p.id)
                    setOpen(true)
                  }}
                  disabled={!!activePlan}
                >
                  {activePlan ? 'Already subscribed' : 'Subscribe'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Subscribe to membership"
        description="Confirm your subscription."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={subscribe.isPending || !selectedPlanId} onClick={() => subscribe.mutate()}>
              {subscribe.isPending ? 'Subscribing...' : 'Confirm'}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm">
          {selectedPlanId ? (
            <>
              <div className="text-muted">Selected plan ID:</div>
              <div className="font-semibold">{selectedPlanId}</div>
              <div className="text-xs text-muted">Your membership will be effective immediately.</div>
            </>
          ) : (
            <div className="text-muted">Select a plan to continue.</div>
          )}
        </div>
      </Modal>
    </div>
  )
}
