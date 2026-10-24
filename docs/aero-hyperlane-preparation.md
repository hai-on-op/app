# New haiAERO bridge preparation

This tooling prepares a distinct Base collateral / Optimism synthetic Hyperlane route for the new haiAERO issuer. It performs public reads and writes local review artifacts only. It does not deploy, sign, submit a Safe proposal, access a private key, or activate the application. The user will deploy when ready.

## Existing route and authority

The block-pinned [legacy route inventory](./aero-existing-hyperlane-route.json) records router, implementation, proxy admin, mailbox, hook and ISM runtime hashes, administrative getters and the selected cross-chain security dependencies. These are observed on-chain identities, not a claim that Sourcify verified every dependency's source.

| Property | Base | Optimism |
| --- | --- | --- |
| Legacy router | `0xD605046D24CdaD37Ca2Dff3aa8Ebf254CeEe86d5` | `0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152` |
| Mailbox | `0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D` | `0xd4C1905BB1D26BC93DAC913e13CaCC278CdCC80D` |
| Explicit ISM | `0x61E95b746d1C757b5D7211b6c37dd25811d0df0F` | `0xBd10Cd4989c5aaA327Cd4EAef92f1DD9431efD93` |
| Router owner and proxy-admin owner | `0xbd8EC4cb226EBaE228F8829E2ec23070b09165d3` | `0xbd8EC4cb226EBaE228F8829E2ec23070b09165d3` |
| Existing remote destination gas | `64000` for Optimism | `68000` for Base |

The confirmed deployer, `0xbd8…65d3`, matches both observed bridge administrators. It has no deployed code on either chain at the captured blocks; there is no deployed Safe owner list or threshold to report for this address. The backing-NFT treasury Safe, `0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3`, is a separate authority. Keeping that Safe in charge of sAERO NFTs does not transfer bridge ownership to it.

Each existing route ISM is a **1-of-2 aggregation**: the `0xbd8…65d3` trusted relayer can satisfy one branch, or a fallback routing ISM uses the mailbox's default security. At the captured blocks, that default requires an unpaused module and the peer-domain validator branch. The latter accepts either a Merkle-root or message-ID multisig, each **3-of-5 validators**. The JSON records the exact authorities, thresholds and validators. Preserving this configuration preserves its trusted-relayer authority; it does not turn the route into validator-only verification.

The routers store a zero custom hook and therefore use their mailbox's default hook. The inventory follows the selected peer-domain hook route, its aggregation children, gas-paymaster authority/oracle/overhead and required protocol-fee hook. It records the merkle-tree fallback too. Destination gas budgets in the new manifest remain explicit inputs: the observed legacy values are context, not simulation evidence for the new router implementation.

## Read-only preparation

1. Refresh the inventory when preparing the release:

   ```sh
   node scripts/aero-migration/bridge-inventory.cjs /absolute/path/legacy-bridge-inventory.json
   ```

   Public RPC URLs can be selected through `BASE_RPC_URL` and `OP_RPC_URL`. URLs and credentials are not copied into the artifact. The script pins finalized blocks, checks the canonical hashes, and rejects unsupported security modules or route pairings.

2. Copy [bridge-manifest.example.json](../scripts/aero-migration/bridge-manifest.example.json). Set the actual new wrapper's Base address, finalized creation transaction/block and runtime hash. Point `legacyInventory.file` to the reviewed inventory and supply its SHA-256. Record the review reference, security fingerprints and explicit destination gas budgets. `reviewed` / `securityReviewed` document the operator's review within the authorized migration work; they do not impose a new user-permission flow.

3. Generate a new local package:

   ```sh
   node scripts/aero-migration/prepare-bridge.cjs /absolute/path/reviewed-bridge-manifest.json /absolute/path/new-bridge-package
   ```

The generator refuses incomplete example inputs, legacy token/router substitutions, a changed reviewed security state, and an existing output directory. It checks the new wrapper's real finalized direct-creation receipt, runtime at creation and snapshot, absence before creation, non-proxy storage slots, metadata, new AERO / sAERO bindings and NFT treasury. No predicted address is accepted as deployment evidence. The manifest's expected wrapper runtime must come from the reviewed compiled issuer artifact; choosing a hash is not a substitute for that review.

The generated config uses fresh proxy admins, explicit router and proxy-admin owners, the selected existing ISM addresses, and mailbox-default hooks. The owners must match during this supported initial-deployment flow because the pinned CLI initially hands proxy administration to the router owner. A different administrative arrangement needs a separately prepared flow. The output has no router addresses, foreign-deployment entries or pre-enrolled legacy routers. Optimism's new synthetic initial supply is zero.

## Pinned CLI and deployment evidence

[hyperlane-toolchain.json](../scripts/aero-migration/hyperlane-toolchain.json) pins `@hyperlane-xyz/cli` **45.0.1**, its npm integrity, source commit `e830d2ee425e3de4334eb868c359148a4b2ce809`, and official registry commit `c02f061d7900c7dccd0ac6d464e5f44ba167c334`. The downloaded tarball's SHA-512 integrity was independently checked. Credential-named fields were removed from the registry metadata. The generated package lock pins the bundled CLI and uses an isolated registry, so existing local route caches cannot be adopted accidentally.

The deploy config lives at `registry/warp_routes/haiAERO/new-aero-base-optimism-deploy.yaml`. CLI 45 uses `warp deploy --warp-route-id haiAERO/new-aero-base-optimism --registry <isolated-registry>`; it does **not** accept the old `--config` deployment pattern. `cli-command.json` records the future command without executing it. It contains no private key, automatic confirmation flag or signer material. Installation and execution are left to the user when ready.

The plain EVM route selected here uses direct `CREATE`: the SDK's [HyperlaneDeployer](https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/e830d2ee425e3de4334eb868c359148a4b2ce809/typescript/sdk/src/deploy/HyperlaneDeployer.ts) calls [MultiProvider.handleDeploy](https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/e830d2ee425e3de4334eb868c359148a4b2ce809/typescript/sdk/src/providers/MultiProvider.ts), which calls the ethers factory's `deploy` for Base and Optimism. Fresh router implementation, proxy and proxy-admin deployments therefore have ordinary creation receipts with `contractAddress`. Existing ISM/hook addresses are reused, so this configuration does not need a newly deployed ISM factory event. Record every successful creation receipt and finalized code identity, then verify proxy slots, owners, remote enrollment and effective security before using the route. A change to the deployment mechanism must update that evidence plan.

After the user's deployment, the release still requires verified new router addresses and implementation identities, zero initial synthetic supply, explicit two-way message settlement, escrow/supply reconciliation, destination-gas validation and the application's normal activation evidence. `plan.json` always reports `activationReady: false`.

## Validation

The focused tests cover incomplete manifests, wrong underlying assets and receipt evidence, security drift, distinct route generation, zero synthetic supply, authority preservation, output overwrite prevention and credential-free toolchain artifacts. A fixture generated by the same config builder also passes the exact CLI 45.0.1 `WarpRouteDeployConfigMailboxRequiredSchema`. That schema check loaded only the bundled schema module in a disposable copy with the CLI entrypoint removed; it did not invoke deployment or signing.
