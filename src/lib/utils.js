import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatMoney(n) {
  const num = Number(n || 0)
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(num)
}

export function formatDate(d) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(dt)
  } catch {
    return String(d)
  }
}

export function formatDateTime(d) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dt)
  } catch {
    return String(d)
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function pickErrorMessage(err) {
  // Axios error format
  const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message
  return msg || 'Something went wrong'
}


export function formatPercent(v, digits=0) {
  const num = Number(v)
  if (!Number.isFinite(num)) return '—'
  return `${(num * (num <= 1 ? 100 : 1)).toFixed(digits)}%`
}

export function toPoint(lng, lat) {
  const Lng = Number(lng)
  const Lat = Number(lat)
  return { type: 'Point', coordinates: [Lng, Lat] }
}
