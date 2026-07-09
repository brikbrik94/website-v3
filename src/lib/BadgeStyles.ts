/**
 * Kanonische Badge-CSS-Klassen aus oe5ith-ci (docs/badges.md, "6 Varianten").
 * Zentraler Typ, damit Status→Badge-Mappings in den Feature-Dateien (NahPopupBuilder,
 * TrackingSidebar, RoutingSidebar, …) gegen dieselbe, tippfehler-sichere Klassenliste
 * geprüft werden, statt jede Datei ihre eigenen Literal-Strings pflegen zu lassen.
 */
export type BadgeClass =
  | 'badge-blue'
  | 'badge-green'
  | 'badge-yellow'
  | 'badge-red'
  | 'badge-gray'
  | 'badge-purple';
