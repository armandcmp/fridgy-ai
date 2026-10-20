# Fridgy payment and account audit — 20 October 2026

## Verified configuration
- One Stripe product, Fridgy Pro, with `pro_monthly` at EUR 389 cents/month and `pro_yearly` at EUR 3588 cents/year; product tax code `txcd_10103001`.
- Both prices have unspecified tax behavior. Tax-inclusive versus tax-exclusive pricing needs confirmation before modifying prices.
- Gateway-only Stripe transport, SDK 22.0.2/API 2026-03-25.dahlia; embedded_page checkout with authenticated server functions and userId customer metadata.
- Checkout requests managed tax/compliance handling. This adds 3.5% beyond ordinary Stripe fees and uses LINK.COM* on bank statements.
- Test app webhook and separate Lovable analytics webhook are both enabled; both must be retained. They currently deliver Basil-version payloads; item-period fallback must remain.
- No Stripe billing portal configuration exists in the test account.
- Live account claim is in progress; remaining live steps are locked. No real payments are currently available.
- Live auth settings read: email and Google enabled, anonymous signup disabled, signup enabled, email auto-confirm enabled. No earlier explicit authorization for auto-confirm was established in this audit.
- Live own-row policies and effective grants verified for profiles and subscription reads, and privileged webhook writes.
- Signed-in browser verified settings, subscription offer, and broken missing-session return state; no runtime errors in those checks. No card transaction was submitted.

## Current lifecycle
1. Email/password or Google auth creates a hosted session. A root client effect hydrates a local profile and redirects signed-out visitors.
2. Profile changes are debounced into profiles; only name, program, daily calories, avatar and the redundant premium field are synced.
3. Checkout resolves a Stripe customer by userId, then email, then creation; resolves a lookup-key price and grants 14 trial days when the local subscriptions query reports no history.
4. Signed subscription events write subscriptions. The browser reads the newest row into a local premium flag.
5. Stripe renews subscriptions; app access depends on subsequent webhook writes. Portal link is offered only while local premium is true.

## Corrections needed
### Security and correctness
- Authenticate every AI/transcription endpoint; enforce paid access and confirmed free limits server-side, not through editable browser flags.
- Remove profiles.is_premium from client profile writes/reads and protect the redundant entitlement column.
- Separate all personal data, body profile, onboarding, quotas and entitlement by user; retire reversible legacy local credentials and local auto-login.
- Guard asynchronous hydration, translation and subscription writes against logout/account switches; clear premium on identity changes and refresh at expiry/focus/portal return.
- Check profile and webhook database errors; never show a successful save or acknowledge an event whose write failed.
- Make webhook processing replay-safe and prevent delayed events overwriting current Stripe subscription state; preserve canceled history for trial eligibility.
- Prevent duplicate subscriptions and checkout races; reuse pending sessions; fail closed on trial-history errors and check provider history before granting a new trial.
- Never reassign a customer already owned by another user based only on email.
- Validate environment, return origins/paths, catalog currency/amount/interval and active price status.

### Customer lifecycle
- Replace the browser auto-started trial countdown with actual server-owned Stripe trial state and eligibility.
- Verify checkout session ownership and status; handle missing, incomplete, pending, expired and failed returns with finite retry/recovery states. Pro must still originate only from webhook-written subscriptions.
- Configure billing portal cancellation, payment method updates and invoice access; show billing recovery even when Pro is inactive; pre-open a tab from the click to avoid popup blocking.
- Confirm timing/proration for monthly/annual changes, cancellation access, failed-renewal grace and refund policy before implementing them.
- Add renewal/payment-failure recovery displays and handle relevant events; confirm trial/receipt email configuration rather than assuming delivery.
- Complete account email/password management, expired password-reset states and cleanup; distinguish local reset from account deletion and cancel billing safely during deletion.
- Expand cloud persistence and export for currently local-only body profile, recipes, history, favorites, planning and shopping; scope consent/settings correctly.
- Complete FR/EN auth, recovery, checkout, billing and account messages; store program slugs rather than translated labels.
- Move signed-in content under the managed authenticated layout; handle onboarding completion per account and confirmation-required signup explicitly.
- Every content route needs unique leaf metadata; remove root-only social cover tags.
- Remove unsupported claims such as priority generation unless an actual priority mechanism is implemented.

## Testing required after implementation
- Add regression coverage for exact catalog values, 14-day one-time trial, concurrent checkout, ownership/URL validation, signature failures, event replay/order, persistence errors, subscription expiry, cancellation, grace, account isolation, quotas and deletion.
- Run signed-in preview card checkout for monthly and annual, verify webhook row and Pro in the UI after reload, and verify portal cancellation/recovery.
- Use 4242 4242 4242 4242 with future expiry and any 3-digit CVC in test mode only. Decline: 4000 0000 0000 0002; authentication: 4000 0025 0000 3155.
- Renewal needs Stripe test-clock/event testing; waiting for the 14-day trial is not sufficient. Keep test/live data separate.
- Verify FR/EN, new-account onboarding, reset email delivery, expired reset links, profile read-back and A/logout/B isolation.

## Decisions needed
- Are the displayed EUR prices tax-inclusive?
- What exact free generation/list limits and Pro-only planning/history rules should be enforced?
- When should monthly/annual changes take effect, and how should billing credits be handled?
- What should account deletion do to subscriptions, retained content and legally required billing records?

Implementation has not begun: awaiting these answers before finalizing the implementation plan.