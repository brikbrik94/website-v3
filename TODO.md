# Projekt TODOs

Hier werden neue Aufgaben erfasst. Abgeschlossene Aufgaben wurden ins [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) verschoben.

- [ ] **TrackingPage Debugging & Stabilisierung**
    - [ ] **Ursachenanalyse:** Trotz erfolgreicher Datenabfrage (PHP Proxy liefert valides JSON) werden keine Symbole auf der Karte gerendert.
    - [ ] **Proxy-Konfiguration:** Der Proxy für AIS meldet "502 Bad Gateway". Die Seite muss robust genug sein, um trotzdem ADS-B anzuzeigen (Refactoring des `refresh`-Loops).
    - [ ] **Modul-Konflikt:** TypeScript-Interpreter im `/api` Ordner kollidieren mit dem Vite-Proxy. Finale Entscheidung über den Ort (`src/api` vs. `/api`) und entsprechende Anpassung der Importe.
    - [ ] **CI-Konformität:** Sicherstellen, dass die `TrackingPage` das Inventar von `tiles.oe5ith.at` nutzt und keine hardcodierten Basemaps verwendet.
    - [ ] **Sprite-Management:** Verifizieren, dass die Sprites (`plane-a1`, `ship-unknown`) korrekt in MapLibre registriert sind und nach einem Stil-Wechsel erhalten bleiben.
    - [ ] **Vite-Integration:** Sicherstellen, dass der Vite-Server neue Dateien ohne manuellen Neustart erkennt (HMR-Problematik prüfen).
