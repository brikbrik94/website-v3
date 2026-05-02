# Design Spec: Regions Analyse Module

**Status:** Draft  
**Author:** Gemini CLI  
**Date:** 2026-05-01

## 1. Overview
The "Regions Analyse" module provides a high-level overview of the availability of Emergency Medical Helicopter (NAH) stations grouped by their respective regions (organizations like ÖAMTC, ARA, etc.). This allows users to quickly see which organizations are fully operational or limited in their service.

## 2. UI / Component Architecture

### 2.1 Sidebar Integration
- **Path:** `/info/regions`
- **Icon:** `fa-solid fa-map-location`
- **Label:** "Regions Analyse"
- **Placement:** Below "Service Health" in the Module section.

### 2.2 Main Layout
- **Header:** Similar to NAH Status/Health modules.
  - Title: `Regions <span>Analyse</span>`
  - Subtitle: `Verfügbarkeit nach Organisation und Einsatzgebieten.`
  - Meta: Timestamp of last update.
  - Action: Refresh button.
- **Body:** A `card-grid` containing Typ 2 Dashboard Cards.

### 2.3 Regional Cards (Typ 2 Dashboard Card)
Each card represents one region (e.g., "ÖAMTC", "ARA", "BMI").
- **Title (`h3`):** Region Name.
- **Content (`p`):** Active / Total count (e.g., `12 / 14 Stationen`).
- **Badge:** Percentage badge (e.g., `<span class="badge badge-gray">85%</span>`).
- **Status Dot (`card-status-dot`):**
  - `.online`: 100% active.
  - `.unknown`: > 0% and < 100% active.
  - `.offline`: 0% active.

## 3. Data Processing

### 3.1 Fetching
- **Endpoint:** `/api/nah`
- **Interval:** 30 seconds (automatic refresh).

### 3.2 Grouping Logic
1. Iterate through `stations` array.
2. Group by `region` field.
3. For each group:
   - `total = count(stations)`
   - `active = count(stations where is_active == true)`
   - `percentage = round((active / total) * 100)`

## 4. Technical Implementation Details

### 4.1 Module Function
`renderRegionsModule(mount: HTMLElement)`:
- Handles its own state (last fetch, timer).
- Renders initial skeleton.
- Performs fetch and updates DOM.
- Implements `setInterval` with `mount.isConnected` check.

### 4.2 Error Handling
- Display error message with retry logic if API fails.
- Show loading state on manual refresh.

## 5. Mockup / Structure
```html
<div class="card card-dashboard">
  <div class="card-status-dot online"></div>
  <span class="badge badge-gray" style="position: absolute; top: 14px; left: 14px;">100%</span>
  <h3>ÖAMTC</h3>
  <p>28 / 28 Stationen</p>
</div>
```
*(Note: Position of badge might be adjusted to fit alongside or below title if top-right is taken by dot)*
Actually, CI says status dot is top-right. I'll put the badge next to the percentage or as part of the content.

Wait, looking at `NahPage.ts` or `InfoPage.ts` existing modules might help for badge placement.
In `renderNahStatusModule`, badges are in the table.
In `renderStatsCards`, they use raw divs for numbers.

I'll stick to a clean layout:
- Dot: Top-Right (Mandatory for Typ 2).
- Title: Middle.
- Subtitle: Count + Badge.

## 6. Verification Plan
- [ ] Confirm sidebar item navigates correctly.
- [ ] Verify correct grouping of stations (no duplicates or missed stations).
- [ ] Check status dot logic (100% = green, 0% = red, middle = yellow).
- [ ] Ensure 30s refresh works and stops when navigating away.
