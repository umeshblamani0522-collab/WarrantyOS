@echo off
rem Copy this file to backend\mail.env.cmd and enter the REAL SMTP details for the mailbox that should send WarrantyOS messages.
rem Gmail example: host=smtp.gmail.com, port=587, username/from=your Gmail address, password=Google App Password.
rem For other providers, use their published SMTP host and security settings.
rem Do not commit backend\mail.env.cmd.

set "APP_MAIL_MODE=smtp"
set "MAIL_HOST=smtp.gmail.com"
set "MAIL_PORT=587"
set "MAIL_USERNAME=skillswap1710@gmail.com"
set "MAIL_PASSWORD=prwljmpmbiawvwuk"
set "MAIL_FROM=skillswap1710@gmail.com"
set "MAIL_FROM_NAME=WarrantyOS"
set "MAIL_STARTTLS=true"
set "MAIL_AUTH=true"
