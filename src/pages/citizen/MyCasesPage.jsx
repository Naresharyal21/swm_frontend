import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '../../components/layout/PageHeader'
import { Select } from '../../components/ui/select'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { CASE_STATUSES } from '../../lib/constants'
import { formatDateTime } from '../../lib/utils'

function statusVariant(status) {
  if (status === CASE_STATUSES.COMPLETED) return 'success'
  if (status === CASE_STATUSES.REJECTED || status === CASE_STATUSES.FAILED || status === CASE_STATUSES.CANCELLED)
    return 'danger'
  if (status === CASE_STATUSES.PENDING_VALIDATION) return 'warning'
  return 'default'
}

export default function MyCasesPage() {
  const [status, setStatus] = useState('')

  const q = useQuery({
    queryKey: ['citizen_cases', status],
    queryFn: () => sdk.citizen.listCases({ status: status || undefined })
  })

  const items = q.data?.items || []

  const rows = useMemo(
    () =>
      items.map((c) => ({
        id: c._id || c.id,
        type: c.type,
        status: c.status,
        description: c.description,
        createdAt: c.createdAt,
        serviceDate: c.serviceDate,
        priority: c.priority,
        bulkyWeightKg: c.bulkyWeightKg
      })),
    [items]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Cases"
        subtitle="Track your reports and service requests. Most cases are reviewed before a task is dispatched."
        right={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[220px]">
            <option value="">All statuses</option>
            {Object.values(CASE_STATUSES).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        }
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading cases…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No cases"
          description="You haven't created any cases yet. Use Litter Report or Bulky Request to create one."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Type</TH>
              <TH>Status</TH>
              <TH>Description</TH>
              <TH>Service date</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.type}</TD>
                <TD>
                  <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                </TD>
                <TD className="text-sm">
                  <div className="line-clamp-2">{c.description || <span className="text-muted">—</span>}</div>
                  {c.bulkyWeightKg != null ? (
                    <div className="mt-1 text-xs text-muted">Bulky weight: {c.bulkyWeightKg} kg</div>
                  ) : null}
                  <div className="mt-1 text-xs text-muted">ID: {c.id}</div>
                </TD>
                <TD className="text-xs text-muted">{c.serviceDate || '—'}</TD>
                <TD className="text-xs text-muted">{formatDateTime(c.createdAt)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <div className="text-xs text-muted">
        Tip: Once a case is approved, a task is generated and assigned to a crew/vehicle by supervisors.
      </div>
    </div>
  )
}
