# haiAERO v2 — Manual testing checklist

Prepared November 16, 2026.

App: <http://localhost:5173/haiAERO>

Wallet: **HAI Dev — `0xFc5d96042Cdfe586433c2AF27CB8Bb87fCF68b4D`**

These tests use the dev contracts deployed on **Base and Optimism mainnet**. Use the small amounts below. The app should show the **Dev contracts on mainnet** banner.

## Test contracts and inputs

| Network | haiAERO v2 dev contract |
| --- | --- |
| Base | `0x9b48B8F64156c1eD247E2EDcD679A8Ea979557bB` |
| Optimism | `0x0190D1F9a1afB336B38361AEc5eAE02B4a7fD596` |

Old and new haiAERO share a symbol but are different tokens. Use **haiAERO v2** for the new minting, migration, and bridge flows. Use **Bridge haiAERO v1** only for legacy tokens.

The wallet was prepared with AERO on Base, xAERO on Optimism, new haiAERO v2 on both chains, and these dedicated test inputs:

- **0.001 haiVELO v1** on Optimism.
- **0.001 haiVELO v2** on Optimism.
- **0.001 legacy haiAERO** on each chain.
- **sAERO NFT #26496:** timed, containing **0.001 AERO**.
- **sAERO NFT #26497:** permanent, containing **0.001 AERO**.

Run the checklist in order. If you already completed a test, its inputs may have been consumed. Compare balance changes with the balances immediately before each transaction.

For approvals, confirm the wallet prompt and wait for confirmation before submitting the separate mint or migration transaction. An approval step may be skipped if a sufficient approval already exists.

## 1. Connect HAI Dev

1. Open the app and refresh once to load the latest changes.
2. Click **Connect** and select the HAI Dev wallet.
3. Check the full address above, not just the wallet name.
4. Leave the wallet connected for at least 30 seconds.

- [x] The connected address is correct.
- [x] The **Dev contracts on mainnet** banner appears.
- [x] Balances load.
- [x] The page stays stable; the loading overlay does not repeatedly reopen.

## 2. Mint on Base using AERO

Screen: **haiAERO v2 → Mint**

1. Set **Minting network** to **Base**.
2. Set **Deposit** to **AERO**.
3. Enter **0.001**.
4. Click **Switch to Base** if prompted and accept the network change.
5. Confirm that **You receive** shows **0.001 haiAERO**.
6. Click **Approve AERO**, confirm in your wallet, and wait for confirmation.
7. Click the mint button and confirm the separate mint transaction.

- [x] **Mint confirmed on Base** appears.
- [x] Base AERO decreases by **0.001**.
- [x] Base haiAERO v2 increases by **0.001**.
- [x] **View source transaction** opens the correct transaction.

## 3. Mint on Optimism using xAERO

Screen: **haiAERO v2 → Mint**

1. Set **Minting network** to **Optimism**.
2. Switch your wallet to Optimism when prompted.
3. Enter **0.001 xAERO**.
4. Confirm that **You receive** shows **0.001 haiAERO**.
5. Approve xAERO, wait for confirmation, then submit the mint.

- [x] **Mint confirmed on Optimism** appears.
- [x] xAERO decreases by **0.001**.
- [x] Optimism haiAERO v2 increases by **0.001**.

## 4. Mint using timed and permanent sAERO NFTs

Screen: **haiAERO v2 → Mint → Base → sAERO NFTs**

1. Select **Base** and switch your wallet when prompted.
2. Set **Deposit** to **sAERO NFTs**.
3. Select **#26496 — Timed — 0.001 AERO**.
4. Select **#26497 — Permanent — 0.001 AERO**.
5. If the list cannot load, enter `26496, 26497` in **sAERO NFT IDs**.
6. Confirm that **You receive** totals **0.002 haiAERO**.
7. Approve each NFT when prompted. Wait for each approval to confirm.
8. Submit the mint after the required approvals are complete.

- [x] Both NFT types can be selected.
- [x] The preview totals their principal correctly: **0.002 haiAERO**.
- [x] The remaining approval count decreases after each approval.
- [x] Minting succeeds after the approvals.
- [x] Base haiAERO v2 increases by **0.002**.
- [x] Both NFTs disappear from the wallet's available NFT list.

## 5. Migrate haiVELO v1

Screen: **haiAERO v2 → Migrate**

1. Switch your wallet to **Optimism**.
2. Set **Token to migrate** to **haiVELO v1**.
3. Enter **0.001**.
4. Confirm that **You receive** shows **0.000044 haiAERO**.
5. Approve the legacy token, wait for confirmation, then migrate.

- [x] A migration confirmation appears.
- [x] haiVELO v1 decreases by **0.001**.
- [x] Optimism haiAERO v2 increases by **0.000044**.

## 6. Migrate haiVELO v2

Screen: **haiAERO v2 → Migrate**

