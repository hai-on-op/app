import {
    type Dispatch,
    type SetStateAction,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef
} from 'react'

import type { ReactChildren } from '~/types'
import {
    DEFAULT_SAFE_STATE,
    Status,
    getCollateralRatio,
    ratioChecker,
    type ISafe,
    getLiquidationPrice,
    riskStateToStatus
} from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { VaultAction, VaultInfo, useVaultInfo } from '~/hooks'

export type FormState = {
    deposit?: string,
    borrow?: string,
    withdraw?: string,
    repay?: string
}

type VaultContext = VaultInfo & {
    vault?: ISafe,
    setActiveVault: (vault: ISafe, create?: boolean) => void,
    action: VaultAction,
    setAction: Dispatch<SetStateAction<VaultAction>>,
    formState: FormState,
    updateForm: Dispatch<Partial<FormState> | 'clear'>,
    simulation?: {
        collateral?: string,
        debt?: string,
        collateralRatio?: string,
        riskStatus?: Status,
        liquidationPrice?: string
    },
    riskStatus?: Status,
    parsedCR?: number,
    safetyCR?: number,
    collateralName?: string,
    haiUSD: number,
    collateralUSD?: number
}

const defaultState: VaultContext = {
    setActiveVault: () => undefined,
    action: VaultAction.INFO,
    setAction: () => undefined,
    formState: {},
    updateForm: () => {},
    collateralName: 'WETH',
    totalCollateral: '',
    totalDebt: '',
    collateralRatio: '',
    liquidationPrice: '',
    availableCollateral: '',
    availableHai: '',
    liquidationPenaltyPercentage: 0,
    balances: {},
    parsedAmounts: {
        leftInput: '',
        rightInput: ''
    },
    stabilityFeePercentage: '',
    haiUSD: 1
}

const VaultContext = createContext<VaultContext>(defaultState)

export const useVault = () => useContext(VaultContext)

