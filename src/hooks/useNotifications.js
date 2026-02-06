import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { sdk } from '../lib/sdk'
import { pickErrorMessage } from '../lib/utils'

export function useNotifications(params) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      const res = await sdk.citizen.notifications(params)
      const arr = Array.isArray(res) ? res : res?.items || []
      setItems(arr)
      return arr
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to load notifications')
      throw e
    } finally {
      setLoading(false)
    }
  }, [params])

  const markRead = useCallback(async (id) => {
    try {
      await sdk.citizen.markNotificationRead(id)
      setItems((prev) => prev.map((n) => ((n?._id || n?.id) === id ? { ...n, isRead: true, read: true } : n)))
      return true
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to mark as read')
      throw e
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await sdk.citizen.markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })))
      return true
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to mark all read')
      throw e
    }
  }, [])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  const unreadCount = useMemo(() => items.filter((n) => !(n?.isRead || n?.read)).length, [items])

  return { items, loading, reload, markRead, markAllRead, unreadCount }
}