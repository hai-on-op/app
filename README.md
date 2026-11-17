<p align="center">
  <a href="https://reflexer.finance" target="_blank">
    <img alt="Reflexer" src="https://i.ibb.co/CtWRHQd/android-chrome-512x512.png" width="60" />
  </a>
</p>
<h1 align="center">
  HAI App
</h1>

Deposit your crypto assets, generate HAI and lever up your position.

<!-- - Website: [reflexer.finance](https://reflexer.finance/)
- App: [app.reflexer.finance](https://app.reflexer.finance)
- Docs: [docs.reflexer.finance](https://docs.reflexer.finance/)
- Twitter: [@reflexerfinance](https://twitter.com/reflexerfinance)
- Discord: [Reflexer](https://discord.com/invite/83t3xKT)
- Whitepaper: [Link](https://github.com/reflexer-labs/whitepapers/blob/master/English/hai-english.pdf) -->

## Development

Use Node.js 24 (`nvm use`). CI and Vercel use the same major version. The scoped
`@vercel/build-utils` resolution lets the Vite adapter generate Node.js 24 function
configs; its bundled version only supports Node.js 20. `yarn build` checks the
generated function runtimes before deployment.

### Install Dependencies

```bash
yarn
```

### Run

```bash
yarn start
```

### Configuring the environment

To have the app default to a different network when a wallet is not connected:

1. Create a file and name it `.env`
2. Change `VITE_MAINNET_PUBLIC_RPC` to e.g. `"https://opt-mainnet.g.alchemy.com/v2/{YOUR_ALCHEMY_KEY}"`
3. Change `VITE_TESTNET_PUBLIC_RPC` to e.g. `"https://opt-sepolia.g.alchemy.com/v2/{YOUR_ALCHEMY_KEY}"`
4. Change `VITE_ALCHEMY_KEY` to e.g. `"YOUR_ALCHEMY_KEY"`
4. Change `VITE_WALLETCONNECT_ID` to e.g. `"YOUR_WALLETCONNECT_API_KEY"`
4. Change `VITE_GRAPH_API_KEY` to e.g. `"YOUR_GRAPH_API_KEY"`


### haiAEROV2

`/haiAERO` opens haiAERO v2 by default. `/haiAERO?tab=aero-v2&mode=migrate`
opens migration, and `mode=bridge` opens the new bridge. The v2 tab on `/haiVELO`
opens migration with haiVELO v2 selected; existing haiVELO v1 vaults select v1.
It supports AERO and sAERO NFT deposits on Base, xAERO deposits on Optimism, legacy
token migration on Optimism, and bridging the new haiAERO between both chains.
Timed and permanent sAERO positions are accepted. Minting is one-way. Legacy
haiVELO v1/v2 converts at 0.044 haiAERO per token and haiAERO v1 converts 1:1.

Set these variables to the intended pair of `WrappedTokenV3` deployments:

```dotenv
VITE_HAI_AERO_V2_BASE_ADDRESS=
VITE_HAI_AERO_V2_OP_ADDRESS=
```

Each address is both the new token and its Hyperlane router. Leave them empty until
the intended deployments are selected; the panel will show that v2 is unavailable and block approvals and
transactions. Rebuild the app after configuring the addresses. Configure and test
the reciprocal bridge routes and unpause local issuance before opening deposits
and migration.

The November 16 mainnet rehearsal used separate dev instances, not production:
Optimism `0x0190D1F9a1afB336B38361AEc5eAE02B4a7fD596` and Base
`0x9b48B8F64156c1eD247E2EDcD679A8Ea979557bB`. Use those only in an explicitly
configured local test environment. Both were paused at the end of the rehearsal;
bridging still works while issuance is paused. Do not use them as production defaults.
Set `VITE_HAI_AERO_V2_TEST_MODE=true` in `.env.development.local` when using the dev
pair so the page clearly identifies the mainnet test environment. This flag only
adds the notice; it does not change contract addresses or pause state.

The existing haiAERO and haiVELO vault, reward and price configurations still refer
to the legacy tokens. The v2 panel shows token amounts without assigning legacy
collateral or reward data to the new token. Collateral onboarding is separate.
Legacy haiAERO holders on Base can use `/haiAERO?tab=legacy-bridge` to move their
tokens to Optimism before migrating.
`tab=legacy-mint`, `tab=manage`, and `tab=activity` keep legacy minting and vault
actions accessible. The v2 view does not display legacy TVL, APR, or borrowing claims.
Bridge history stays pending after source confirmation until destination delivery
is verified, and is retained per wallet in browser storage.

### Rewards analytics report

The `/rewards` page reads `/api/rewards/report`. The API fetches the daily report
over HTTPS from `https://foundation-prod.tail9fe271.ts.net:8443/hai-rewards/report.json`.
Set the server-side `REWARDS_REPORT_URL` environment variable to override that URL.
Successful responses are cached for five minutes; upstream failures return an
uncached JSON error after at most ten seconds.

On `foundation-prod`, the existing Funnel serves only the generated report file:

```bash
tailscale funnel --bg --https=8443 --set-path=/hai-rewards/report.json /opt/hai/daily-rewards/reports/latest-report.json
```

The daily report job updates that file automatically. The report API on port 3100,
including `/ops/status`, stays private to the tailnet. To remove only the public
report route, leaving other Funnel routes intact:

```bash
tailscale funnel --https=8443 --set-path=/hai-rewards/report.json off
```

## Testing

### Cypress integration test

```bash
yarn test:e2e
```

### Jest test

```bash
yarn test
```
