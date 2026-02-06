import React, { useState } from 'react'
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

export default function RecyclablesReviewPage() {
  const [submissionId, setSubmissionId] = useState('')
  const [verifiedPieces, setVerifiedPieces] = useState('')
  const [verifiedTotalWeightKg, setVerifiedTotalWeightKg] = useState('')
  const [note, setNote] = useState('')
  const [lastResult, setLastResult] = useState(null)

  const verify = useMutation({
    mutationFn: () =>
      sdk.crew.verifyRecyclable(submissionId.trim(), {
        verifiedPieces: verifiedPieces === '' ? null : Number(verifiedPieces),
        verifiedTotalWeightKg: verifiedTotalWeightKg === '' ? null : Number(verifiedTotalWeightKg),
        note: note || ''
      }),
    onSuccess: (res) => {
      toast.success('Submission verified')
      setLastResult(res)
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const reject = useMutation({
    mutationFn: () => sdk.crew.rejectRecyclable(submissionId.trim(), { reason: note || 'Rejected' }),
    onSuccess: (res) => {
      toast.success('Submission rejected')
      setLastResult(res)
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify Recyclables"
        subtitle="Crew verification for recyclable submissions (requires Submission ID)."
      />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">How to use</div>
          <div className="text-sm text-muted">Your backend doesn’t expose a “list submissions” endpoint for crew. Use the Submission ID received from supervisor/citizen.</div>
        </CardHeader>
        <CardContent className="text-xs text-muted">
          Verification credits wallet based on reward rates and membership bonus (if configured).
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <div className="grid gap-4">
            <div>
              <Label>Submission ID *</Label>
              <Input value={submissionId} onChange={(e) => setSubmissionId(e.target.value)} placeholder="Mongo ObjectId" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Verified pieces</Label>
                <Input value={verifiedPieces} onChange={(e) => setVerifiedPieces(e.target.value)} placeholder="e.g., 12" />
              </div>
              <div>
                <Label>Verified total weight (kg)</Label>
                <Input value={verifiedTotalWeightKg} onChange={(e) => setVerifiedTotalWeightKg(e.target.value)} placeholder="e.g., 3.5" />
              </div>
            </div>

            <div>
              <Label>Note / reason</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for verification or rejection." />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="danger"
                disabled={!submissionId.trim() || reject.isPending}
                onClick={() => reject.mutate()}
              >
                {reject.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button
                disabled={!submissionId.trim() || verify.isPending}
                onClick={() => verify.mutate()}
              >
                {verify.isPending ? 'Verifying...' : 'Verify'}
              </Button>
            </div>

            {lastResult ? (
              <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Last result</div>
                  <Badge variant="success">OK</Badge>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto text-xs text-muted">{JSON.stringify(lastResult, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
