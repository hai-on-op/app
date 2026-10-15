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
