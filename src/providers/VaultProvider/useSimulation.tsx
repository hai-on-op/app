import { useMemo } from 'react'

import type { Collateral, Debt } from '~/types'
import { Status, VaultAction, getCollateralRatio, getLiquidationPrice, ratioChecker, riskStateToStatus } from '~/utils'
import { useStoreState } from '~/store'

export type Simulation = {
    collateral?: string
    debt?: string
    collateralRatio?: string
    riskStatus?: Status
    liquidationPrice?: string
}

type Props = {
    action: VaultAction
    formState: any
    collateral: Collateral
    debt: Debt
}
export function useSimulation({ action, formState, collateral, debt }: Props): Simulation | undefined {
    const { liquidationData } = useStoreState(({ vaultModel }) => vaultModel)

    const simulation = useMemo(() => {
        if (!Object.values(formState).some((value = '0') => Number(value) > 0)) {
            return undefined
        }

        switch (action) {
            case VaultAction.DEPOSIT_BORROW:
            case VaultAction.CREATE: {
                const { deposit = '0', borrow = '0' } = formState
                if (Number(deposit) <= 0 && Number(borrow) <= 0) return undefined
                return {
                    collateral: Number(deposit) > 0 ? deposit : undefined,
                    debt: Number(borrow) > 0 ? borrow : undefined,
                }
            }
            case VaultAction.DEPOSIT_REPAY: {
                const { deposit = '0', repay = '0' } = formState
                if (Number(deposit) <= 0 && Number(repay) <= 0) return undefined
                return {
                    collateral: Number(deposit) > 0 ? deposit : undefined,
                    debt: Number(repay) > 0 ? repay : undefined,
                }
            }
            case VaultAction.WITHDRAW_REPAY: {
                const { withdraw = '0', repay = '0' } = formState
                if (Number(withdraw) <= 0 && Number(repay) <= 0) return undefined
                return {
                    collateral: Number(withdraw) > 0 ? withdraw : undefined,
                    debt: Number(repay) > 0 ? repay : undefined,
                }
            }
            case VaultAction.WITHDRAW_BORROW: {
                const { withdraw = '0', borrow = '0' } = formState
                if (Number(withdraw) <= 0 && Number(borrow) <= 0) return undefined
                return {
                    collateral: Number(withdraw) > 0 ? withdraw : undefined,
                    debt: Number(borrow) > 0 ? borrow : undefined,
                }
            }
            default:
                return undefined
        }
    }, [action, formState])

    const [collateralRatio, riskStatus] = useMemo(() => {
        if (!simulation) return []
        if (!collateral.liquidationData) return []

        const { currentPrice, liquidationCRatio, safetyCRatio } = collateral.liquidationData
        const cr = getCollateralRatio(
            collateral.total.after.raw,
            debt.total.after.raw,
            currentPrice.liquidationPrice,
            liquidationCRatio
        )
        const state = ratioChecker(Number(cr), Number(safetyCRatio))
        const status = riskStateToStatus[state] || Status.UNKNOWN
        return [cr, status]
    }, [simulation, collateral, debt])

    const liquidationPrice = useMemo(() => {
        if (!simulation || !collateral.liquidationData || !liquidationData?.currentRedemptionPrice) {
            return undefined
        }

        return getLiquidationPrice(
            collateral.total.after.raw,
            debt.total.after.raw,
            collateral.liquidationData.liquidationCRatio,
            liquidationData?.currentRedemptionPrice
        ).toString()
    }, [simulation, collateral, debt, liquidationData])

    return simulation
        ? {
              ...simulation,
              collateralRatio,
              riskStatus,
              liquidationPrice,
          }
        : undefined
}
