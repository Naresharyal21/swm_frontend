import { useTheme as useNextTheme } from 'next-themes'

// Compatibility hook similar to frontend1
export function useTheme() {
  const t = useNextTheme()
  const theme = t.theme
  const setTheme = t.setTheme
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return { ...t, theme, setTheme, toggleTheme }
}
