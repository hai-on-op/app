import { type Dispatch, createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import { useHistory } from 'react-router-dom'

import type { Collateral, Debt, FormState, IVault, ReactChildren, SetState } from '~/types'
import {
    NETWORK_ID,
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
import { usePublicGeb } from '~/hooks'

import { useCollateral } from './useCollateral'
import { useDebt } from './useDebt'
import { type Simulation, useSimulation } from './useSimulation'
import { type Summary, useSummary, DEFAULT_SUMMARY } from './useSummary'
import { useVaultError } from './useVaultError'
import { useVaultDebtLimits } from './useVaultDebtLimits'

type SetActiveVaultProps =
    | {
          create: true
          collateralName: string
          vault?: undefined
      }
    | {
          create?: false
          collateralName?: undefined
          vault: IVault
      }

type VaultContext = {
    vault?: IVault
    setActiveVault: (props: SetActiveVaultProps) => void
    action: VaultAction
    setAction: SetState<VaultAction>
    formState: FormState
    updateForm: Dispatch<Partial<FormState> | 'clear'>
    refreshVault: () => Promise<void>
    collateral: Collateral
    debt: Debt
    simulation?: Simulation
    safetyRatio?: number
    collateralRatio: string
    liquidationPrice: string
    riskStatus: Status
    isSafe: boolean
    liquidationPenaltyPercentage: number
    summary: Summary
    error?: VaultInfoError
    errorMessage?: string
    debtLimitNotice?: string
}

const defaultState: VaultContext = {
    setActiveVault: () => undefined,
    action: VaultAction.INFO,
    setAction: () => undefined,
    formState: {},
    updateForm: () => {},
    refreshVault: async () => {},
    collateral: {
        name: 'WETH',
        total: {
            after: {
                raw: '',
                formatted: '0',
            },
        },
        balance: {
            e18: '',
            raw: '',
            formatted: '',
        },
    },
    debt: {
        total: {
            after: {
                raw: '',
                formatted: '0',
            },
        },
        available: {
            raw: '',
            formatted: '0',
        },
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
    action: VaultContext['action']
    setAction: VaultContext['setAction']
    children: ReactChildren
}
export function VaultProvider({ action, setAction, children }: Props) {
    const history = useHistory()
    const { address } = useAccount()
    const { chain } = useNetwork()
    const geb = usePublicGeb()

    const { liquidationData, vaultData, singleVault } = useStoreState(({ vaultModel }) => vaultModel)
    const { proxyAddress, tokensData } = useStoreState(({ connectWalletModel }) => connectWalletModel)
    const { vaultModel: vaultActions, connectWalletModel: connectWalletActions } = useStoreActions((actions) => actions)

    const dataRef = useRef(vaultData)
    dataRef.current = vaultData

    const setActiveVault: VaultContext['setActiveVault'] = useCallback(
        ({ create, collateralName, vault }: SetActiveVaultProps) => {
            // vaultActions.setVaultData({
            //     ...DEFAULT_VAULT_DATA,
            //     collateral: collateralName || vault?.collateralName || 'WETH',
            // })
            // vaultActions.setSingleVault(create ? undefined: vault)
            // setAction(create ? VaultAction.CREATE: VaultAction.DEPOSIT_BORROW)
            history.push(
                create
                    ? `/vaults/open?collateral=${collateralName || 'WETH'}`
                    : `/vaults/manage${vault?.id ? `?id=${vault.id}` : ''}`
            )
        },
        [history]
    )

    const [draft, updateForm] = useReducer(
        (previous: FormState & { payoffVaultId?: string }, update: Partial<FormState> | 'clear') => {
            if (update === 'clear') return {}
            const next = { ...previous, ...update }
            if ('repay' in update) next.payoffVaultId = update.repayAll ? singleVault?.id : undefined
            return next
        },
        {}
    )
    const repaying = action === VaultAction.DEPOSIT_REPAY || action === VaultAction.WITHDRAW_REPAY
    const borrowing = [VaultAction.CREATE, VaultAction.DEPOSIT_BORROW, VaultAction.WITHDRAW_BORROW].includes(action)
    const creating = action === VaultAction.CREATE
    const { limits, notice: limitQueryNotice } = useVaultDebtLimits(
        geb,
        !!address &&
            chain?.id === NETWORK_ID &&
            (borrowing || repaying) &&
            (creating || !!singleVault?.vaultHandler),
        creating ? tokensData[vaultData.collateral]?.bytes32String : singleVault?.collateralType,
        creating ? undefined : singleVault?.vaultHandler,
        repaying ? proxyAddress || undefined : undefined
    )
    const repayAll = repaying && !!singleVault && draft.payoffVaultId === singleVault.id && draft.repayAll === true
    const snapshot = repaying && limitQueryNotice ? undefined : limits
    const collateral = useCollateral(action, draft, vaultData.collateral, snapshot)
    const debt = useDebt(action, { ...draft, repayAll }, collateral, snapshot)
    const formState: FormState = useMemo(
        () => ({
            deposit: draft.deposit,
            withdraw: draft.withdraw,
            borrow: draft.borrow,
            repay: repayAll ? debt.payoff?.raw ?? draft.repay : draft.repay,
            repayAll,
        }),
        [draft, debt.payoff?.raw, repayAll]
    )
    const debtLimitNotice =
        borrowing && Number(formState.borrow) > 0
            ? limitQueryNotice
            : repaying && (repayAll || Number(formState.repay) > 0) && limitQueryNotice
            ? 'The repayment estimate assumes zero internal HAI credit until current vault data is available.'
            : undefined

    const refreshVault = useCallback(async () => {
        if (!address) return
        try {
            await connectWalletActions.fetchTokenData({ geb, user: address })
        } catch {
            // Keep the last wallet balances until the next refresh.
        }
    }, [address, connectWalletActions, geb])

    useEffect(() => {
        if (action === VaultAction.CREATE) void refreshVault()
    }, [action, collateral.name, refreshVault])

    const liquidationPrice = useMemo(() => {
        if (!liquidationData?.currentRedemptionPrice || !collateral.liquidationData?.liquidationCRatio) return ''

        return getLiquidationPrice(
            collateral.total.current?.raw || '0',
            debt.total.current?.raw || '0',
            collateral.liquidationData.liquidationCRatio,
            liquidationData.currentRedemptionPrice
        ).toString()
    }, [collateral, debt, liquidationData])

    const collateralRatio = useMemo(() => {
        if (singleVault?.collateralRatio) return singleVault.collateralRatio

        const { currentPrice, liquidationCRatio } = collateral.liquidationData || {}
        if (!currentPrice?.liquidationPrice || !liquidationCRatio) return '0'

        return getCollateralRatio(
            collateral.total.current?.raw || collateral.total.after.raw,
            debt.total.current?.raw || debt.total.after.raw,
            currentPrice.liquidationPrice,
            liquidationCRatio
        ).toString()
    }, [singleVault, collateral, debt])

    const { safetyRatio, riskStatus } = useMemo(() => {
        const { safetyCRatio } = collateral.liquidationData || {}
        const cr =
            singleVault && (!singleVault.debt || !parseFloat(singleVault.debt))
                ? Infinity
                : parseFloat((singleVault?.collateralRatio || collateralRatio).toString())
        const state = ratioChecker(cr, Number(safetyCRatio))
        const status = riskStateToStatus[state] || Status.UNKNOWN

        return {
            safetyRatio: safetyCRatio ? 100 * parseFloat(safetyCRatio.toString()) : undefined,
            riskStatus: status,
        }
    }, [collateral.liquidationData, singleVault, collateralRatio])

    const liquidationPenaltyPercentage = Number(collateral.liquidationData?.liquidationPenalty || 0) - 1

    // const formattedLiquidationPenaltyPercentage = toPercentage(liquidationPenaltyPercentage || 0.2, 0)

    const isSafe = useMemo(() => {
        if (!collateral.liquidationData?.currentPrice.safetyPrice) return true

        return vaultIsSafe(
            collateral.total.after.raw || '0',
            debt.total.after.raw || '0',
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
        liquidationPrice: simulation?.liquidationPrice || liquidationPrice,
    })

    const { error, errorMessage } = useVaultError({
        action,
        formState,
        collateral,
        debt,
        isSafe,
        limits: snapshot,
    })

    // update vaultData as values change
    useEffect(() => {
        vaultActions.setVaultData({
            ...dataRef.current,
            deposit: formState.deposit || '',
            withdraw: formState.withdraw || '',
            borrow: formState.borrow || '',
            repay: formState.repay || '',
            repayAll,
            totalCollateral: collateral.total.current?.raw || collateral.total.after.raw,
            totalDebt: debt.total.current?.raw || debt.total.after.raw,
            collateralRatio: parseFloat(collateralRatio),
            liquidationPrice: parseFloat(liquidationPrice),
        })
    }, [formState, repayAll, collateral.total, debt.total, collateralRatio, liquidationPrice, vaultActions])

    return (
        <VaultContext.Provider
            value={{
                vault: singleVault,
                setActiveVault,
                action,
                setAction,
                formState,
                updateForm,
                refreshVault,
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
                errorMessage: error === undefined ? undefined : errorMessage || vaultInfoErrors[error],
                debtLimitNotice,
            }}
        >
            {children}
        </VaultContext.Provider>
    )
}
