# Dashboard Filter Fix

## Issue
The dashboard filter for applications by course (Études uniquement, Études + Football, Football uniquement) was not working. While the filter UI existed and updated the internal `selectedProject` variable, the dashboard display (KPIs, charts, and recent applications table) was always showing all data regardless of the filter selection.

## Root Cause
In `js/dashboard.js`, the `loadDashboard()` function was fetching all data from the `/api/dashboard` endpoint and displaying it directly without applying the currently selected filter. The filter was only being applied to the export functionality.

## Fix Applied
Modified the `loadDashboard()` function in `js/dashboard.js` to:

1. Fetch all data from the API (unchanged)
2. Create a filtered dataset based on the `selectedProject` variable:
   - When `selectedProject === 'all'`: use all data
   - When `selectedProject` is 'etudes', 'both', or 'football': filter to only include rows where `row.projet === selectedProject`
3. Calculate all statistics (KPIs, charts, recent table) from this filtered dataset instead of the full dataset
4. Keep the original `exportRows` as the full dataset to ensure export functionality continues to work correctly

## Files Changed
- `js/dashboard.js` - Applied filtering logic to dashboard display

## Verification
The fix ensures that:
- KPI cards show counts for the selected filter only
- Projects chart shows distribution for the selected filter only
- Sources chart shows sources for the selected filter only
- Months chart shows timeline for the selected filter only
- Recent applications table shows only applications matching the selected filter
- Export functionality continues to work correctly (exports data matching the selected filter)

The filter now works as expected, showing users only the data relevant to their selected course type filter.