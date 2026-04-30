import json
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

# Konfiguration
DB_URL = "postgresql://emergency_admin@localhost:5432/emergency_db"
ORS_URL = "https://ors.oe5ith.at/matrix/driving-car"
# API_KEY sollte in Produktion sicher injiziert werden
API_KEY = "DEIN_KEY" 

def get_nearest_stations(target_lat, target_lon, station_type='sew'):
    """
    Findet die 5 schnellsten Stützpunkte für einen Zielort.
    """
    
    # 1. DB Abfrage: 20 nächstgelegene Stationen (Luftlinie)
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    filter_col = "has_transport" if station_type == 'sew' else "has_doctor"
    
    query = f"""
        SELECT id, name, organization, ST_Y(geom) as lat, ST_X(geom) as lon
        FROM emergency.stations
        WHERE {filter_col} = 'yes'
        ORDER BY geom <-> ST_SetSRID(ST_Point(%s, %s), 4326)
        LIMIT 20;
    """
    
    cur.execute(query, (target_lon, target_lat))
    stations = cur.fetchall()
    cur.close()
    conn.close()
    
    if not stations:
        return []

    # 2. ORS Matrix Abfrage
    # Startpunkte = Stationen, Ziel = target
    locations = [[s['lon'], s['lat']] for s in stations] + [[target_lon, target_lat]]
    target_index = len(locations) - 1
    
    payload = {
        "locations": locations,
        "sources": list(range(len(stations))),
        "destinations": [target_index],
        "metrics": ["duration", "distance"]
    }
    
    headers = {
        "Authorization": API_KEY,
        "Content-Type": "application/json"
    }
    
    response = requests.post(ORS_URL, json=payload, headers=headers)
    matrix = response.json()
    
    # 3. Ergebnisse kombinieren und sortieren
    results = []
    for i, s in enumerate(stations):
        duration = matrix['durations'][i][0]
        distance = matrix['distances'][i][0]
        
        if duration is not None:
            results.append({
                "id": s['id'],
                "name": s['name'],
                "org": s['organization'],
                "lat": s['lat'],
                "lon": s['lon'],
                "duration": duration,
                "distance": distance
            })
    
    # Sortieren nach Fahrzeit und Top 5 zurückgeben
    results.sort(key=lambda x: x['duration'])
    return results[:5]

if __name__ == "__main__":
    # Beispiel-Test
    res = get_nearest_stations(48.3064, 14.2858, 'sew')
    print(json.dumps(res, indent=2))
