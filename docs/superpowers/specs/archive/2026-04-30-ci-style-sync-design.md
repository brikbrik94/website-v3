# Design Spec: CI Style Synchronization

## Purpose
Synchronize the latest Corporate Identity (CI) styles from the `oe5ith-ci` submodule to the main project's `src/styles/` directory. This specifically includes the recently updated MapLibre popup styles in `modal.css` and ensures all other CI components are up to date.

## Architecture
- **Submodule Source:** `oe5ith-ci/css/` contains the master CSS files.
- **Project Destination:** `src/styles/` is where the application consumes the styles.
- **Consistency Mandate:** The project `GEMINI.md` requires strict adherence to the CI styles.

## Proposed Changes
### 1. Style Synchronization
- Perform a bulk copy of all `.css` files from the submodule to the source directory.
- This overwrites existing files in `src/styles/` with the latest versions from the submodule.

### 2. Verification
- Verify that `src/styles/modal.css` contains the `.maplibregl-popup-content` rules and that they are not commented out.
- Check the `NahPage` to ensure popups now use the CI design.

## Data Flow
1. User updates CI repo (already done).
2. Agent updates submodule to latest commit (already done).
3. Agent copies files: `oe5ith-ci/css/*.css` -> `src/styles/`.
4. Vite dev server detects changes and reloads styles.

## Testing Strategy
- **Manual Verification:** Inspect `src/styles/modal.css` content.
- **Visual Check:** (User-side) Verify popup appearance on the NAH page.
