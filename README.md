# PrivateCopy UI

Frontend for KeyTrade / PrivateCopy — confidential copy-trading on NEAR Intents.
TanStack Start (React 19, Vite, file-based routing) with Tailwind v4 and TanStack Query.
The system design it implements is [system.md](system.md); this app covers section 12.

```sh
yarn install
yarn dev        # http://localhost:3000
yarn check      # biome lint + format
npx tsc --noEmit
```

## Demo mode

With no `VITE_API_URL` the app serves seeded fixtures from
[`src/lib/api/demo.ts`](src/lib/api/demo.ts): five strategies, a time-compressed
attestation feed, confidential balances, access keys and copy orders. Every screen
is reviewable without a backend, a private shard or a funded testnet account, and
nothing branches on demo vs live above the API facade.

## Live mode

Set `VITE_API_URL` (see `.env.example`) to talk to a running `privatecopy-server`:

```sh
cd ../PrivateCopy && docker compose up -d     # postgres, redis, server on :8080
docker compose exec -T postgres psql -U privatecopy -d privatecopy < seed/demo.sql
```

The leaderboard and strategy pages work unauthenticated. The rest needs sign-in:
**Connect NEAR** opens the NEAR wallet selector (Meteor or MyNearWallet), signs the
server's NEP-413 challenge with a full-access key, and exchanges the signature
for a JWT. Set `VITE_NEAR_NETWORK` to switch networks (default `testnet`); the
account must exist on the same network the server's RPC points at, since the
server checks the signing key is FullAccess before issuing a token.

Meteor signs in-page and returns the signature directly. MyNearWallet can
interrupt the flow twice — once to connect the account, once to sign — so the
intent and the challenge are parked in `sessionStorage` and resumed on return,
through either a popup or a full redirect. A stale demo session is discarded
when the mode changes rather than sent to the server.

The strategy endpoint returns attestations for every window in one list, so the
strategy page picks one window (defaulting to 30d) instead of drawing 7d, 30d and
all-time returns on the same curve.

## Screens

| Route | Audience | What it shows |
| --- | --- | --- |
| `/` | anyone | Leaderboard: attested TWR, drawdown, NAV band, trade bucket, follower count, trend sparkline |
| `/strategies/$strategyId` | anyone | Attestation curve and full attestation history, pricing tiers, disclosure summary, buy access |
| `/vault` | trader and follower | Public and confidential balances side by side; shield and withdraw in one confirm |
| `/studio` | trader | Own fills, keys sold with revoke, access revenue, strategy settings, private trade ticket |
| `/copy` | follower | Access keys held, with expiry and agent key |
| `/copy/$keyId` | follower | Risk limits, agent state and kill switch, copy activity with skip reasons |

## Design rules the UI enforces

- **Every number is labelled by who can see it.** Three disclosure states, each with
  its own hue and badge: *public* (slate), *private to you* (amber), *attested*
  (mint). The footer is the permanent legend. The brand hue (violet) is reserved for
  interaction so it never reads as a disclosure state.
- **Attestation is inspectable.** The badge opens the period, snapshot root, TEE
  quote, signature and the anchoring transaction, and says plainly when a figure is
  signed but not yet on-chain.
- **Risk is stated in plain terms.** The copy screen names the worst case — the copy
  vault balance — before anything is saved, and every skipped copy shows the rule
  that caused it.
- **Private views warn before they are shared.** The vault flags that a screenshot of
  the confidential column discloses what the shard hides.
- **Amounts are integer strings in smallest units**, converted only for display
  ([`src/lib/format.ts`](src/lib/format.ts)), so no float ever touches a value.

## Layout

```
src/
  lib/api/      types.ts (wire types) · client.ts (fetch, session, errors)
                index.ts (endpoint facade + demo switch) · demo.ts · queries.ts
  lib/format.ts bps, smallest-unit amounts, asset symbols, relative time
  components/   app shell, attestation badge, charts (hand-rolled SVG, no chart dep)
  components/ui primitives: Panel, Button, Badge, Stat, Field, Modal, Segmented…
  routes/       file-based routes, one per screen above
```

## Not wired yet

These need pieces that live outside this repo:

- **Buying a key.** A Key Registry contract call. The wallet is connected, so the
  signing half exists; the contract id and method are not deployed yet, and the
  modal explains the flow with the button disabled.
- **1Click user session.** Pasteable from the account dialog in live mode, memory-only
  (never stored, never logged), exactly like the server's copy.
- **Live signal stream.** `signalSocketUrl()` builds the `WS /v1/signals/{id}` URL;
  the relay also requires proof of possession of the key's X25519 agent key, which
  belongs to the agent rather than the browser.
- **Public NEAR balances.** The server exposes confidential balances only.
