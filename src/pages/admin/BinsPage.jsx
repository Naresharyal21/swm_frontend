import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { Badge } from '../../components/ui/badge'
import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage, toPoint } from '../../lib/utils'

export default function BinsPage() {
  const qc = useQueryClient()
  const [householdId, setHouseholdId] = useState('')

  const householdsQ = useQuery({ queryKey: ['admin_households_all'], queryFn: () => sdk.admin.listHouseholds() })
  const vbsQ = useQuery({ queryKey: ['admin_virtual_bins_all'], queryFn: () => sdk.admin.listVirtualBins() })
  const binsQ = useQuery({
    queryKey: ['admin_bins', householdId],
    queryFn: () => sdk.admin.listBins(householdId ? { householdId } : undefined)
  })

  const households = householdsQ.data?.items || []
  const virtualBins = vbsQ.data?.items || []
  const items = binsQ.data?.items || []

  const householdById = useMemo(() => Object.fromEntries(households.map((h) => [String(h._id || h.id), h])), [households])
  const vbById = useMemo(() => Object.fromEntries(virtualBins.map((v) => [String(v._id || v.id), v])), [virtualBins])

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ binId: '', householdId: '', lat: '', lng: '' })

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.binId.trim()) throw new Error('binId is required')
      if (!form.householdId) throw new Error('householdId is required')

      const payload = {
        binId: form.binId.trim(),
        householdId: form.householdId
      }

      // optional location override
      if (String(form.lat).trim() !== '' && String(form.lng).trim() !== '') {
        payload.location = toPoint(form.lng, form.lat)
      }

      return sdk.admin.createBin(payload)
    },
    onSuccess: () => {
      toast.success('Bin created')
      setOpen(false)
      setForm({ binId: '', householdId: '', lat: '', lng: '' })
      qc.invalidateQueries({ queryKey: ['admin_bins'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  function openCreate() {
    setForm((p) => ({ ...p, householdId: householdId || p.householdId }))
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bins"
        subtitle="Register physical bins and map them to households."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={householdId} onChange={(e) => setHouseholdId(e.target.value)} className="w-[240px]">
              <option value="">All households</option>
              {households.map((h) => (
                <option key={h._id || h.id} value={h._id || h.id}>
                  {h.address}
                </option>
              ))}
            </Select>
            <Button onClick={openCreate}>Create bin</Button>
          </div>
        }
      />

      {binsQ.isLoading ? (
        <div className="text-sm text-muted">Loading bins...</div>
      ) : items.length === 0 ? (
        <EmptyState title="No bins" description="Create bins for households to start monitoring fill levels." action={<Button onClick={openCreate}>Create bin</Button>} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Bin ID</TH>
              <TH>Household</TH>
              <TH>Virtual Bin</TH>
              <TH>Status</TH>
              <TH>Location</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <tbody>
            {items.map((b) => {
              const id = b._id || b.id
              const h = householdById[String(b.householdId)]
              const vb = b.virtualBinId ? vbById[String(b.virtualBinId)] : null
              const coords = b.location?.coordinates || []
              return (
                <TR key={id}>
                  <TD className="font-medium">{b.binId}</TD>
                  <TD className="text-sm">{h?.address || <span className="text-muted">{String(b.householdId || '—')}</span>}</TD>
                  <TD>{vb?.name || <span className="text-muted">—</span>}</TD>
                  <TD>
                    <Badge variant={b.status === 'ACTIVE' ? 'success' : 'warning'}>{b.status || '—'}</Badge>
                  </TD>
                  <TD className="text-xs text-muted">{coords.length ? `${coords[1]}, ${coords[0]}` : '—'}</TD>
                  <TD className="text-xs text-muted">{formatDateTime(b.createdAt)}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create bin"
        description="Location override is optional; if empty the household location is used."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Bin ID *</Label>
            <Input value={form.binId} onChange={(e) => set('binId', e.target.value)} placeholder="e.g., BIN-001" />
          </div>
          <div>
            <Label>Household *</Label>
            <Select value={form.householdId} onChange={(e) => set('householdId', e.target.value)}>
              <option value="">Select household</option>
              {households.map((h) => (
                <option key={h._id || h.id} value={h._id || h.id}>
                  {h.address}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitude (optional)</Label>
              <Input value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="27.7" />
            </div>
            <div>
              <Label>Longitude (optional)</Label>
              <Input value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="85.3" />
            </div>
          </div>

          <Card>
            <CardContent className="py-4 text-xs text-muted">
              Note: Bin edit/delete endpoints are not present in the backend. Use Virtual Bins page to group bins.
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  )
}
