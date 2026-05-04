# API Endpoints & Service Health Documentation

Dieses Dokument beschreibt alle technischen Endpunkte, die von der Website für den Live-Betrieb und den Service Health Check verwendet werden.

## Übersicht der Dienste

| Dienst | Frontend-URL | Backend-Proxy | Ziel-Adresse (Config) |
|---|---|---|---|
| **Backend Core** | `/api/ping` | `ping.php` | Lokal (PHP-Runtime) |
| **PostgreSQL DB** | `/api/db` | `db.php` | `DB_HOST` (Verbindungstest) |
| **NAH Service** | `/api/nah` | `nah.php` | `DB_HOST` (PostGIS Datenbank) |
| **Routing API** | `/api/ors/status` | `ors.php` | `ORS_URL` (standard: https://ors.oe5ith.at) |
| **Geocoder** | `/api/geocoder` | `geocoder.php` | `NOMINATIM_URL` (https://geocoder.oe5ith.at) |
| **Tile Registry** | `https://tiles.oe5ith.at/...` | Direkter Aufruf | Externer Cloud-Speicher / Tile-Server |

## Detail-Beschreibung

### 1. Backend Core (PHP)
- **Frontend:** `/api/ping`
- **Funktion:** Prüft, ob der PHP-Server reagiert.
- **Logik:** Einfaches JSON-Echo. Keine externen Abhängigkeiten.

### 2. PostgreSQL Datenbank (Health Check)
- **Frontend:** `/api/db`
- **Funktion:** Prüft die direkte Verbindung zur Datenbank.
- **Logik:** Führt `SELECT version()` aus und liefert die PostgreSQL Version sowie die Uptime zurück.
- **Ziel:** `DB_HOST` aus der `api/config.php`.

### 3. NAH Service (Anwendungsdaten)
- **Frontend:** `/api/nah`
- **Funktion:** Liefert die Hubschrauber-Daten und berechnet die Verfügbarkeit.
- **Abhängigkeit:** Nutzt ebenfalls die Datenbank. Wenn `/api/db` grün ist, aber `/api/nah` rot, liegt ein Fehler in der Abfrage-Logik oder den Tabellen vor.

### 3. Routing Engine (ORS Proxy)
- **Frontend:** `/api/ors/*`
- **Funktion:** Leitet Routing-Anfragen an den OpenRouteService weiter.
- **Backend:** `ors.php` nutzt die Konstante `ORS_URL` aus der `config.php`.
- **Health Check:** Nutzt `/api/ors/status` (entspricht `ORS_URL/status`). Dieser Endpunkt benötigt keinen API-Key.

### 4. Geocoder (Nominatim Proxy)
- **Frontend:** `/api/geocoder`
- **Funktion:** Adress-Suche und Reverse-Geocoding.
- **Backend:** `geocoder.php` nutzt `NOMINATIM_URL` aus der `config.php`.

### 5. Vektorkarten (Tile Server)
- **URL:** `https://tiles.oe5ith.at/inventory.json`
- **Funktion:** Verzeichnis aller verfügbaren Basemaps und Overlays.
- **Hinweis:** Wird vom Frontend direkt (ohne PHP-Proxy) abgefragt. Erfordert korrekte CORS-Header auf dem Tile-Server.

## Migration auf Produktiv-Server
Bei einer Verschiebung der Anwendung müssen folgende Schritte geprüft werden:
1. **api/config.php:** Alle Konstanten (`DB_HOST`, `ORS_URL`, etc.) auf die neuen Produktiv-IPs/Domains anpassen.
2. **Netzwerk-Zugriff:** Der Server muss ausgehende Verbindungen zu `ORS_URL` und `NOMINATIM_URL` erlauben.
3. **Datenbank:** Zugriffsberechtigungen für `DB_USER` auf der neuen Instanz sicherstellen.
