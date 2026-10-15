# WarrantyOS 2.2.6 — Final Source Audit

## What was inspected

- All frontend source files, route wiring, forms, API helper, validation utilities and workspace styles.
- All 39 Java backend source files, including authentication, token repository, mail configuration, role security, controllers, business services, entities, repositories, notification code, seeder and WebSocket configuration.
- Frontend/back-end package configuration, MySQL Compose file, `.gitignore`, email setup documentation and Windows start/verify scripts.

## Fixes made during the audit

1. **Password-reset and verification token invalidation:** issuing a new reset/verification link marks all previous unused tokens of that user and type as used. This prevents a previously issued link from remaining valid after a newer link is requested. Tokens are stored as SHA-256 hashes, expire according to type, and are consumed once on use.
2. **Email documentation corrected:** the README now agrees with `application.properties`: SMTP is the default; `APP_MAIL_MODE=console` must be explicitly selected for local-only links. SMTP needs valid host, sender mailbox and app-password settings.
3. **Technician data scope:** the replacements API now returns only replacement records belonging to requests assigned to the current technician. Admins can still see all replacement records.
4. **Notification read API:** marking a nonexistent or inaccessible notification now returns HTTP 404 instead of returning success when no change was made.
5. **SMTP transport security:** when STARTTLS is enabled, STARTTLS is required rather than merely offered.
6. **Startup failure visibility:** `start-all.cmd` now stops if backend readiness fails, and `wait-backend.cmd` returns a failing exit code after its timeout instead of pretending startup succeeded.
7. **Forgot-password instructions:** the README now explains the SMTP inbox flow and the explicitly selected console-only development flow accurately.

## Checks actually completed

- TypeScript parser syntax check: **PASS** for `frontend/src/main.jsx`, `frontend/src/api.js`, `frontend/src/validation.js` and `frontend/vite.config.js`.
- Relative frontend import resolution: **PASS** for all local relative imports in the frontend entry modules.
- CSS brace-balance check: **PASS** for `frontend/src/styles.css`.
- Input-validation fixture checks: **PASS** for valid/invalid names, emails, Indian phone numbers, passwords, product serial numbers and issue descriptions.
- Source-wiring inspection: **PASS** for `/forgot-password`, `/reset-password`, `/verify-email` routes and their matching `/api/auth/...` calls.
- Forgot-password logic inspection: **PASS at source level**. Unknown addresses receive a generic response; known accounts receive a random one-hour reset token; the raw token is only sent in the reset link; reset enforces the password rules and confirmation, hashes the new password with BCrypt, and marks the reset token used. New requests invalidate old unused reset links.
- Notification drawer source check: it imports `createPortal` from `react-dom` and supplies `document.body` as the target; role-specific notifications/navigation are present.
- Project layout/import references checked; no stale `Model.java` or `AuthConfig.java` was found.
- ZIP integrity: checked after packaging.

## Checks that could not be completed here

- **Frontend production build:** `npm install --no-audit --no-fund --prefer-offline` timed out in this environment. The parser checks passed, but a Vite build was not completed.
- **Backend Maven build/tests:** Maven is not installed here, and the project currently contains no automated backend test sources. The Java code has been inspected, but a dependency-backed Maven compile was not run.
- **Real forgot-password email delivery:** cannot be confirmed without the user's SMTP credentials and a real recipient inbox. The code path is configured; delivery is environment-dependent.
- **End-to-end MySQL/browser role workflows:** require a running Windows environment with Docker/MySQL and a browser; they were not run here.

## Required local test sequence (Windows)

From the extracted project root, run:

```cmd
scripts\verify-project.cmd
scripts\verify-backend-runtime.cmd
scripts\verify-frontend-runtime.cmd
```

Then configure `backend\mail.env.cmd` and test: (1) request password reset for an existing email, (2) confirm email arrives, (3) open the newest reset link, (4) set a new password and confirm matching-password validation, (5) sign in with the new password, and (6) try an older reset link and confirm that it is rejected. Also test an unknown email; it should receive the same generic response without disclosing whether an account exists.

## Known functional limitation found during review

- `Policy.coverageConditions` and `Policy.purchaseConditions` are saved and displayed, but `WarrantyService.validate()` does not yet interpret those two free-text fields as enforceable decision rules. The engine currently evaluates product registration/ownership at the request boundary, policy existence/active state, expiry, comma-separated exclusions, covered repair count, and replacement history. Before calling the system fully production-ready or fully complete against every business rule in the PDF, the coverage/purchase-condition format needs a defined rule syntax and automated tests. This is left explicit rather than adding fragile word-matching that could wrongly approve/reject claims.

## Known configuration notes

- Local MySQL is configured on host port `3307`, database `warranty_db`; credentials in launcher/Compose are demo-development values and must be changed for any deployment.
- Real SMTP delivery requires a valid `backend\mail.env.cmd`. The example file contains placeholders and will not send mail until updated.
- Before production, add rate limiting for login/reset endpoints, externalize all credentials/secrets, and provide automated backend integration tests.
