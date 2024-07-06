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


## Testing

### Cypress integration test

```bash
yarn test:e2e
```

### Jest test

```bash
yarn test
```
