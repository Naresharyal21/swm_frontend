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
import { formatDateTime, pickErrorMessage } from '../../lib/utils'

const ROLES = ['ADMIN', 'SUPERVISOR', 'CREW', 'CITIZEN']

export default function UsersPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin_users'], queryFn: () => sdk.admin.listUsers() })
  const items = q.data?.items || []

  // Create
  const [openCreate, setOpenCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', phone: '', role: 'CITIZEN' })
  const setCreate = (k, v) => setCreateForm((p) => ({ ...p, [k]: v }))

  const create = useMutation({
    mutationFn: () =>
      sdk.admin.createUser({
        email: createForm.email.trim(),
        password: createForm.password,
        name: createForm.name,
        phone: createForm.phone,
        role: createForm.role,
      }),
    onSuccess: () => {
      toast.success('User created')
      setOpenCreate(false)
      setCreateForm({ email: '', password: '', name: '', phone: '', role: 'CITIZEN' })
      qc.invalidateQueries({ queryKey: ['admin_users'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  })

  // Edit/Update
  const [openEdit, setOpenEdit] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ email: '', name: '', phone: '', role: 'CITIZEN', isActive: true })
  const setEdit = (k, v) => setEditForm((p) => ({ ...p, [k]: v }))

  const openEditModal = (u) => {
    const id = u._id || u.id
    setEditId(id)
    setEditForm({
      email: u.email || '',
      name: u.name || '',
      phone: u.phone || '',
      role: u.role || 'CITIZEN',
      isActive: typeof u.isActive === 'boolean' ? u.isActive : true,
    })
    setOpenEdit(true)
  }

  const update = useMutation({
    mutationFn: () =>
      sdk.admin.updateUser(editId, {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
        isActive: editForm.isActive,
      }),
    onSuccess: () => {
      toast.success('User updated')
      setOpenEdit(false)
      setEditId(null)
      qc.invalidateQueries({ queryKey: ['admin_users'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  })

  // Delete
  const del = useMutation({
    mutationFn: (id) => sdk.admin.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['admin_users'] })
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  })

  const byRole = useMemo(() => {
    const m = {}
    for (const r of ROLES) m[r] = 0
    for (const u of items) m[u.role] = (m[u.role] || 0) + 1
    return m
  }, [items])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Create and manage system users (Admin / Supervisor / Crew / Citizen)."
        right={<Button onClick={() => setOpenCreate(true)}>Create user</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <Card key={r}>
            <CardContent className="py-6">
              <div className="text-sm text-muted">{r}</div>
              <div className="mt-2 text-2xl font-semibold">{byRole[r] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {q.isLoading ? (
        <div className="text-sm text-muted">Loading users...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No users"
          description="Create your first user."
          action={<Button onClick={() => setOpenCreate(true)}>Create user</Button>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Name</TH>
              <TH>Phone</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>

          <tbody>
            {items.map((u) => {
              const id = u._id || u.id
              const isAdmin = u.role === 'ADMIN'
              return (
                <TR key={id}>
                  <TD className="font-medium">{u.email}</TD>
                  <TD>
                    <Badge variant={isAdmin ? 'success' : 'default'}>{u.role}</Badge>
                  </TD>
                  <TD>{u.name || '—'}</TD>
                  <TD>{u.phone || '—'}</TD>
                  <TD className="text-muted">{formatDateTime(u.createdAt)}</TD>

                  <TD className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={update.isPending}
                        onClick={() => openEditModal(u)}
                      >
                        Edit
                      </Button>


                      <Button
                        variant="destructive"
                        disabled={del.isPending}
                        onClick={() => {
                          if (confirm(`Delete user ${u.email}?`)) del.mutate(u._id || u.id)
                        }}
                      >
                        Delete
                      </Button>

                    </div>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      {/* Create modal */}
      <Modal
        open={openCreate}
        onOpenChange={setOpenCreate}
        title="Create user"
        description="Admin can create users for all roles."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Email *</Label>
            <Input value={createForm.email} onChange={(e) => setCreate('email', e.target.value)} type="email" />
          </div>
          <div>
            <Label>Password *</Label>
            <Input value={createForm.password} onChange={(e) => setCreate('password', e.target.value)} type="password" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={createForm.name} onChange={(e) => setCreate('name', e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={createForm.phone} onChange={(e) => setCreate('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Role *</Label>
            <Select value={createForm.role} onChange={(e) => setCreate('role', e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={openEdit}
        onOpenChange={setOpenEdit}
        title="Edit user"
        description={editForm.email ? `Update ${editForm.email}` : 'Update user'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenEdit(false)}>
              Cancel
            </Button>
            <Button disabled={update.isPending || !editId} onClick={() => update.mutate()}>
              {update.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Email</Label>
            <Input value={editForm.email} disabled />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEdit('name', e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEdit('phone', e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onChange={(e) => setEdit('role', e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Active</Label>
              <Select value={String(editForm.isActive)} onChange={(e) => setEdit('isActive', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