1. Change **Token to migrate** to **haiVELO v2**.
2. Enter **0.001**.
3. Confirm that **You receive** shows **0.000044 haiAERO**.
4. Approve, wait for confirmation, then migrate.

- [x] A migration confirmation appears.
- [x] haiVELO v2 decreases by **0.001**.
- [x] Optimism haiAERO v2 increases by **0.000044**.

## 7. Migrate legacy haiAERO on Optimism

Screen: **haiAERO v2 → Migrate**

1. Change **Token to migrate** to **haiAERO v1**.
2. Enter **0.001**.
3. Confirm that **You receive** shows **0.001 haiAERO**.
4. Approve, wait for confirmation, then migrate.

- [x] A migration confirmation appears.
- [x] Legacy haiAERO on Optimism decreases by **0.001**.
- [x] Optimism haiAERO v2 increases by **0.001**.

## 8. Bridge new haiAERO v2 from Base to Optimism

Screen: **haiAERO v2 → Bridge**

1. Set **From network** to **Base**.
2. Confirm that the destination is **Optimism**.
3. Switch your wallet to Base when prompted.
4. Enter **0.0001**.
5. Check the receive amount and bridge fee.
6. Submit the bridge and confirm the wallet transaction. The v2 bridge does **not** require an ERC20 approval.
7. Wait for destination delivery before continuing.

- [x] The preview shows **0.0001 haiAERO** arriving on Optimism.
- [x] A bridge fee appears.
- [x] There is no token approval step.
- [x] The status first reports source confirmation with delivery pending.
- [x] The status eventually changes to **Delivered to Optimism**.
- [x] Base haiAERO v2 decreases by **0.0001**.
- [x] Optimism haiAERO v2 increases by **0.0001**.
- [x] **View bridge message** opens the message for this transfer.

Source confirmation alone is not completion. If delivery is pending, keep the transaction hash and do not submit the same transfer again.

## 9. Bridge new haiAERO v2 from Optimism to Base

Screen: **haiAERO v2 → Bridge**

1. Set **From network** to **Optimism**.
2. Confirm that the destination is **Base**.
3. Switch your wallet to Optimism when prompted.
4. Enter **0.0001** and submit the bridge.
5. Wait for delivery.

- [x] There is no token approval step.
- [x] The status eventually changes to **Delivered to Base**.
- [x] Optimism haiAERO v2 decreases by **0.0001**.
- [x] Base haiAERO v2 increases by **0.0001**.

## 10. Bridge legacy haiAERO, then migrate it

Screen: outer **Bridge haiAERO v1** tab

1. Open **Bridge haiAERO v1**.
2. Set the direction to **Base → Optimism** using the direction arrow if needed.
3. Switch your wallet to Base.
4. Enter **0.001**.
5. Approve the legacy bridge if prompted, wait for confirmation, then submit the bridge.
6. Wait for the legacy tokens to arrive on Optimism.

- [x] Legacy haiAERO on Base decreases by **0.001**.
- [x] Legacy haiAERO on Optimism increases by **0.001**.
- [x] The bridge footer, migration note, and **Continue to migration** button do not overlap.

Screen: **Continue to migration → haiAERO v2 → Migrate**

7. Click **Continue to migration**.
8. Confirm that the v2 **Migrate** screen opens with **haiAERO v1** selected.
9. Switch your wallet to Optimism.
10. Enter **0.001**, approve if needed, then migrate.

- [x] Legacy haiAERO on Optimism decreases by **0.001**.
- [x] Optimism haiAERO v2 increases by **0.001**.

## 11. Validate errors, persistence, and layout

Run these on the v2 screens. No successful transaction is needed for the invalid-input checks.

- [ ] A blank amount cannot be submitted.
- [ ] An amount of **0** cannot be submitted.
- [ ] An amount above the wallet balance cannot be submitted.
- [ ] Rejecting an approval or transaction in the wallet leaves the form usable and preserves its input.
- [ ] Selecting a different source network offers the correct wallet network switch.
- [ ] Changing the network or migration token clears the previous amount and updates the preview.
- [ ] Refreshing after a completed transaction preserves the correct balances and v2 transaction history for the same wallet.
- [ ] The screen stays stable while the wallet remains connected.
- [ ] At a narrow browser width, fields and buttons remain readable and do not overlap.
- [ ] A balance that has not loaded is shown as unavailable, rather than as a confirmed zero; a failed read displays an error.

The **Create legacy vault** tab is the existing v1 vault flow. These tests do not migrate existing vault collateral or debt, and do not establish vault support for haiAERO v2.

## Report a failure

Copy this block for any failed step:

```text
Step number:
Screen / selected network / selected token:
Connected wallet address:
Amount or NFT IDs:
Expected result:
Actual result or error:
Transaction hash, if submitted:
Screenshot, if useful:
```

If a transaction is still pending, record its hash before retrying anything.
