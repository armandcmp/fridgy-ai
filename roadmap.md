# Payment and account audit

- [x] Audit catalog, authentication, checkout, gateway, webhook, renewals and account management.
- [x] Confirm pricing, seven-day one-time trial, 72-hour free interval and renewal-time cycle changes.
- [x] Implement the approved payment/account protections and regression tests.
- [x] Verify sandbox checkout, seven-day trial and webhook activation (October 27), portal, FR/EN billing controls, signed-out protection and empty checkout return.
- [x] Provide preview test instructions in PAYMENT_TESTING.md.
- [ ] Complete real-payment activation: owner must connect/claim Stripe, complete its company verification and install Lovable on the live account.
- [ ] Confirm the legal contact and company details, and review final legal wording before live launch; existing support address is unverified.

Known limitation: concurrent-device sync conflicts preserve local data and report an error; automatic conflict merging is not implemented. Account deletion, renewal failure and renewal-time execution were not exercised against the owner's account to avoid destructive changes or real charges.
