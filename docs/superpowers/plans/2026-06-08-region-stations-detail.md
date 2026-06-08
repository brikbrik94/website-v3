# Implementation Plan: Region Stations Detail View

## Metadata
- Issue/Request: Add detailed table view for stations when clicking a region/state in the Regions Analysis.
- Date: 2026-06-08

## Overview
When a user clicks on a state card in the "Regions Analyse" module (`RegionsModule.ts`), the view should transition to a detail page showing a table of all RD and NEF stations in that state. A "Back" button will return the user to the main overview. We will implement a new API endpoint to supply this data.

## Tasks

### Task 1: Create API Endpoint
**Files:**
- Create: `api/region_stations.php`

- [x] **Step 1: Implement Database Query**
Create `api/region_stations.php` that expects a `state` parameter via `GET`.
Use `pg_query_params` to prevent SQL injection.
The query should `UNION ALL` both `emergency.rd_stations` and `emergency.nef_stations` filtered by the `state` column.
Return the columns: `id`, `type` ('RD' or 'NEF'), `name`, `short_name`, `organization` (as `org`).
Order by `type`, `org`, `short_name`.
- [x] **Step 2: Output JSON**
Encode the result as JSON and return it with `application/json` header.
- [x] **Step 3: Test API**
(Manually or via curl).

### Task 2: Implement UI Detail View
**Files:**
- Modify: `src/components/info/RegionsModule.ts`

- [x] **Step 1: Make Cards Clickable**
In `renderData()`, add CSS classes `cursor-pointer` to the `.card-dashboard` elements representing the States (RD & NEF).
Add a `data-state="${state}"` attribute to the card.
- [x] **Step 2: Add Event Listeners**
Attach click event listeners to these cards. When clicked, call a new function `showRegionDetail(state)`.
- [x] **Step 3: Implement `showRegionDetail(state)`**
Clear the `refreshTimeout` so we don't accidentally override the view.
Replace the main container's HTML with a sub-page layout:
  - Header: Contains a Back button (`<i class="fa-solid fa-arrow-left"></i> Zurück`) and the State Name as title.
  - Body: A loading spinner.
Fetch data from `/api/region_stations.php?state=${state}`.
Render the results into a `.ci-table` inside a `.table-wrapper`.
Columns: Typ (badge), Organisation, Kurzname, Name.
- [x] **Step 4: Implement Back Button Logic**
When the back button is clicked, restore the original HTML structure (including the `page-header` and `content-body` shells) and call `fetchData()` to reload the overview.
- [x] **Step 5: Build & Verify**
Run `npx tsc --noEmit`.
- [x] **Step 6: Commit Changes**
Commit all files with appropriate message.
