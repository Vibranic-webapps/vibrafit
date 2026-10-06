// Password + name rules shared by the server (validation) and the client
// (signup checklist, input maxlength). One source, so the two can't drift apart.
//
// Each rule has a stable id, not a label: the API returns failed ids in
// `data.problems`, and the UI maps them to i18n strings.

export const NAME_MAX = 40

export const PASSWORD_RULES = [
  { id: 'length', test: (v: string) => v.length > 8 }, // "more than 8 characters"
  { id: 'lower', test: (v: string) => /[a-z]/.test(v) },
  { id: 'upper', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'number', test: (v: string) => /[0-9]/.test(v) },
] as const

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]['id']

export function passwordProblems(value: string): PasswordRuleId[] {
  return PASSWORD_RULES.filter((r) => !r.test(value)).map((r) => r.id)
}
