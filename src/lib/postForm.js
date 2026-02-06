export function postForm(actionUrl, fields) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = actionUrl

  Object.entries(fields || {}).forEach(([name, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = String(value ?? '')
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
}
