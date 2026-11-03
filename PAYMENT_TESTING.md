# Fridgy payment checks in the preview

## Verified
- Test checkout completed with Stripe's 4242 card, with a seven-day trial; the webhook activated Pro.
- Settings and billing controls open in French and English.
- Stripe's customer portal opens successfully.
- An empty checkout return displays “No payment to verify” rather than indefinite activation.
- Signed-out personal pages redirect to sign-in.
- Nine rule tests pass: EUR monthly/annual prices, seven-day trial, 72-hour interval, entitlement termination and safe payment return URLs.

## Your next test
1. Use the preview only, and confirm the payment window explicitly says **Test mode**.
2. Use a separate test account. Confirm email, complete the body profile and choose a program.
3. Open Fridgy Pro and select monthly or annual. Existing subscribers should use Settings → Manage subscription instead of purchasing again.
4. Enter **4242 4242 4242 4242**, any future expiry, any three-digit CVC and a test billing name/address. Never use a real card in this check.
5. Confirm the seven-day trial and €3.89/month or €35.88/year, tax included. Finish checkout and confirm Pro appears after returning and after reloading.
6. Open Settings → Manage subscription; inspect invoices/payment method and cancel at period end. Access should remain until that date.
7. Schedule the other billing cycle. The change must take effect at renewal without an immediate charge. Cancel the scheduled change to return to the starting state.
8. Sign out. Personal recipes, planning and Pro must not remain visible to another account.
9. On a disposable test account only, type DELETE in the account-deletion confirmation. Verify sign-in no longer works and its subscription is canceled. Do not use your main account.
10. Repeat the visible steps in English.

## Additional checks before launch
- Stripe renewal success/failure, end-of-trial charging and scheduled cycle execution require sandbox time advancement or webhook test events; these were not verified by waiting for a real renewal.
- Test password-reset email delivery and a valid recovery link in your mailbox; invalid/empty links are checked separately.
- Concurrent edits on multiple devices currently stop on a revision conflict and preserve the local copy. Export data before manual reconciliation; there is no automatic conflict merge.
- Legal contact address and final terms/privacy copy need owner confirmation and legal review.
- Live checkout is unavailable until Stripe connection/claim, company verification, Lovable live-account installation and readiness checks are complete in Payments. Live prices also need verification before launch.
