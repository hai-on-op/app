import { type EasyPeasyConfig, type Store, createStore } from 'easy-peasy'
import { type VaultModel, vaultModel } from './vaultModel'

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
