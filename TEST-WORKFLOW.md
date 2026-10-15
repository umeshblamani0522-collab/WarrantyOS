# WarrantyOS 2.2.0 – End-to-End Test Workflow

## Customer claim flow
1. Register a customer and verify the real email.
2. Sign in as the customer.
3. Open **My products** → **Register product**.
4. Enter a unique serial, model, category and purchase date.
5. Sign out and sign in as Admin.
6. Open **Products** and confirm the product is linked to the correct customer.
7. Create/confirm the applicable warranty policy.
8. Open **Warranties** and activate coverage for the serial.
9. Sign out and sign in as the customer.
10. Open **My warranties**. The product should show **ACTIVE** and the **Claim warranty** action.
11. Click **Claim warranty**.
12. Enter the issue and submit the claim.
13. Confirm the decision card shows eligibility, service path and request number.
14. Open **My service requests** and confirm the case is visible with coverage, service path and decision reason.
15. Sign in as Admin and assign the request to a technician.
16. Sign in as Technician and start work.
17. Use **Record repair** or **Record replacement**. There is no direct Resolve action.
18. Confirm the request becomes **RESOLVED** only after repair/replacement is recorded.
19. Confirm the customer receives one completion notification for that repair/replacement.
20. Close the case and confirm the final closure notification.

## Expected business rules
- A customer can never claim a product owned by another customer.
- A customer cannot use the warranty-claim endpoint when warranty coverage is missing or expired.
- Warranty validation can still decide `NOT_COVERED / PAID_REPAIR` for general service requests.
- An under-repair request cannot be directly resolved through the status endpoint.
- A repair or replacement record is the resolution event.
- The customer-facing My Warranties page shows registered products awaiting administrator warranty activation.
