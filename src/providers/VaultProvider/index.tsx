import {
    type Dispatch,
    type SetStateAction,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from 'react'
import { useHistory } from 'react-router-dom'

import type { Collateral, Debt, FormState, IVault, ReactChildren } from '~/types'
import {
    // DEFAULT_VAULT_DATA,
    Status,
    VaultAction,
    VaultInfoError,
    getCollateralRatio,
    getLiquidationPrice,
    vaultIsSafe,
    ratioChecker,
    riskStateToStatus,
    vaultInfoErrors,
} from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import { useCollateral } from './useCollateral'
import { useDebt } from './useDebt'
import { type Simulation, useSimulation } from './useSimulation'
import { type Summary, useSummary, DEFAULT_SUMMARY } from './useSummary'
import { useVaultError } from './useVaultError'

type SetActiveVaultProps = {
    create: true,
    collateralName: string,
    vault?: undefined
} | {
    create?: false,
    collateralName?: undefined,
    vault: IVault
}

type VaultContext = {
    vault?: IVault,
    setActiveVault: (props: SetActiveVaultProps) => void,
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
    summary: Summary,
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
        balance: {
            e18: '',
            raw: '',
            formatted: '',
        },
    },
    debt: {
        total: '',
        available: '',
        balance: {
            e18: '',
            raw: '',
            formatted: '',
        },
        priceInUSD: '1',
    },
    collateralRatio: '',
    liquidationPrice: '',
    riskStatus: Status.UNKNOWN,
    isSafe: true,
    liquidationPenaltyPercentage: 0,
    summary: DEFAULT_SUMMARY,
}

const VaultContext = createContext<VaultContext>(defaultState)

export const useVault = () => useContext(VaultContext)

type Props = {
    action: VaultContext['action'],
    setAction: VaultContext['setAction'],
    children: ReactChildren
}
export function VaultProvider({ action, setAction, children }: Props) {
    const history = useHistory()

    const {
        liquidationData,
        vaultData,
        singleVault,
    } = useStoreState(({ vaultModel }) => vaultModel)
    const { vaultModel: vaultActions } = useStoreActions(actions => actions)

    const dataRef = useRef(vaultData)
    dataRef.current = vaultData

    const setActiveVault: VaultContext['setActiveVault'] = useCallback(({
        create,
        collateralName,
        vault,
    }: SetActiveVaultProps) => {
        // vaultActions.setVaultData({
        //     ...DEFAULT_VAULT_DATA,
        //     collateral: collateralName || vault?.collateralName || 'WETH',
        // })
        // vaultActions.setSingleVault(create ? undefined: vault)
        // setAction(create ? VaultAction.CREATE: VaultAction.DEPOSIT_BORROW)
        history.push(create
            ? `/vaults/open?collateral=${collateralName || 'WETH'}`
            : `/vaults/manage${vault?.id ? `?id=${vault.id}`: ''}`
        )
    }, [history.push])

    const [formState, updateForm] = useReducer((
        previous: FormState,
        update: Partial<FormState> | 'clear'
    ) => {
        if (update === 'clear') return {}

        return {
            ...previous,
            ...update,
        }
    }, {})

    useEffect(() => {
        const inputs = {
            leftInput: '',
            rightInput: '',
        }
        if (action === VaultAction.DEPOSIT_BORROW || action === VaultAction.CREATE) {
            inputs.leftInput = formState.deposit?.toString() || ''
            inputs.rightInput = formState.borrow?.toString() || ''
        }
        else if (action === VaultAction.WITHDRAW_REPAY) {
            inputs.leftInput = formState.withdraw?.toString() || ''
            inputs.rightInput = formState.repay?.toString() || ''
        }
        vaultActions.setVaultData({
            ...dataRef.current,
            ...inputs,
        })

        return () => {
            vaultActions.setVaultData({
                ...dataRef.current,
                leftInput: '',
                rightInput: '',
            })
        }
    }, [action, formState, vaultActions])

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
        if (singleVault?.collateralRatio) return singleVault.collateralRatio

        const { currentPrice, liquidationCRatio } = collateral.liquidationData || {}
        if (!currentPrice?.liquidationPrice || !liquidationCRatio) return '0'

        return getCollateralRatio(
            collateral.total || '0',
            debt.total || '0',
            currentPrice.liquidationPrice,
            liquidationCRatio
        ).toString()
    }, [singleVault, collateral, debt])

    const { safetyRatio, riskStatus } = useMemo(() => {
        const { safetyCRatio } = collateral.liquidationData || {}
        const cr = parseFloat(
            (singleVault?.collateralRatio || collateralRatio).toString()
        )
        const state = ratioChecker(cr, Number(safetyCRatio))
        const status = riskStateToStatus[state] || Status.UNKNOWN
        
        return {
            safetyRatio: safetyCRatio
                ? 100 * parseFloat(safetyCRatio.toString())
                : undefined,
            riskStatus: status,
        }
    }, [collateral.liquidationData, singleVault, collateralRatio])

    const liquidationPenaltyPercentage = Number(collateral.liquidationData?.liquidationPenalty || 0) - 1

    // const formattedLiquidationPenaltyPercentage = toPercentage(liquidationPenaltyPercentage || 0.2, 0)

    const isSafe = useMemo(() => {
        if (!collateral.liquidationData?.currentPrice.safetyPrice) return true

        return vaultIsSafe(
            collateral.total || '0',
            debt.total || '0',
            collateral.liquidationData.currentPrice.safetyPrice
        )
    }, [collateral, debt])

    const simulation = useSimulation({
        action,
        formState,
        collateral,
        debt,
    })

    const summary = useSummary({
        vault: singleVault,
        collateral,
        debt,
        simulatedCR: simulation?.collateralRatio,
        liquidationPrice,
    })

    const { error, errorMessage } = useVaultError({
        action,
        collateral,
        debt,
        collateralRatio,
        isSafe,
    })

    // update vaultData as values change
    useEffect(() => {
        vaultActions.setVaultData({
            ...dataRef.current,
            totalCollateral: collateral.total,
            totalDebt: debt.total,
            collateralRatio: parseFloat(collateralRatio),
            liquidationPrice: parseFloat(liquidationPrice),
        })
    }, [collateral.total, debt.total, collateralRatio, liquidationPrice])

    return (
        <VaultContext.Provider value={{
            vault: singleVault,
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
            summary,
            error,
            errorMessage: error
                ? errorMessage || vaultInfoErrors[error] || undefined
                : undefined,
        }}>
            {children}
        </VaultContext.Provider>
    )
}
