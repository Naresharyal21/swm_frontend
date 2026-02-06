import { useEffect, useMemo, useState } from 'react'

export function useFilePreviews(files) {
  const [urls, setUrls] = useState([])
  const list = useMemo(() => Array.from(files || []), [files])

  useEffect(() => {
    const created = list.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    setUrls(created)

    return () => {
      created.forEach((x) => URL.revokeObjectURL(x.url))
    }
  }, [list])

  return urls
}
