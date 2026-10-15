# Warranty Claim Workflow

Customer warranty claims are represented by service requests, but the UI now makes that relationship explicit.

1. Customer registers a product.
2. Administrator activates the applicable warranty policy.
3. Customer opens My Warranties.
4. Active coverage displays a **Claim warranty** action.
5. Customer describes the fault on the guided claim page.
6. `POST /api/requests/warranty-claim` verifies ownership and active warranty before creating the service request.
7. The warranty eligibility and service decision engine determines COVERED / NOT_COVERED and REPAIR / REPLACE / PAID_REPAIR.
8. Administrator assigns a covered case to a technician.
9. Technician starts work.
10. Technician records repair or replacement; that operation resolves the case. A technician cannot directly resolve an under-repair case without recording work.
11. Customer receives one completion notification for the repair/replacement, then may see a closure notification when the request is closed.
