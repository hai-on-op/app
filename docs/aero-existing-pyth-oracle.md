# Existing AERO Pyth oracle reuse

The selected migration policy reuses the existing deployed HAIAERO price oracle unchanged for the distinct new haiAERO collateral. This records the user's decision and the verified wiring; it does not activate a collateral or choose its risk parameters.

All chain reads below are pinned to finalized Optimism block **158633871**, hash `0x42f03c13c2f2466df336f64395f5e91aaf554815dfa6fcb01c959f3b46ae849b`, timestamp `1792866519`. A canonical block reread matched. The [machine-readable evidence](aero-existing-pyth-oracle.json) includes runtime hashes and exact returned values.

| Component | Address |
| --- | --- |
| HAI OracleRelayer | `0x6270403b908505F02Da05BE5c1956aBB59FDb3A6` |
| Existing HAIAERO delayed oracle, selected for reuse | `0x7DA9D12c5b6Fd2548B0E535Ec12F2406D69aBb75` |
| Its priceSource, ChainlinkRelayerChild | `0xaBB1D7583a6c0620be73859DF4DFbcab78696E2e` |
| PythAggregatorV3 | `0xDAa95C72330a7eF1390874677323B2a13E0d94D7` |
| Pyth proxy | `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C` |
| Pyth implementation at the pinned block | `0xacFaDACb95974C7729f3C910176a66eA88e32A80` |
| OP sequencer feed | `0x371EAD81c9102C9BF4874A9075FFFf170F2Ee389` |

The selected delayed oracle's runtime hash is `0x37adb8e31ee85fd46689284e4a606cad06e4ae3f1d69ea564e60a628a386bc60`. Its Pyth feed ID, read from `priceId()`, is:

```text
0x9db37f4d5654aad3e37e2e14ffd8d53265fb3026d1d8f91146539eebaa2ef45f
```

[Pyth's Hermes metadata](https://hermes.pyth.network/v2/price_feeds?query=AERO&asset_type=crypto) returns that exact ID as `Crypto.AERO/USD`, description `AERODROME FINANCE / US DOLLAR`. The ID comes from the deployed adapter; no Pyth Pro numeric identifier was substituted.

## Settings and observed validity

- Delayed oracle `updateDelay = 3600` seconds. Last update was timestamp `1792863003`, 3516 seconds before the pinned block.
- Relayer `staleThreshold = 3600` seconds. Its sequencer feed returned status `0`, meaning up.
- Adapter decimals are `8`. The relayer stores `multiplier = 10` as an **exponent** and scales the answer by `10 ** 10 = 10000000000` to return 18-decimal WAD values.
- The path applies no price haircut, VELO conversion, or confidence-interval deduction. It uses the Pyth point price.
- Delayed current price was `681529940000000000` WAD ($0.68152994), valid. Next price was `691237720000000000` WAD, valid.
- The undelayed adapter/relayer price was `700273540000000000` WAD ($0.70027354), valid. Publication timestamp was `1792866427`, 92 seconds before the pinned block.
- Existing `HAIAERO` collateral safety/liquidation ratios were 1.6/1.5 RAY. These are observations of legacy settings; the new collateral still requires its own explicit risk configuration.

The adapter calls `getPriceUnsafe`; Pyth's separate `getValidTimePeriod() = 60` is therefore not this path's freshness check. The HAI relayer checks 3600-second freshness and sequencer status. The delayed oracle caches its validity flag: a stopped keeper does not automatically invalidate a previously valid cached price. Continue the existing update keeper and monitor `lastUpdateTime` as well as the current valid flag.

## Source and runtime evidence

[Sourcify's PythAggregatorV3 record](https://sourcify.dev/server/v2/contract/10/0xDAa95C72330a7eF1390874677323B2a13E0d94D7?fields=all) is an exact match, and its on-chain runtime hash matched the direct RPC read. The Pyth proxy also has an exact-match record. Its current implementation address and runtime are recorded; that implementation was not verified by Sourcify (`match: null`).

The two HAI child oracles were not indexed by Sourcify (404). They were independently reproduced from [HAI core commit de5a2d0](https://github.com/hai-on-op/core/tree/de5a2d0fc17b9419a80751b8d22e3dd92e19e7f7), using Solidity `0.8.20`, Paris EVM and optimizer runs `10000`. Both deployed runtime bodies match the compiled runtime **after removing only the trailing Solidity CBOR metadata**. Full bytecode hashes differ because metadata differs; this is a partial runtime/source reproduction, not a Sourcify full verification. The [compiler input](aero-existing-pyth-oracle.compiler-input.json) and its SHA256 are retained for reproduction; compiling it requires no chain mutation.

## Reuse binding

The new collateral can reference the same delayed oracle address in `OracleRelayer._cParams(newCollateralType).oracle`. The oracle accepts no collateral identifier and has no exclusive collateral assignment. Shared use consumes the same cached price and requires no duplicate oracle deployment or separate update schedule. Verify the recorded runtime and dependency getters during deployment preflight, then bind the new collateral through the normal authorized initialization or parameter update. Preserve the old collateral's binding.
