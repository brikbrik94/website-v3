# Nginx-Sync für map.oe5ith.at

Der Nginx-Vhost (`nginx.conf`, Repo-Root) wird **nicht** von `./deploy-website.sh` mit ausgerollt
— das Skript syncet nur `dist/` und `api/` nach `/var/www/map.oe5ith.at` und reloaded nginx am
Ende, fasst `/etc/nginx` aber nie an. Änderungen an `nginx.conf` müssen daher **manuell**
nachgezogen werden.

## Aktueller Stand (2026-08-30)

`nginx.conf` im Repo ist bereits auf dem Routing-Endpoint-Umbau (`ors.php`/`valhalla.php` →
`routing-proxy.php`, Commit `46ee4fb`). Auf dem Server liegt unter
`/etc/nginx/sites-available/map.oe5ith.at.conf` noch die **alte** Version — dort fehlen:

- `limit_req_zone $binary_remote_addr zone=routing_limit:10m rate=10r/s;`
- `location = /api/routing-proxy.php { … }`
- `location = /api/nearest-stations.php { … }`

Folge: Diese beiden Endpoints laufen live aktuell nur über den generischen `~ \.php$`-Handler —
ohne Rate-Limit und ohne Referer-Check. Kein Ausfall, aber die in `46ee4fb` eingeführte
Zugriffsbeschränkung fehlt live, solange der Sync nicht gemacht wurde.

## Sync-Schritte (vor dem nächsten Deploy ausführen)

```bash
# 1. Backup der aktuell live liegenden Config
cp /etc/nginx/sites-available/map.oe5ith.at.conf{,.bak-$(date +%Y%m%d)}

# 2. Repo-Version drüberkopieren
cp nginx.conf /etc/nginx/sites-available/map.oe5ith.at.conf

# 3. Sync verifizieren (muss leer sein)
diff nginx.conf /etc/nginx/sites-available/map.oe5ith.at.conf

# 4. Syntax-Check, erst dann reloaden
nginx -t && systemctl reload nginx
```

## Funktionale Verifikation danach

```bash
curl -sI https://map.oe5ith.at/api/routing-proxy.php
curl -sI https://map.oe5ith.at/api/nearest-stations.php
```

Erwartung: normale Antwort wie bisher (kein 403/404/502) — der Unterschied
(Rate-Limit/Referer-Check) zeigt sich erst bei Missbrauch bzw. fremdem Referer, nicht im
Normalfall.

Danach ganz normal mit `./deploy-website.sh` weiter (Build + `dist`/`api`-Sync + Reload).
