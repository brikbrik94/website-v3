# Konzept: Echtzeit-Datenübertragung (ADS-B & AIS)

Dieses Dokument beschreibt verschiedene Ansätze, um die bisherige Polling-Logik (Abfrage alle 10s) durch eine Echtzeit-Übertragung zu ersetzen.

## Übersicht der Ansätze

### 1. Server-Sent Events (SSE)
Standardisiertes HTTP-Protokoll für unidirektionale Server-Pushes.

*   **Funktionsweise:** Der Browser öffnet eine dauerhafte HTTP-Verbindung (`EventSource`). Der Server sendet Daten-Events, sobald neue Informationen vorliegen.
*   **Vorteile:**
    *   Einfache Implementierung in PHP oder Node.js.
    *   Automatischer Reconnect durch den Browser.
    *   Läuft über Standard-Port 80/443 (Firewall-freundlich).
*   **Nachteile:**
    *   Nur Einweg-Kommunikation (Server -> Client).
    *   Blockiert PHP-Worker bei klassischer CGI/FPM-Nutzung.

### 2. WebSockets (Socket.io / Native)
Bidirektionale Vollduplex-Verbindung.

*   **Funktionsweise:** Nach einem HTTP-Handshake wird die Verbindung auf ein binäres Protokoll umgestellt.
*   **Vorteile:**
    *   Geringste Latenz (< 50ms möglich).
    *   Zwei-Wege-Kommunikation (z.B. für Filter-Befehle vom Client).
    *   Sehr effizient bei hohen Datenraten.
*   **Nachteile:**
    *   Erfordert einen dedizierten Hintergrunddienst (Node.js, Go, Python).
    *   Eventuell Anpassung der Nginx-Konfiguration (Proxy-Upgrade) nötig.

### 3. MQTT over WebSockets
Nachrichten-basiertes Protokoll (Publish/Subscribe), Standard im IoT-Bereich.

*   **Funktionsweise:** Ein MQTT-Broker (z.B. Mosquitto) verwaltet "Topics" (z.B. `/tracking/adsb`). Der Browser abonniert diese via WebSockets.
*   **Vorteile:**
    *   Sehr mächtige Filterung auf Protokoll-Ebene.
    *   Einfache Anbindung weiterer Sensoren/Empfänger.
*   **Nachteile:**
    *   Zusätzliche Infrastruktur (Broker) erforderlich.

---

## Empfohlene Architektur: Node.js "Realtime-Bridge"

Um die bestehende Infrastruktur minimal-invasiv zu erweitern, empfiehlt sich eine kleine Node.js Bridge:

1.  **Backend:** Ein Node-Script nutzt `chokidar` um die lokalen JSON-Dateien (`aircraft.json` / `ships.json`) zu überwachen.
2.  **Stream:** Bei jeder Änderung wird der Inhalt (oder nur das Delta) via **Socket.io** an alle verbundenen Clients gepusht.
3.  **Frontend:** Die `MapPage` / `TrackingPage` lauscht auf `socket.on('update', ...)` und aktualisiert die Karte sofort.

### Nächste Schritte
1.  Prüfen der Verfügbarkeit von Node.js auf dem Ziel-Server.
2.  Entscheidung für SSE (einfacher) oder WebSockets (performanter).
3.  Implementierung eines Prototyps für einen Daten-Stream.
