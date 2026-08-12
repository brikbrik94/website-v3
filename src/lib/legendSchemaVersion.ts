/**
 * Vergleicht einen Schema-"version"-String (z.B. "1.1") numerisch gegen ein Minimum
 * major.minor — nicht als String (geodata-plugin-standard §5.6: ein Client muss `version`
 * numerisch nach major.minor vergleichen). Fehlender/kaputter Wert gilt als vor der
 * angefragten Version (Gate schlägt fehl) — ein Client darf neues Verhalten nur bei
 * explizitem Versions-Signal annehmen.
 */
export function isLegendSchemaAtLeast(version: string | null | undefined, minMajor: number, minMinor: number): boolean {
  if (!version) return false;
  const [major, minor] = version.split('.').map(Number);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return false;
  return major > minMajor || (major === minMajor && minor >= minMinor);
}
