# Paystack Live Switch-Over Checklist

**Current state:** JAMB checkout is intentionally operating with Paystack **test-mode** credentials. The JAMB payment context is stored as `NGN` / `paystack` on the `JAMB-UTME` exam record. The existing amounts remain **₦1,500 monthly** (`150000` kobo) and **₦4,000 quarterly** (`400000` kobo).

## What is required before accepting real payments

The live switch requires **both** values from the Paystack production dashboard:

| Project secret | Purpose |
|---|---|
| `PAYSTACK_SECRET_KEY` (`sk_live_…`) | Used server-side to initialise Paystack checkout and verify the `x-paystack-signature` webhook HMAC. This is the key that determines whether real transactions can be initiated. |
| `VITE_PAYSTACK_PUBLIC_KEY` (`pk_live_…`) | Kept as the client-side Paystack configuration value for any future browser SDK usage. The current hosted-checkout flow is server-initialised, so changing this key **alone** does not activate live payments. |

## Production configuration steps

1. Enter the live public and secret keys through the project’s secure payment settings; do not commit or paste either key into code.
2. In the Paystack production dashboard, register the deployed webhook URL: `https://questiongrove360.com/api/paystack/webhook`.
3. Enable delivery of the `charge.success` event to that URL. The handler verifies the request against `PAYSTACK_SECRET_KEY` before activating access.
4. Ensure `https://questiongrove360.com/international/nigeria/jamb?payment=success` is permitted as a redirect/callback destination in the Paystack production settings.
5. Use a controlled, deployed-domain payment test. A successful `charge.success` event must create or update one `subscriptions` row with `planType = 'jamb'`, `provider = 'paystack'`, `status = 'active'`, and the correct 30- or 90-day end date.
6. Confirm that both plans show NGN amounts and that the checkout page carries the same currency and amount before accepting public payments.

## Safety notes

The switch should be made only after Paystack production approval. No test credentials, live credentials, or webhook secret are stored in this repository. The handler already avoids touching user-profile subscription fields and writes JAMB access through the dedicated `subscriptions` record.
