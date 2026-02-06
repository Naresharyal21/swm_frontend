import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { sdk } from '../../../lib/sdk'
import { pickErrorMessage } from '../../../lib/utils'

export function useTodayRoute(params) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      const res = await sdk.crew.todayRoute(params)
      setData(res)
      return res
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to load today route')
      throw e
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  return { data, loading, reload }
}