# WarrantyOS real email setup

WarrantyOS sends verification and password-reset emails to the address entered in the registration or password-reset form (the recipient). A separate real mailbox must be configured as the SMTP sender. The sender mailbox and its SMTP/app-password credential must be authorised by the provider; a recipient address alone cannot send mail.

## Windows setup

1. Copy `backend\mail.env.example.cmd` to `backend\mail.env.cmd`.
2. Replace `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM` with your actual sending mailbox details. For Gmail, use `smtp.gmail.com`, port `587`, STARTTLS enabled, and a Google App Password (not your normal sign-in password). For another provider, use its SMTP settings.
3. Keep `MAIL_FROM` the same as `MAIL_USERNAME` unless your provider explicitly permits an authorised alias.
4. Restart the backend using `scripts\run-backend.cmd` or `scripts\start-all.cmd`. The launcher loads `backend\mail.env.cmd` automatically.
5. Register using a separate recipient mailbox you can access. Check inbox and spam/junk folders.

## Important behaviour

- SMTP is the default mode. If SMTP is not configured or sending fails, registration/reset returns an error; the UI must not claim that an email was delivered.
- To deliberately use local development links instead, set `APP_MAIL_MODE=console` in `backend\mail.env.cmd`. In this mode, links are logged locally and **no email is sent**.
- Never put a mailbox password or app password in Java source, README files, screenshots, or GitHub. `backend\mail.env.cmd` is excluded from Git.
