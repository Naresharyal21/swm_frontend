import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Label } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { Table, THead, TH, TR, TD } from '../../components/ui/table'
import { EmptyState } from '../../components/ui/empty'
import { sdk } from '../../lib/sdk'
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

function toPayload(form) {
  return {
    name: form.name.trim(),
    wardCode: form.wardCode || '',
    centroid: { type: 'Point', coordinates: [Number(form.lng || 0), Number(form.lat || 0)] },
    polygon: form.polygon || null
  }
}

export default function ZonesPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin_zones'], queryFn: () => sdk.admin.listZones() })
  const items = q.data?.items || []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', wardCode: '', lat: '', lng: '', polygon: '' })

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })) }

  const create = useMutation({
    mutationFn: () => sdk.admin.createZone(toPayload(form)),
    onSuccess: () => {
      toast.success('Zone created')
      setOpen(false)
      setForm({ name: '', wardCode: '', lat: '', lng: '', polygon: '' })
      qc.invalidateQueries({ queryKey: ['admin_zones'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const update = useMutation({
    mutationFn: () => sdk.admin.updateZone(editing._id || editing.id, toPayload(form)),
    onSuccess: () => {
      toast.success('Zone updated')
      setOpen(false)
      setEditing(null)
      setForm({ name: '', wardCode: '', lat: '', lng: '', polygon: '' })
      qc.invalidateQueries({ queryKey: ['admin_zones'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const del = useMutation({
    mutationFn: (id) => sdk.admin.deleteZone(id),
    onSuccess: () => {
      toast.success('Zone deleted')
      qc.invalidateQueries({ queryKey: ['admin_zones'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e))
  })

  const modalTitle = editing ? 'Edit zone' : 'Create zone'

  const rows = useMemo(() => {
    return items.map(z => {
      const coords = z?.centroid?.coordinates || []
      return {
        id: z._id || z.id,
        name: z.name,
        wardCode: z.wardCode,
        lng: coords[0],
        lat: coords[1],
        createdAt: z.createdAt
      }
    })
  }, [items])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', wardCode: '', lat: '', lng: '', polygon: '' })
    setOpen(true)
  }

  function openEdit(z) {
    setEditing(z)
    const coords = z?.centroid?.coordinates || []
    setForm({
      name: z.name || '',
      wardCode: z.wardCode || '',
      lng: coords[0] ?? '',
      lat: coords[1] ?? '',
      polygon: z.polygon ? JSON.stringify(z.polygon) : ''
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zones"
        subtitle="Define operational areas using ward code and a centroid location."
        right={<Button onClick={openCreate}>Create zone</Button>}
      />

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading zones...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No zones" description="Create your first zone to start mapping households and bins." action={<Button onClick={openCreate}>Create zone</Button>} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Ward</TH>
              <TH>Centroid</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((z) => (
              <TR key={z.id}>
                <TD className="font-medium">{z.name}</TD>
                <TD>{z.wardCode || '—'}</TD>
                <TD className="text-xs text-muted">{z.lng != null ? `${z.lat}, ${z.lng}` : '—'}</TD>
                <TD className="text-xs text-muted">{formatDateTime(z.createdAt)}</TD>
                <TD className="text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" onClick={() => openEdit(items.find(i => (i._id||i.id)===z.id))}>Edit</Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm('Delete this zone?')) del.mutate(z.id)
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setEditing(null)
        }}
        title={modalTitle}
        description="Centroid coordinates are required. Use (lat, lng)."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={create.isPending || update.isPending} onClick={() => (editing ? update.mutate() : create.mutate())}>
              {(create.isPending || update.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., Ward 01" />
          </div>
          <div>
            <Label>Ward code</Label>
            <Input value={form.wardCode} onChange={(e) => set('wardCode', e.target.value)} placeholder="e.g., W01" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitude *</Label>
              <Input value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="27.7" />
            </div>
            <div>
              <Label>Longitude *</Label>
              <Input value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="85.3" />
            </div>
          </div>
          <div>
            <Label>Polygon (optional JSON)</Label>
            <Input value={form.polygon} onChange={(e) => set('polygon', e.target.value)} placeholder='{"type":"Polygon","coordinates":[...]}' />
            <div className="mt-1 text-xs text-muted">You can leave this empty; centroid is enough for most workflows.</div>
          </div>
        </div>
      </Modal>

      <Card>
        <CardContent className="py-5 text-xs text-muted">
          Zones support full edit/delete in your backend. Use zones to organize households, bins, and virtual bins.
        </CardContent>
      </Card>
    </div>
  )
}
