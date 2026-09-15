/**
 * Renders a JS string array as a Postgres array literal.
 *
 * Interpolating an array straight into a drizzle `sql` template yields a
 * record, not an array -- Postgres then reports "cannot cast type record to
 * text[]". The literal is passed as a SINGLE bound parameter and cast on the
 * server, so it stays injection-safe however the values were obtained.
 */
export function pgTextArray(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${escaped.join(",")}}`;
}
