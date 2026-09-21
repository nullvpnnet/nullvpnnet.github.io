# Website Content Revision Spec — 2026-09-21

Status: DRAFT — proposed copy only; no live HTML page was modified in this commit.

Reason: the raw HTML/CSS source of index.html, pricing.html, privacy.html, download.html, how-it-works.html, faq.html, and terms.html was not accessible to the reviewing agent in this session (the file-content tool did not expose byte-level source in-session; only rendered text was available for some pages, and raw-file mirrors could not be fetched for others). Applying full-file rewrites without the real markup, CSS classes, and head includes risks breaking the live design. This document specifies the exact intended replacement copy so a developer (or a follow-up session with raw file access) can apply it precisely inside the existing templates.

## 1. index.html

Replace absolute claims with qualified, Android-first, resilience-aware messaging.

Remove:
- "There is no VPN signature to detect."
- "Works in China, Iran, Russia..." as a guaranteed country list.
- "Auto-failover. Always connected." as an unconditional guarantee.
- "No bank card. No name. No transaction history linked to you."
- Any implication of a fixed free-trial duration not currently verified against the live backend.

Replace hero copy with:

> Private connectivity for difficult networks.
> NullVPN is an Android-first VPN service designed for reliable encrypted access on restrictive and unstable networks. The app monitors tunnel health and uses available connection paths to recover when conditions change.

CTA buttons:
- "Download for Android"
- "How it works"

Replace failover section copy with:

> Connection recovery designed for real networks.
> Networks fail, routes degrade, and providers change conditions. NullVPN monitors connection health and attempts recovery through available routes. Performance and availability depend on your device, provider, location, and network conditions.

Replace anti-detection section copy with:

> Designed to reduce the visibility of conventional VPN traffic patterns. No anti-censorship technology can guarantee uninterrupted access on every network.

Replace country-availability section with:

> Designed for challenging networks. Availability varies by location, provider, and local restrictions.

Add a capability-status section:

> Available now: Android VPN client, account-based access and subscription management, encrypted VPN connections, automatic connection health checks.
> In development: expanded route resilience and alternate entry paths, IPv4/IPv6 connection selection, advanced split-routing policies, router integration.

## 2. pricing.html

Reconcile payment claims (currently inconsistent with index.html: TON-only here vs TON+USDT+fiat implied elsewhere).

Canonical payment statement (choose ONE and apply everywhere):

> Pay using the methods available at checkout. Supported payment options are displayed before payment and may vary by region and provider.

Remove or verify before republishing:
- Exact device-count limit (e.g., "Up to 3 devices") — publish only if enforced by the current subscription backend.
- Fixed refund window (e.g., "48-hour refund") — publish only if this is the actual operating policy; otherwise link to refund.html.
- "Zero logs" repeated here — remove; refer to privacy.html for the authoritative statement.

Trial wording:

> Start with a free trial. Trial terms and duration are shown at signup and may be adjusted from time to time.

Do not state an exact minute count unless confirmed against the live backend configuration.

## 3. privacy.html

Replace "zero logs, ever" / "no activity log is ever created" with a scoped, precise disclosure. Suggested structure:

> Privacy by design, explained clearly.
> We minimize the data needed to operate accounts, subscriptions, payments, security, and support.

Data table (fill in exact values before publishing):

| Data category | Collected? | Why | Retention |
|---|---|---|---|
| Browsing activity / traffic content | confirm: not retained | N/A | N/A |
| Account identifier (email/login key) | confirm | Authentication | confirm retention |
| Payment reference | confirm | Reconciliation / refunds | confirm retention |
| Device identifier | confirm | Device-limit enforcement, security | confirm retention |
| Diagnostic / connection logs (device-local) | Yes, on-device ring buffer used for support | Troubleshooting connection issues | Local only, confirm rotation window; not transmitted unless user shares for support |
| Security/incident logs (server-side) | confirm | Abuse prevention, incident response | confirm retention |

Do not publish an absolute "never created" claim while the app maintains any local or server-side diagnostic logging capability; describe the real scope instead.

## 4. download.html

Add verified release metadata block (values to be filled from the actual signed release before publishing):

- App: NullVPN for Android
- Version: [x.y.z]
- Release date: [YYYY-MM-DD]
- Package name: [applicationId]
- File size: [n MB]
- SHA-256: [checksum]
- Minimum Android version: [API level / Android version]
- Status: [Stable / Beta / Early access]

Add installation guidance:
1. Download the APK from this page (not a third-party mirror).
2. Verify the SHA-256 checksum matches the value published here.
3. Allow installation from this source only for this file.
4. Open the app, sign in or create an account, and follow the on-screen connect steps.

Add a short security note:

> Always verify the checksum before installing. We do not distribute this app through unofficial mirrors.

## 5. how-it-works.html

Remove:
- "Zero detectable VPN fingerprint" (absolute).
- "No state actor... can block it" / "unblockable port" framing.
- "Auto-failover — seamless backup routing" as a guarantee.
- "No activity logs by architecture, not just policy" (contradicts scoped privacy disclosure).
- "No identity check" / "no name" anonymity claims.
- References to a Telegram-bot-only activation flow if the current primary flow is account + Android app.

Replace step flow with the current product journey:

> 1. Download the Android app.
> 2. Create or sign in to your account.
> 3. Start your trial or activate a subscription.
> 4. Tap Connect.
> 5. The app monitors your connection and attempts recovery if conditions change.

Replace the "what if blocked" FAQ answer with:

> The app monitors connection health and can attempt to reconnect or use an alternative route where available. Recovery behavior depends on your network and current service configuration.

## 6. faq.html

Align every FAQ answer touching logging, anti-detection, country availability, payment anonymity, and failover with the corresponding qualified language above. Remove duplicate absolute claims that conflict with privacy.html and index.html.

## 7. terms.html

Add explicit cross-links to a single consistent policy set:
- Link to privacy.html for data handling.
- Link to refund.html (or the scoped refund section) for cancellation/refund rules.
- Add a service-availability disclaimer:

> Service availability, connection performance, and route resilience depend on network conditions, local restrictions, and third-party infrastructure. We do not guarantee uninterrupted access on any specific network.

- Add a restricted-network disclaimer:

> Some networks or jurisdictions may restrict VPN usage. You are responsible for complying with local laws and terms of your network provider.

## 8. Refund policy

Add only after the actual operating refund rule is confirmed. Suggested minimal structure for refund.html or a terms.html section:

> Refunds
> State eligibility window, e.g., "within X days of purchase if you have not used the service beyond Y minutes/connections."
> State process: how to request, expected response time, and refund method.
> State exclusions, e.g., promotional or trial-derived purchases.
> Contact: [support channel] for refund requests.

## Next step

Apply this spec directly to the existing page templates (preserving current head includes: style.css, i18n.js, _headers) in a follow-up commit once raw file source is available, or provide the raw HTML exports so the exact edits can be made in place.