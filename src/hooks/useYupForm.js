import { useCallback, useEffect, useMemo, useState } from 'react'

function setByPath(obj, path, value) {
  const parts = String(path).split('.')
  const next = { ...(obj || {}) }
  let cur = next

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    const existing = cur[key]
    cur[key] = existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {}
    cur = cur[key]
  }

  cur[parts[parts.length - 1]] = value
  return next
}

function normalizeYupErrors(err) {
  const map = {}
  if (err?.inner && Array.isArray(err.inner) && err.inner.length) {
    for (const e of err.inner) {
      if (e?.path && map[e.path] == null) map[e.path] = e.message
    }
  } else if (err?.path) {
    map[err.path] = err.message
  } else {
    map._ = 'Invalid form'
  }
  return map
}

export function useYupForm({ initialValues, schema, onSubmit, validateOnChange = true }) {
  const [values, setValues] = useState(initialValues || {})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = useCallback(
    async (vals) => {
      if (!schema) {
        setErrors({})
        return { valid: true }
      }
      try {
        await schema.validate(vals, { abortEarly: false })
        setErrors({})
        return { valid: true }
      } catch (err) {
        const map = normalizeYupErrors(err)
        setErrors(map)
        return { valid: false, errors: map }
      }
    },
    [schema]
  )

  useEffect(() => {
    if (!validateOnChange) return
    const t = setTimeout(() => {
      validate(values)
    }, 0)
    return () => clearTimeout(t)
  }, [validateOnChange, validate, values])

  const handleChange = useCallback((e) => {
    const { name, type } = e.target
    const v = type === 'checkbox' ? e.target.checked : e.target.value
    setValues((prev) => setByPath(prev, name, v))
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const setFieldValue = useCallback((name, v) => {
    setValues((prev) => setByPath(prev, name, v))
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const reset = useCallback(() => {
    setValues(initialValues || {})
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.()
      setIsSubmitting(true)
      const res = await validate(values)
      if (!res.valid) {
        setIsSubmitting(false)
        return { ok: false, errors: res.errors }
      }

      try {
        const out = await onSubmit?.(values)
        setIsSubmitting(false)
        return { ok: true, data: out }
      } catch (err) {
        setIsSubmitting(false)
        throw err
      }
    },
    [onSubmit, validate, values]
  )

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors])

  return {
    values,
    setValues,
    errors,
    touched,
    isSubmitting,
    isValid,
    validate,
    handleChange,
    setFieldValue,
    handleSubmit,
    reset
  }
}
