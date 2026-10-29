export function formatValidationErrors(
  issues: { path?: { key: string | number }[]; message: string }[],
): Record<string, string> {
  return Object.fromEntries(
    issues.map((issue) => [String(issue.path?.[0]?.key ?? ''), issue.message]),
  )
}
