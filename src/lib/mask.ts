// Preview-only masking for search results (TDD's search_dashboard spec:
// "masked phone/email preview"). Full values are shown on the record_detail
// view (F8) once a staff member clicks through.
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 1)
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const last4 = digits.slice(-4)
  return `${'*'.repeat(Math.max(digits.length - 4, 3))}${last4}`
}
