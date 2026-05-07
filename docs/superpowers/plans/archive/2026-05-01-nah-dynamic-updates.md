# Dynamic NAH Status Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 30-minute reload interval with a precise, server-calculated update trigger to ensure NAH station status changes (sunset, fixed end) are reflected immediately.

**Architecture:** The PHP backend calculates the "next event" for all stations and returns the earliest one as `refresh_at`. The frontend uses this to schedule a `setTimeout` for the next data fetch.

**Tech Stack:** PHP, TypeScript, MapLibre GL JS.

---

### Task 1: Enhance Backend API with Refresh Logic

**Files:**
- Modify: `api/nah.php`

- [ ] **Step 1: Track the next event timestamp in PHP**
Modify `api/nah.php` to initialize a `$nextEvent` variable and update it during the station loop.

```php
// api/nah.php changes
$nextRefresh = null;

// Inside foreach ($stations as $s) loop:
// ... after calculating $isActive ...

$stationNextEvent = null;
if ($s['op_type'] === 'daylight') {
    $sunInfo = date_sun_info($now, (float)$s['lat'], (float)$s['lon']);
    if ($isActive) {
        // Next event is sunset
        $stationNextEvent = $sunInfo['sunset'];
        if (!empty($s['fixed_end'])) {
             $fixedEndTs = strtotime(date('Y-m-d ') . $s['fixed_end']);
             $stationNextEvent = min($stationNextEvent, $fixedEndTs);
        }
    } else {
        // Next event is sunrise (or fixed start if earlier)
        $stationNextEvent = $sunInfo['sunrise'];
        if (!empty($s['fixed_start'])) {
             $fixedStartTs = strtotime(date('Y-m-d ') . $s['fixed_start']);
             if ($fixedStartTs > $now) {
                 $stationNextEvent = min($stationNextEvent, $fixedStartTs);
             }
        }
        // If sunrise is already in the past today, we might need tomorrow's sunrise, 
        // but for now, any event > $now is fine.
    }
} elseif ($s['op_type'] === 'fixed') {
    $startTs = strtotime(date('Y-m-d ') . $s['fixed_start']);
    $endTs = strtotime(date('Y-m-d ') . $s['fixed_end']);
    if ($now < $startTs) $stationNextEvent = $startTs;
    elseif ($now < $endTs) $stationNextEvent = $endTs;
}

if ($stationNextEvent && $stationNextEvent > $now) {
    if ($nextRefresh === null || $stationNextEvent < $nextRefresh) {
        $nextRefresh = $stationNextEvent;
    }
}
```

- [ ] **Step 2: Output `refresh_at` in the JSON response**
Ensure the final JSON contains the ISO-8601 formatted timestamp.

```php
// api/nah.php changes
echo json_encode([
    "refresh_at" => $nextRefresh ? date('c', $nextRefresh) : date('c', $now + 3600), // Default to 1h if no event
    "stations" => $results
]);
```

- [ ] **Step 3: Verify the API output manually**
Run: `curl -s http://100.64.0.1:8000/api/nah.php | jq .refresh_at`
Expected: A valid ISO timestamp in the future.

- [ ] **Step 4: Commit backend changes**
```bash
git add api/nah.php
git commit -m "feat(api): add refresh_at timestamp to NAH API"
```

---

### Task 2: Implement Precise Frontend Reloading

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Update `refreshStations` to handle the new JSON structure**
Change the data extraction logic since the response is now an object, not an array.

```typescript
// src/pages/NahPage.ts
export const refreshStations = async (map: maplibregl.Map, sidebarResults?: HTMLElement) => {
  try {
    const nahRes = await fetch('/api/nah');
    if (!nahRes.ok) throw new Error(`API Error: ${nahRes.status}`);
    const data = await nahRes.json();
    stations = data.stations; // Update global stations variable
    
    // ... rest of marker logic ...

    // Schedule next refresh
    if (data.refresh_at) {
        scheduleNextRefresh(map, sidebarResults, data.refresh_at);
    }
  } catch (err) {
      // ... error handling ...
  }
}
```

- [ ] **Step 2: Implement `scheduleNextRefresh`**
Create a helper function to manage the `setTimeout`.

```typescript
// src/pages/NahPage.ts
let refreshTimeout: any = null;

const scheduleNextRefresh = (map: maplibregl.Map, sidebarResults: HTMLElement | undefined, refreshAt: string) => {
    if (refreshTimeout) clearTimeout(refreshTimeout);

    const targetTime = new Date(refreshAt).getTime();
    const now = Date.now();
    const delay = targetTime - now + 10000; // 10 seconds buffer

    const finalDelay = Math.max(delay, 30000); // Minimum 30s to prevent spamming
    
    console.log(`[NahPage] Next reload scheduled in ${Math.round(finalDelay/1000)}s at ${new Date(targetTime + 10000).toLocaleTimeString()}`);

    refreshTimeout = setTimeout(async () => {
        await refreshStations(map, sidebarResults);
        if (currentIncidentCoord && sidebarResults) {
            performCalculation(map, sidebarResults, currentIncidentCoord[0], currentIncidentCoord[1]);
        }
    }, finalDelay);
};
```

- [ ] **Step 3: Replace `initScheduler` with the new logic**
Remove the `setInterval` logic.

```typescript
// src/pages/NahPage.ts
// Remove initScheduler function and its usage.
// Ensure refreshStations is called initially and it will trigger the chain.
```

- [ ] **Step 4: Verify in browser console**
Check logs for: `[NahPage] Next reload scheduled in ...`

- [ ] **Step 5: Commit frontend changes**
```bash
git add src/pages/NahPage.ts
git commit -m "feat(ui): implement dynamic NAH reload based on server timestamp"
```

---

### Task 3: Final Verification

- [ ] **Step 1: Mock a status change**
Temporarily modify a station in the database to have a `fixed_end` 1 minute from now.
- [ ] **Step 2: Observe the reload**
Verify that `refreshStations` is called automatically when the time is reached and the helicopter icon changes color.
- [ ] **Step 3: Revert mock data**
Undo database changes.
- [ ] **Step 4: Final commit and cleanup**
```bash
git commit --allow-empty -m "test: verified dynamic NAH status updates"
```
