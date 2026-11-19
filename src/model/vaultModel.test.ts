import { type EasyPeasyConfig, type Store, createStore } from 'easy-peasy'
import type { JsonRpcSigner, TransactionResponse } from '@ethersproject/providers'
import { vi } from 'vitest'
import { handleDepositAndBorrow } from '~/services/blockchain'
import { DEFAULT_VAULT_DATA, NETWORK_ID } from '~/utils'
import { type VaultModel, vaultModel } from './vaultModel'
import { transactionsModel } from './transactionsModel'
import { popupsModel } from './popupsModel'

vi.mock('~/services/blockchain', () => ({
    handleDepositAndBorrow: vi.fn(),
}))

const liquidationDataMock = {
    currentRedemptionPrice: '3',
    currentRedemptionRate: '1',
    globalDebt: '1000',
    globalDebtCeiling: '1000',
    perVaultDebtCeiling: '1000',
    collateralLiquidationData: {
        WETH: {
            accumulatedRate: '1',
            currentPrice: {
                liquidationPrice: '123',
                safetyPrice: '123',
                value: '123',
            },
            debtFloor: '500',
            liquidationCRatio: '1.45',
            liquidationPenalty: '1.12',
            safetyCRatio: '1.45',
            totalAnnualizedStabilityFee: '1',
        },
    },
}

const listMock = [
    {
        id: '6',
        date: '1612881676',
        vaultHandler: 'handler',
        riskState: 3,
        collateral: '2',
        debt: '2',
        totalDebt: '2',
        availableDebt: '2',
        accumulatedRate: '1',
        collateralRatio: '2',
        currentRedemptionPrice: '3',
        internalCollateralBalance: '0',
        freeCollateral: '0',
        currentLiquidationPrice: '2',
        liquidationCRatio: '1.45',
        liquidationPenalty: '1.12',
        liquidationPrice: '123',
        totalAnnualizedStabilityFee: '1',
        currentRedemptionRate: '1',
        collateralName: 'WETH',
        collateralType: 'WETH',
    },
]

describe('vault model', () => {
    let store: Store<VaultModel, EasyPeasyConfig<{}, any>>
    beforeEach(() => {
        store = createStore(vaultModel)
    })
    it('records the submitted leg in transaction history before the receipt is available', async () => {
        const tx = {
            hash: 'depositHash',
            from: 'owner',
            chainId: NETWORK_ID,
            wait: vi.fn(),
        } as unknown as TransactionResponse
        vi.mocked(handleDepositAndBorrow).mockResolvedValue(tx)
        const appStore = createStore({ vaultModel, transactionsModel, popupsModel })
        const signer = {} as JsonRpcSigner
        const vaultData = { ...DEFAULT_VAULT_DATA, deposit: '1', repay: '2', withdraw: '3', borrow: '4' }
        const submitted = await appStore
            .getActions()
            .vaultModel.submitVaultLeg({ signer, vaultId: '17', vaultData, leg: 'deposit' })
        expect(handleDepositAndBorrow).toHaveBeenCalledWith(
            signer,
            { ...vaultData, repay: '', repayAll: false, withdraw: '', borrow: '' },
            '17'
        )
        expect(appStore.getState().transactionsModel.transactions[tx.hash]).toMatchObject({
            hash: tx.hash,
            summary: 'Deposit collateral · Vault #17',
        })
        expect(appStore.getState().popupsModel.waitingPayload.hash).toBe(tx.hash)
        expect(submitted.wait).not.toHaveBeenCalled()
    })
    describe('setLiquidationData', () => {
        it('sets Liquidation Data', () => {
            store.getActions().setLiquidationData(liquidationDataMock)
            const liquidationData = store.getState().liquidationData
            expect(liquidationData).toBeTruthy()
            expect(liquidationData!.collateralLiquidationData.WETH.currentPrice).toBeTruthy()
            expect(liquidationData!.collateralLiquidationData.WETH.currentPrice.liquidationPrice).toEqual('123')
            expect(liquidationData!.collateralLiquidationData.WETH.currentPrice.safetyPrice).toEqual('123')
            expect(liquidationData!.collateralLiquidationData.WETH.currentPrice.value).toEqual('123')
            expect(liquidationData!.collateralLiquidationData.WETH.accumulatedRate).toEqual('1')
            expect(liquidationData!.collateralLiquidationData.WETH.debtFloor).toEqual('500')
            expect(liquidationData!.collateralLiquidationData.WETH.liquidationCRatio).toEqual('1.45')
            expect(liquidationData!.collateralLiquidationData.WETH.liquidationPenalty).toEqual('1.12')
            expect(liquidationData!.collateralLiquidationData.WETH.safetyCRatio).toEqual('1.45')
            expect(liquidationData!.collateralLiquidationData.WETH.totalAnnualizedStabilityFee).toEqual('1')
            expect(liquidationData!.globalDebt).toEqual('1000')
            expect(liquidationData!.globalDebtCeiling).toEqual('1000')
            expect(liquidationData!.perVaultDebtCeiling).toEqual('1000')
        })
    })

    describe('setVaultList', () => {
        it('keeps retired collateral vaults accessible to their owner', () => {
            const vaults = ['WBTC', 'APXETH'].map((collateralName, index) => ({
                ...listMock[0],
                id: String(index + 1),
                collateralName,
            }))
            store.getActions().setList(vaults)
            expect(store.getState().list).toEqual(vaults)
        })

        it('sets Vault List', () => {
            store.getActions().setList(listMock)
            store.getActions().setLiquidationData(liquidationDataMock)
            const list = store.getState().list
            const liquidationData = store.getState().liquidationData
            expect(list.length).toEqual(1)
            const vault = list[0]
            expect(vault).toBeTruthy()
            expect(vault.id).toEqual('6')
            expect(vault.date).toEqual('1612881676')
            expect(vault.riskState).toEqual(3)
            expect(vault.collateral).toEqual('2')
            expect(vault.debt).toEqual('2')
            expect(vault.totalDebt).toEqual('2')
            expect(vault.availableDebt).toEqual('2')
            expect(vault.collateralRatio).toEqual('2')
            expect(vault.internalCollateralBalance).toEqual('0')
            expect(vault.currentLiquidationPrice).toEqual('2')
            expect(vault.collateralName).toEqual('WETH')
            expect(vault.collateralType).toEqual('WETH')

            expect(vault.accumulatedRate).toEqual(liquidationData!.collateralLiquidationData.WETH.accumulatedRate)
            expect(vault.accumulatedRate).toEqual(liquidationData!.collateralLiquidationData.WETH.accumulatedRate)
            expect(vault.liquidationCRatio).toEqual(liquidationData!.collateralLiquidationData.WETH.liquidationCRatio)
            expect(vault.liquidationPenalty).toEqual(liquidationData!.collateralLiquidationData.WETH.liquidationPenalty)
            expect(vault.liquidationPrice).toEqual(
                liquidationData!.collateralLiquidationData.WETH.currentPrice.liquidationPrice
            )
            expect(vault.totalAnnualizedStabilityFee).toEqual(
                liquidationData!.collateralLiquidationData.WETH.totalAnnualizedStabilityFee
            )
            expect(vault.currentRedemptionRate).toEqual(liquidationData!.currentRedemptionRate)
            expect(vault.currentRedemptionPrice).toEqual(liquidationData!.currentRedemptionPrice)
        })
    })
})
