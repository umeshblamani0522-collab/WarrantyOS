# WarrantyOS notification verification checklist

## Checks completed in this environment
- TypeScript's JSX parser reports no syntax diagnostics for `frontend/src/main.jsx`.
- Static checks confirm `NotificationDrawer` passes `portalTarget` as the second argument to `createPortal`.
- Static checks confirm the portal target is `document.body` when the browser DOM exists.
- Static checks confirm notification routing is centralised and used by the drawer and notification history.
- Static checks confirm the drawer closes on Escape and mark-all-read only updates successful requests.
- The source ZIP integrity check passed after packaging.

## Runtime test on Windows
1. Extract this ZIP into a new folder; do not merge it with another WarrantyOS copy.
2. Start MySQL and the Spring Boot backend using the project's existing startup instructions.
3. In `frontend`, run `npm install` and `npm run build`. Both commands must succeed before testing.
4. Start the frontend and sign in separately as an admin, technician and customer.
5. Click the top-right notification bell. Verify the drawer opens without a React runtime error.
6. Click the backdrop, Close button, and press Escape. Each should close the drawer.
7. Click **Mark all read**. The unread badge and unread styling should change only after the API requests succeed.
8. Open notification history and click notifications for service request creation, assignment, status change, repair completion, replacement completion, and escalation. Each should navigate to the appropriate page for the signed-in role.
9. As a technician, verify that no notification redirects to an admin-only route.
10. Complete one repair and confirm the customer receives one `Warranty service completed` notification for that repair operation.
11. Repeat with a replacement and confirm one `Warranty replacement completed` notification.

## Build limitations
The frontend dependency installation timed out in the current environment, so a full Vite production bundle was not completed here. Maven is also not installed in this environment. Do not interpret the source-level checks above as a successful full application runtime test; use the Windows verification scripts for that final check.
