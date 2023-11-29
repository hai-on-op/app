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
    type ISafe,
    safeIsSafe,
    VaultAction,
    type FormState,
    type Collateral,
    type Debt,
    getLiquidationPrice,
    VaultInfoError,
    vaultInfoErrors,
    ratioChecker,
    riskStateToStatus,
    getRatePercentage
} from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import { useCollateral } from './useCollateral'
import { useDebt } from './useDebt'
import { type Simulation, useSimulation } from './useSimulation'
import { useVaultError } from './useVaultError'

type VaultContext = {
    vault?: ISafe,
    setActiveVault: (vault: ISafe, create?: boolean) => void,
    action: VaultAction,
    setAction: Dispatch<SetStateAction<VaultAction>>,
    formState: FormState,
    updateForm: Dispatch<Partial<FormState> | 'clear'>,
    collateral: Collateral,
    debt: Debt,
    simulation?: Simulation,
    safetyRatio?: number,
    collateralRatio: string,
    liquidationPrice: string,
    riskStatus: Status,
    isSafe: boolean,
    liquidationPenaltyPercentage: number,
    stabilityFeePercentage: string,
    error?: VaultInfoError,
    errorMessage?: string
}

const defaultState: VaultContext = {
    setActiveVault: () => undefined,
    action: VaultAction.INFO,
    setAction: () => undefined,
    formState: {},
    updateForm: () => {},
    collateral: {
        name: 'WETH',
        total: '',
        available: '',
        balance: ''
    },
    debt: {
        total: '',
        available: '',
        balance: '',
        priceInUSD: '1'
    },
    collateralRatio: '',
    liquidationPrice: '',
    riskStatus: Status.UNKNOWN,
    isSafe: true,
    liquidationPenaltyPercentage: 0,
    stabilityFeePercentage: ''
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

    const collateral = useCollateral(action)
    const debt = useDebt(action, collateral.liquidationData)

    const liquidationPrice = useMemo(() => {
        if (
            !liquidationData?.currentRedemptionPrice
            || !collateral.liquidationData?.liquidationCRatio
        ) return ''

        return getLiquidationPrice(
            collateral.total || '0',
            debt.total || '0', 
            collateral.liquidationData.liquidationCRatio,
            liquidationData.currentRedemptionPrice
        ).toString()
    }, [collateral, debt, liquidationData])

    const collateralRatio = useMemo(() => {
        if (singleSafe?.collateralRatio) return singleSafe.collateralRatio

        const { currentPrice, liquidationCRatio } = collateral.liquidationData || {}
        if (!currentPrice?.liquidationPrice || !liquidationCRatio) return '0'

        return getCollateralRatio(
            collateral.total || '0',
            debt.total || '0',
            currentPrice.liquidationPrice,
            liquidationCRatio
        ).toString()
    }, [singleSafe, collateral, debt])

    const { safetyRatio, riskStatus } = useMemo(() => {
        const { safetyCRatio } = collateral.liquidationData || {}
        const cr = parseFloat(
            (singleSafe?.collateralRatio || collateralRatio).toString()
        )
        const state = ratioChecker(cr, Number(safetyCRatio))
        const status = riskStateToStatus[state] || Status.UNKNOWN
        
        return {
            safetyRatio: safetyCRatio
                ? 100 * parseFloat(safetyCRatio.toString())
                : undefined,
            riskStatus: status
        }
    }, [collateral.liquidationData, singleSafe, collateralRatio])

    const liquidationPenaltyPercentage = Number(collateral.liquidationData?.liquidationPenalty || 0) - 1

    // const formattedLiquidationPenaltyPercentage = toPercentage(liquidationPenaltyPercentage || 0.2, 0)

    const stabilityFeePercentage = useMemo(() => {
        return collateral.liquidationData
            ? getRatePercentage(collateral.liquidationData.totalAnnualizedStabilityFee, 2).toString()
            : '-'
    }, [collateral.liquidationData])

    const isSafe = useMemo(() => {
        if (!collateral.liquidationData?.currentPrice.safetyPrice) return true

        return safeIsSafe(
            collateral.total || '0',
            debt.total || '0',
            collateral.liquidationData.currentPrice.safetyPrice
        )
    }, [collateral, debt])

    const simulation = useSimulation({
        action,
        formState,
        collateral,
        debt
    })

    const { error, errorMessage } = useVaultError({
        action,
        collateral,
        debt,
        collateralRatio,
        isSafe
    })

    return (
        <VaultContext.Provider value={{
            vault: singleSafe,
            setActiveVault,
            action,
            setAction,
            formState,
            updateForm,
            collateral,
            debt,
            simulation,
            safetyRatio,
            collateralRatio,
            liquidationPrice,
            riskStatus,
            isSafe,
            liquidationPenaltyPercentage,
            stabilityFeePercentage,
            error,
            errorMessage: error
                ? errorMessage || vaultInfoErrors[error] || undefined
                : undefined
        }}>
            {children}
        </VaultContext.Provider>
    )
}