type Props = {
    action: VaultContext['action'],
    setAction: VaultContext['setAction'],
    children: ReactChildren
}
export function VaultProvider({ action, setAction, children }: Props) {
    const { liquidationData, safeData, singleSafe } = useStoreState(({ safeModel }) => safeModel)
    const { safeModel: safeActions } = useStoreActions(actions => actions)

    const dataRef = useRef(safeData)
    dataRef.current = safeData

    const setActiveVault = useCallback((vault: ISafe, create = false) => {
        safeActions.setSafeData({
            ...DEFAULT_SAFE_STATE,
            collateral: vault.collateralName
        })
        safeActions.setSingleSafe(create ? undefined: vault)
        setAction(create ? VaultAction.CREATE: VaultAction.DEPOSIT_BORROW)
        // eslint-disable-next-line
    }, [safeActions])

    const [formState, updateForm] = useReducer((
        previous: FormState,
        update: Partial<FormState> | 'clear'
    ) => {
        if (update === 'clear') return {}

        return {
            ...previous,
            ...update
        }
    }, {})
    
    const vaultInfo = useVaultInfo(action)

    const collateralData = useMemo(() => (
        liquidationData?.collateralLiquidationData[vaultInfo.collateralName]
    ), [liquidationData, vaultInfo.collateralName])

    const simulation = useMemo(() => {
        if (!Object.values(formState).some((value = '0') => Number(value) > 0)) {
            return undefined
        }

        switch(action) {
            case VaultAction.DEPOSIT_BORROW:
            case VaultAction.CREATE: {
                const { deposit = '0', borrow = '0' } = formState
                if (Number(deposit) <= 0 && Number(borrow) <= 0) return undefined
                return {
                    collateral: Number(deposit) > 0 ? deposit: undefined,
                    debt: Number(borrow) > 0 ? borrow: undefined
                }
            }
            case VaultAction.WITHDRAW_REPAY: {
                const { withdraw = '0', repay = '0' } = formState
                if (Number(withdraw) <= 0 && Number(repay) <= 0) return undefined
                return {
                    collateral: Number(withdraw) > 0 ? withdraw: undefined,
                    debt: Number(repay) > 0 ? repay: undefined
                }
            }
            default: return undefined
        }
    }, [action, formState])

    useEffect(() => {
        if (action === VaultAction.DEPOSIT_BORROW || action === VaultAction.CREATE) {
            safeActions.setSafeData({
                ...dataRef.current,
                leftInput: formState.deposit?.toString() || '',
                rightInput: formState.borrow?.toString() || ''
            })
        }
        else if (action === VaultAction.WITHDRAW_REPAY) {
            safeActions.setSafeData({
                ...dataRef.current,
                leftInput: formState.withdraw?.toString() || '',
                rightInput: formState.repay?.toString() || ''
            })
        }
        else safeActions.setSafeData({
            ...dataRef.current,
            leftInput: '',
            rightInput: ''
        })

        return () => {
            safeActions.setSafeData({
                ...dataRef.current,
                leftInput: '',
                rightInput: ''
            })
        }
    }, [action, formState, safeActions])

    const { collateralRatio, safetyRatio, riskStatus } = useMemo(() => {
        const { safetyCRatio } = collateralData || {}
        const cr = parseFloat(
            (singleSafe?.collateralRatio || vaultInfo.collateralRatio).toString()
        )

        const state = ratioChecker(cr, Number(safetyCRatio))
        const status = riskStateToStatus[state] || Status.UNKNOWN
        
        return {
            collateralRatio: cr,
            safetyRatio: safetyCRatio
                ? 100 * parseFloat(safetyCRatio.toString())
                : undefined,
            riskStatus: status
        }
    }, [collateralData, singleSafe, vaultInfo])

    // TODO: clarify accumulatedRate as it affects total debt calculations
    // const simulatedDebt = useMemo(() => {
    //     if (!vault || Number(safeData.rightInput || '0') <= 0) return undefined

    //     const currentDebt = parseFloat(vault.debt)
    //     const inputDebt = parseFloat(safeData.rightInput)
    //     if (vaultInfo.action === VaultAction.WITHDRAW_REPAY) {
    //         return Math.max(currentDebt - inputDebt, 0)
    //     }
    //     return currentDebt + inputDebt
    // }, [vault, vaultInfo, safeData])

    const [simulatedCR, simulatedRiskStatus] = useMemo(() => {
        if (!simulation) return []
        if (!collateralData) return []

        const {
            currentPrice,
            liquidationCRatio,
            safetyCRatio
        } = collateralData
        const cr = getCollateralRatio(
            vaultInfo.totalCollateral.toString(),
            vaultInfo.totalDebt.toString(),
            currentPrice?.liquidationPrice!,
            liquidationCRatio
        )
        const state = ratioChecker(Number(cr), Number(safetyCRatio))
        const status = riskStateToStatus[state] || Status.UNKNOWN
        return [cr, status]
    }, [simulation, vaultInfo, collateralData])

    const simulatedLiquidationPrice = useMemo(() => {
        if (!simulation || !collateralData || !liquidationData?.currentRedemptionPrice) {
            return undefined
        }

        const { liquidationCRatio } = collateralData
        return getLiquidationPrice(
            vaultInfo.totalCollateral.toString(),
            vaultInfo.totalDebt.toString(),
            liquidationCRatio,
            liquidationData?.currentRedemptionPrice
        )
    }, [simulation, vaultInfo, liquidationData?.currentRedemptionPrice, collateralData])

    return (
        <VaultContext.Provider value={{
            vault: singleSafe,
            setActiveVault,
            action,
            setAction,
            formState,
            updateForm,
            ...vaultInfo,
            simulation: simulation
                ? {
                    ...simulation,
                    collateralRatio: simulatedCR?.toString(),
                    riskStatus: simulatedRiskStatus,
                    liquidationPrice: simulatedLiquidationPrice?.toString()
                }
                : undefined,
            riskStatus,
            parsedCR: collateralRatio,
            safetyCR: safetyRatio,
            haiUSD: parseFloat(liquidationData?.currentRedemptionPrice || '1'),
            collateralUSD: parseFloat(collateralData?.currentPrice?.value || '0')
        }}>
            {children}
        </VaultContext.Provider>
    )
}
