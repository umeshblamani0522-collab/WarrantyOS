# Customer Product Registration

## Workflow

1. A customer signs in.
2. Customer opens **My products**.
3. Customer clicks **Register product**.
4. Customer enters serial number, product model, category and purchase date.
5. Frontend validates the fields.
6. `POST /api/products` is sent with the product details.
7. Backend identifies the logged-in customer from the JWT-backed authentication context and ignores any customerId supplied by the customer.
8. Backend validates the serial number, model, category, purchase date and uniqueness.
9. Product is saved with the authenticated customer's `customerId`.
10. Product registration is audited and the customer notification is created by the existing service layer.
11. The product appears immediately in **My products**.

## Warranty activation

Product registration and warranty activation remain separate workflows. A registered product can subsequently be handled by the warranty activation workflow using the applicable policy.
