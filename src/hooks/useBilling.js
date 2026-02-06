import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { sdk } from '../lib/sdk'
import { pickErrorMessage } from '../lib/utils'

// Frontend1-compatible hook (no Redux).
// Provides: plans, loading, reload, create, update, remove
export function useBilling() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      const res = await sdk.admin.listBillingPlans()
      const arr = Array.isArray(res) ? res : res?.items || []
      setPlans(arr)
      return arr
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to load billing plans')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (payload) => {
    try {
      setLoading(true)
      const created = await sdk.admin.createBillingPlan(payload)
      setPlans((prev) => [created, ...prev])
      toast.success('Billing plan created')
      return created
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to create billing plan')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (id, payload) => {
    try {
      setLoading(true)
      const updated = await sdk.admin.updateBillingPlan(id, payload)
      setPlans((prev) => prev.map((p) => (p?._id === id || p?.id === id ? updated : p)))
      toast.success('Billing plan updated')
      return updated
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to update billing plan')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (id) => {
    try {
      setLoading(true)
      await sdk.admin.deleteBillingPlan(id)
      setPlans((prev) => prev.filter((p) => (p?._id || p?.id) !== id))
      toast.success('Billing plan deleted')
      return true
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to delete billing plan')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // lazy-load once
    reload().catch(() => {})
  }, [reload])

  const stats = useMemo(() => ({ total: plans.length }), [plans.length])

  return { plans, loading, reload, create, update, remove, stats }
}