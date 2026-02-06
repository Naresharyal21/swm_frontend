import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { EmptyState } from '../../components/ui/empty'
import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

function kindVariant(kind) {
  if (kind === 'TRUCK_NEARBY') return 'warning'
  return 'default'
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState('false')
  const [limit, setLimit] = useState('50')

  const q = useQuery({
    queryKey: ['citizen_notifications', unreadOnly, limit],
    queryFn: () =>
      sdk.citizen.notifications({
        unreadOnly: unreadOnly === 'true',
        limit: Number(limit || 50)
      })
  })

  const items = q.data?.items || []
  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items])

  const markOne = useMutation({
    mutationFn: (id) => sdk.citizen.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen_notifications'] })
      toast.success('Marked as read')
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const markVisible = useMutation({
    mutationFn: async () => {
      const ids = items.filter((n) => !n.readAt).map((n) => n._id || n.id)
      for (const id of ids) {
        await sdk.citizen.markNotificationRead(id)
      }
      return ids.length
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['citizen_notifications'] })
      toast.success(count ? `Marked ${count} as read` : 'Nothing to mark')
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Updates about your pickups, recyclable verification, invoices, and general alerts."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={unreadOnly} onChange={(e) => setUnreadOnly(e.target.value)} className="w-[180px]">
              <option value="false">All</option>
              <option value="true">Unread only</option>
            </Select>
            <Select value={limit} onChange={(e) => setLimit(e.target.value)} className="w-[140px]">
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 ring-brand disabled:opacity-50 disabled:pointer-events-none bg-[rgb(var(--card))] border border-app hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => markVisible.mutate()}
              disabled={markVisible.isPending || unreadCount == 0}
              title="Marks all visible unread notifications as read"
            >
              {markVisible.isPending ? 'Marking…' : 'Mark visible read'}
            </button>
          </div>
        }
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading notifications...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up. New notifications will appear here." />
      ) : (
        <div className="grid gap-4">
          {items.map((n) => {
            const id = n._id || n.id
            const unread = !n.readAt
            return (
              <Card key={id}>
                <CardContent className="py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={kindVariant(n.kind)}>{n.kind || 'GENERAL'}</Badge>
                        {unread ? <Badge variant="success">UNREAD</Badge> : <Badge>READ</Badge>}
                        <span className="text-xs text-muted">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-base font-semibold">{n.title || 'Notification'}</div>
                      <div className="mt-1 text-sm text-muted whitespace-pre-line">{n.message || '—'}</div>
                      {n.meta && Object.keys(n.meta).length ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium text-[rgb(var(--brand))]">Details</summary>
                          <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-app bg-black/5 p-3 text-xs text-muted dark:bg-white/5">{JSON.stringify(n.meta, null, 2)}</pre>
                        </details>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      {unread ? (
                        <Button variant="outline" onClick={() => markOne.mutate(id)} disabled={markOne.isPending}>
                          Mark read
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Tips</div>
          <div className="text-sm text-muted">Verified recyclables automatically credit your wallet.</div>
        </CardHeader>
        <CardContent className="text-xs text-muted">
          If you submitted recyclables, you'll receive updates when the crew verifies or rejects them.
        </CardContent>
      </Card>
    </div>
  )
}
