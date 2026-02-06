import { useAuth as useAuthFromProvider } from '../providers/AuthProvider'

// Compatibility hook (frontend1-style name)
export function useAuth() {
  return useAuthFromProvider()
}
