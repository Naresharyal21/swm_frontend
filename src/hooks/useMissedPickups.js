import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { sdk } from '../lib/sdk'
import { pickErrorMessage } from '../lib/utils'

// Frontend1-compatible hook (minimal): create + local list cache.
// Backend SDK in this app exposes createMissedPickup; listing is typically via citizen cases.
export function useMissedPickups() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const create = useCallback(async (payload) => {
    try {
      setLoading(true)
      const created = await sdk.citizen.createMissedPickup(payload)
      setItems((prev) => [created, ...prev])
      toast.success('Missed pickup reported')
      return created
    } catch (e) {
      toast.error(pickErrorMessage(e) || 'Failed to report missed pickup')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const clearAll = useCallback(() => setItems([]), [])

  const stats = useMemo(() => ({ total: items.length }), [items.length])

  return { items, loading, create, clearAll, stats }
}