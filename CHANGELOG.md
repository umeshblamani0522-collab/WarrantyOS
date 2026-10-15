# Changelog

## 2.2.4
- Removed the Systems online status card from the shared workspace sidebar; the signed-in profile email remains visible.
- Removed stale .bak source files so old UI/config code cannot confuse future edits.
- Made SMTP-first email configuration consistent across application.properties, MailService and AuthController.
- Send email with the configured sender display name and actual SMTP mailbox.
- Documented Gmail SMTP/App Password configuration and explicit local console mode.

# Changelog

## 2.2.4
- Removed the Systems online status card from the shared workspace sidebar.
- Kept the signed-in user's real name and email address in the sidebar profile card.
- Changed email configuration to SMTP-first so registration does not silently use console-only verification links by default.
- Documented Gmail SMTP/App Password configuration and explicit local console mode.

## 2.2.3 — Centered login card
- Removed the split-screen left branding panel from the login page.
- Added a centered, responsive sign-in card with compact WarrantyOS branding.
- Preserved email/password login, error and loading states, JWT storage, role-based navigation, forgot-password and registration links.
- Left the customer registration and email verification layouts unchanged.

## 2.2.2 — Login cleanup and sidebar scrollbar polish
- Removed the Quick demo access cards from the login page.
- Removed the UI-only demo account prefill logic from the login component.
- Hid the sidebar navigation scrollbar while preserving scrolling for long role menus.
- Removed obsolete CSS rules for the deleted demo access cards.

## 2.1.1 — Notification runtime fix
- Fixed the customer/admin/technician notification history page crash caused by `useOutletContext` being referenced without the React Router import.
- Notification history now resolves the current role once at page level and passes it to each notification item.
- Added `type="button"` to notification history action buttons to prevent accidental form submission.

# WarrantyOS Final Changes

- Added customer self-registration.
- Added email verification tokens and verification page.
- Added forgot-password and one-time password reset flow.
- Added local development verification/reset links.
- Existing admin and technician accounts remain controlled by the seed/admin workflow.
- Removed the "Demo Customer" display name in favour of a realistic seeded demo customer name.
- Improved customer dashboard greeting to use the logged-in customer's first name.
- Kept the separate frontend/backend structure and the notification/error-boundary fixes.
- Startup launcher now checks the backend TCP port instead of an authenticated health endpoint.

## 2026-10-07 specification-complete update
- Audited the implementation against the supplied Product Warranty & After-Sales Service Management Platform specification.
- Added explicit policy coverage conditions and purchase conditions.
- Strengthened backend validation for customer, product, policy, service request, repair and replacement workflows.
- Added customer/admin/technician service-request intake; technician-created requests are automatically assigned to the submitting technician.
- Enforced service lifecycle transitions instead of allowing arbitrary forward status jumps.
- Hardened replacement validation and customer ownership checks.
- Added frontend validation helpers and stronger form constraints for authentication and operational forms.
- Added replacement workflow UI and synchronised "Mark all read" notification behaviour with the backend.
- Added a PDF requirements traceability table to README.md.

## 2.1.2 — Customer workspace readability refresh
- Increased customer workspace typography across sidebar, topbar, page headers, cards, tables, badges and form controls.
- Reworked **My Products** into a full-width operational register with product/serial emphasis, readable metadata and customer-friendly summary cards.
- Reworked **My Warranties** into a full-width coverage register with active/expiry/expired summary cards and clearer product-to-serial presentation.
- Removed the customer-facing Customer ID column from the read-only My Products table.
- Added responsive behaviour for the new customer summary cards and wider data tables.
- Preserved the notification runtime fix (`useOutletContext` import) from 2.1.1.


## 2.1.3 — Backend replacement classloading hardening
- Renamed the internal JPA entity from `Replacement` to `ReplacementRecord` to remove the runtime `NoClassDefFoundError: com/wp/Replacement` failure seen during Spring bean introspection.
- Preserved the database table name as `replacement`.
- Updated repository, service, controller and seed-data references.
- Added `scripts/verify-backend-runtime.cmd` to clean, build, and verify that the replacement entity class is actually present before startup.

- 2.1.4: Customers can now register products from My Products. Backend derives ownership from authenticated customer identity. Admin product registration remains available.
- 2.1.4 UI: Added a visible Customer > My products > Register product workflow with customer-owned form and guidance.

## 2.2.0 – proper warranty claim workflow
- Added guided customer warranty claim page.
- Active warranties now expose a Claim warranty action.
- Added backend-authoritative `/api/requests/warranty-claim`.
- Customer warranty page shows pending activation records for registered products.
- Removed direct technician resolve flow; repair/replacement records are the resolution action.
- Consolidated repair/replacement completion notifications to one customer notification.
- Added request path and decision visibility.

## 2.2.1 — Notification drawer portal and navigation fix
- Fixed the notification drawer crash `Target container is not a DOM element` by passing `document.body` as the explicit React portal target and guarding environments where no DOM exists.
- Added Escape-key support to close the drawer.
- Consolidated notification routing into one role-aware resolver shared by the notification bell drawer and notification history, including `STATUS` and `ESCALATION` types.
- Prevented technician notifications from navigating to admin-only product/warranty pages.
- Updated unread/read state only after the backend confirms an item was marked read; mark-all-read now preserves read state for failed updates.

## 2.2.5 — Workspace readability
- Increased font sizes across authenticated workspace navigation, headings, summaries, cards, empty states, tables, form controls, and action links.
- Increased the top spacing for page content to reduce the chance of the welcome heading appearing clipped beneath the sticky top bar.
- Added responsive overrides so the larger text remains usable on smaller screens.

## Final source audit
- Added invalidation of previous unused reset/verification tokens when a replacement link is issued.
- Corrected README SMTP-mode documentation to match application.properties.
- Added FINAL-AUDIT-2.2.6.md with verified and environment-dependent checks.
- Scoped technician replacement records to requests assigned to that technician.
- Notification mark-as-read API now returns 404 for missing or unauthorized notification IDs instead of reporting false success.
- SMTP STARTTLS is now required when enabled.

## 2.2.6 final audit
- Invalidated older unused verification/reset links when new links are issued.
- Restricted technician replacement listing to assigned jobs.
- Improved notification read-status error semantics and required SMTP STARTTLS when enabled.
- Corrected README mail-mode documentation and startup scripts so backend readiness failure is reported.
- Added FINAL-AUDIT-2.2.6.md.
