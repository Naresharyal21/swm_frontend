import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { sdk } from '../lib/sdk'
import { pickErrorMessage } from '../lib/utils'

export function useRoutes(params) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      const res = await sdk.ops.listRoutes(params)
      const arr = Array.isArray(res) ? res : res?.items || []
      setItems(arr)
      return arr
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to load routes')
      throw e
    } finally {
      setLoading(false)
    }
  }, [params])

  const generate = useCallback(async (payload) => {
    try {
      setLoading(true)
      const res = await sdk.ops.generateRoutes(payload)
      toast.success('Routes generated')
      await reload()
      return res
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to generate routes')
      throw e
    } finally {
      setLoading(false)
    }
  }, [reload])

  const publish = useCallback(async (id) => {
    try {
      setLoading(true)
      const res = await sdk.ops.publishRoute(id)
      toast.success('Route published')
      await reload()
      return res
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to publish route')
      throw e
    } finally {
      setLoading(false)
    }
  }, [reload])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  const stats = useMemo(() => ({ total: items.length }), [items.length])

  return { items, loading, reload, generate, publish, stats }
}