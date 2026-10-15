# WarrantyOS – Stable Separated Frontend + Backend

This release is intentionally a clean, self-contained project. Do not merge files from older Warranty Platform copies into it.

## Structure

- `backend/` – Spring Boot 3.2.5, Java 21, MySQL/JPA, JWT, WebSocket
- `frontend/` – React 18 + Vite
- `docker-compose.yml` – MySQL 8.4 on host port 3307
- `.vscode/tasks.json` – one-click startup tasks

## Demo accounts

- Admin: `admin@warrantyos.com` / `Admin@123`
- Technician: `tech@warrantyos.com` / `Tech@123`
- Technician 2: `tech2@warrantyos.com` / `Tech2@123`
- Customer: `customer@warrantyos.com` / `Customer@123`
- Customer 2: `priya.sharma@example.com` / `Customer@123`
- Customer 3: `arjun.rao@example.com` / `Customer@123`

## Run

Open the project root in VS Code and press `Ctrl+Shift+B`, then choose `WarrantyOS: Start all`.

Manual backend (recommended, because this script also loads `backend\mail.env.cmd` and the local database settings):

```cmd
scripts\run-backend.cmd
```

If starting Maven manually instead, load the local SMTP settings in the same terminal first with `call backend\mail.env.cmd`, then change to `backend` and run `D:\apache-maven-3.10.0\bin\mvn.cmd clean spring-boot:run`. Do not run the SMTP example file unchanged; replace its placeholders with real provider values first.

Manual frontend:

```cmd
cd frontend
npm install
npm run dev
```

URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- MySQL: localhost:3307

## Important

Use this project as a clean folder (recommended: `D:\WarrantyOS`). Do not run the old `D:\Warranty-platform` copy alongside it.


## Frontend stability update

WebSocket libraries are loaded lazily after a protected workspace mounts, so a SockJS/STOMP browser runtime problem cannot blank the public login page. A React error boundary also renders the exact runtime error instead of leaving a white screen.


## 2026-10-07 frontend fix
- Removed the invalid `useStoredUser()` hook usage from inside `useEffect` in the login flow.
- Replaced it with a plain `getStoredUser()` helper, so React Hooks rules are respected.
- Notification bell/dropdown remains enabled and notification items navigate to the relevant role page after marking them read.

- Removed duplicate Notifications navigation entries.


## Notification navigation fix
The header notification flow now handles STATUS/ESCALATION notifications, uses explicit button types, and wraps the application with a runtime error boundary so a route error is shown instead of a blank page.

## Customer self-service authentication

WarrantyOS supports public customer registration, email verification, password reset and login. New registrations create a CUSTOMER account and a linked customer record. In local development, verification and password-reset links are printed to the Spring Boot console and are also returned to the frontend as development-only links.

### Local auth flow

1. Start MySQL, backend and frontend, then open `http://localhost:5173` and choose **Create an account**.
2. Register with a unique email and a password that meets the displayed rules.
3. With the default SMTP mode, open the verification email sent to the address you registered and click its link. If you explicitly set `APP_MAIL_MODE=console` for local development, open the development link returned on the page or printed in the backend console instead; console mode does not send mail.
4. Sign in after verification.
5. Use **Forgot password?**, open the reset email/link, set a new password, then sign in using the new password.

Demo admin/technician/customer accounts remain available for project demonstration. Their passwords are for local development only.

### Development email behaviour

SMTP is the default email mode. Real verification and password-reset email delivery requires valid settings in `backend\mail.env.cmd`. Copy `backend\mail.env.example.cmd` to that filename and enter your SMTP provider settings. If SMTP is not configured or sending fails, the request returns an error instead of claiming that an email was sent. For local-only development links, explicitly set `APP_MAIL_MODE=console`; no email is sent in console mode. Never commit `backend\mail.env.cmd`.

## PDF requirements coverage

The supplied project specification is implemented across the current build:

| Specification item | WarrantyOS implementation |
|---|---|
| Product Registration | Admin registry plus customer self-registration from **My Products**, with unique serial validation, model/category, purchase date and authenticated customer ownership |
| Customer Management | Customer records, linked products, warranty/service activity and customer self-registration |
| Warranty Policy Management | Policy duration, model/category scope, coverage conditions, exclusions, purchase conditions and replacement threshold |
| Warranty Registration | Warranty activation stores serial, policy, activation and calculated expiry date |
| Service Request Management | Customer and service-staff intake, lifecycle status, assignment and resolution |
| Warranty Validation Engine | Product registration, warranty period, policy status, exclusions, prior covered repairs and replacement history are evaluated before routing |
| Repair Management | Technician diagnosis, repair action, parts, labour cost and completion are recorded |
| Replacement Management | Replacement request records original/replacement product serials, reason and date |
| Service History | Serial-level view combines service requests, repairs and replacements |
| Warranty Analytics | Request volume, status/eligibility mix, turnaround, replacement rate, escalation volume, model concentration and recurring issues |
| Service Escalation | Scheduled SLA check escalates overdue requests to administrator supervision and records the event |
| Audit History | Warranty validations, repairs, replacements, assignments, status changes and other lifecycle events are audited |
| Warranty Eligibility & Service Decision Engine | Central engine returns COVERED / NOT_COVERED / REJECTED and REPAIR / REPLACE / PAID_REPAIR / NONE paths |

## Validation rules

Validation is enforced at the backend boundary so API calls cannot bypass the rules. Customer registration validates name, email, phone, strong password and password confirmation. Product registration validates serial format/uniqueness, required model/category and purchase date. Admins select the customer; customers registering their own product are assigned ownership from the authenticated account rather than from request data. Service requests validate the serial, issue description and customer ownership. Policy duration and thresholds are range-checked. Repairs validate diagnosis, action and labour cost. Replacement validation checks eligibility, lifecycle state, registered replacement serial, customer ownership and non-identical serials.

## WarrantyOS 2.2.0 workflow update
Customer warranty claims now have a dedicated guided flow. Active coverage in **My warranties** exposes **Claim warranty**, which creates a service request through `/api/requests/warranty-claim` after backend ownership and active-warranty checks. The customer sees the warranty decision (eligibility, service path and reason) immediately after submission.

Technicians no longer resolve cases directly from the service queue. A repair or replacement record is required to complete the case; completion sends one customer-facing resolution notification.

See `WARRANTY-CLAIM-WORKFLOW.md` and `TEST-WORKFLOW.md` for the full workflow.

## Real email setup

Configure the sending mailbox in `backend\mail.env.cmd` by following [REAL-EMAIL-SETUP.md](REAL-EMAIL-SETUP.md). SMTP is the default; without valid SMTP credentials, registration will report a send/configuration error instead of silently pretending an email was delivered.
