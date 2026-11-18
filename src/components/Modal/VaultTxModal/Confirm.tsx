import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { useAccount, useNetwork } from 'wagmi'

import type { VaultLeg } from '~/types'
import { NETWORK_ID, DEFAULT_VAULT_DATA, ActionState, VaultAction } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { handleTransactionError, useEthersSigner, useGeb } from '~/hooks'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { TransactionSummary } from '~/components/TransactionSummary'
import { ModalBody, ModalFooter } from '../index'

const legNames: Record<VaultLeg, string> = {
    deposit: 'deposit',
    withdraw: 'withdrawal',
    repay: 'repayment',
    borrow: 'borrowing transaction',
}

type ConfirmProps = {
    onClose?: () => void
}
export function Confirm({ onClose }: ConfirmProps) {
    const { t } = useTranslation()
    const history = useHistory()
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const {
        connectWalletModel: { tokensData },
        vaultModel: { vaultData, singleVault, transactionState },
    } = useStoreState((state) => state)
    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        vaultModel: vaultActions,
    } = useStoreActions((actions) => actions)

    const { action, updateForm, collateral, summary, error, errorMessage, debtLimitNotice } = useVault()
    const canConfirm =
        !!account &&
        !!signer &&
        chain?.id === NETWORK_ID &&
        error === undefined &&
        transactionState !== ActionState.LOADING

    // Leaving this review or switching wallets must not prompt for a later transaction.
    const reviewScope = useRef<AbortController>()
    useEffect(() => {
        const scope = new AbortController()
        reviewScope.current = scope
        return () => scope.abort()
    }, [account, chain?.id, singleVault?.id])

    const repayingInFull =
        (action === VaultAction.DEPOSIT_REPAY || action === VaultAction.WITHDRAW_REPAY) && vaultData.repayAll
    const notice = useMemo(() => {
        switch (action) {
            case VaultAction.DEPOSIT_REPAY:
                return Number(vaultData.deposit) > 0 && (vaultData.repayAll || Number(vaultData.repay) > 0)
                    ? 'Your wallet will ask you to confirm the deposit and repayment separately.'
                    : undefined
            case VaultAction.WITHDRAW_BORROW:
                return Number(vaultData.withdraw) > 0 && Number(vaultData.borrow) > 0
                    ? 'Your wallet will ask you to confirm the withdrawal and borrowing separately.'
                    : undefined
            default:
                return undefined
        }
    }, [action, vaultData.deposit, vaultData.repay, vaultData.repayAll, vaultData.withdraw, vaultData.borrow])

    const reset = () => {
        updateForm('clear')
        vaultActions.setVaultData(DEFAULT_VAULT_DATA)
        connectWalletActions.setIsStepLoading(false)
        vaultActions.fetchUserVaults({
            address: account as string,
            geb,
            tokensData,
            chainId: chain?.id || NETWORK_ID,
        })
    }

    const handleConfirm = async () => {
        const signal = reviewScope.current?.signal
        if (!canConfirm || !signer || !signal || signal.aborted) return

        vaultActions.setTransactionState(ActionState.LOADING)
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting For Confirmation',
            text: action === VaultAction.CREATE ? 'Open Vault' : 'Modify Vault',
            hint: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })
        let confirmedLeg: { name: VaultLeg; hash: string } | undefined
        let pendingLeg: { name: VaultLeg; hash: string } | undefined
        let nextLeg: VaultLeg | undefined
        try {
            connectWalletActions.setIsStepLoading(true)
            switch (action) {
                case VaultAction.CREATE: {
                    await vaultActions.depositAndBorrow({
                        vaultData,
                        signer,
                    })
                    history.push('/vaults?tab=user')
                    break
                }
                case VaultAction.DEPOSIT_BORROW: {
                    if (!singleVault) throw new Error('Vault marked for modification, but no vault is selected')
                    await vaultActions.depositAndBorrow({
                        vaultData,
                        signer,
                        vaultId: singleVault.id,
                    })
                    break
                }
                case VaultAction.DEPOSIT_REPAY:
                case VaultAction.WITHDRAW_BORROW: {
                    if (!singleVault) throw new Error('Vault marked for modification, but no vault is selected')
                    const legs: VaultLeg[] =
                        action === VaultAction.DEPOSIT_REPAY ? ['deposit', 'repay'] : ['withdraw', 'borrow']
                    for (const leg of legs) {
                        if (!(Number(vaultData[leg]) > 0 || (leg === 'repay' && vaultData.repayAll))) continue
                        nextLeg = leg
                        if (signal.aborted) throw new Error('The vault review changed before the next transaction.')
                        const tx = await vaultActions.submitVaultLeg({
                            vaultData,
                            signer,
                            vaultId: singleVault.id,
                            leg,
                        })
                        pendingLeg = { name: leg, hash: tx.hash }
                        if (!signal.aborted) updateForm({ [leg]: undefined })
                        await tx.wait()
                        confirmedLeg = pendingLeg
                        pendingLeg = undefined
                        connectWalletActions.setForceUpdateTokens(true)
                    }
                    if (!confirmedLeg) throw new Error('Enter an amount to modify your vault.')
                    break
                }
                case VaultAction.WITHDRAW_REPAY: {
                    if (!singleVault) throw new Error('Vault marked for modification, but no vault is selected')
                    await vaultActions.repayAndWithdraw({
                        vaultData,
                        signer,
                        vaultId: singleVault.id,
                    })
                    break
                }
                default:
                    throw new Error(`Invalid operation (${action})`)
            }
            vaultActions.setTransactionState(ActionState.SUCCESS)
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
            if (!signal.aborted) {
                reset()
                onClose?.()
            }
        } catch (e: any) {
            vaultActions.setTransactionState(ActionState.ERROR)
            connectWalletActions.setIsStepLoading(false)
            if (pendingLeg || confirmedLeg) {
                // A hash already exists. Close the original review so it cannot repeat a submitted leg.
                if (!signal.aborted) {
                    reset()
                    onClose?.()
                }
                const confirmed = confirmedLeg ? `Your ${legNames[confirmedLeg.name]} confirmed. ` : ''
                const remaining = pendingLeg
                    ? 'Check the linked transaction before submitting it again.'
                    : `Your ${legNames[nextLeg!]} was not submitted. Review that amount on your vault.`
                popupsActions.setIsWaitingModalOpen(true)
                popupsActions.setWaitingPayload({
                    title: 'Vault transaction update',
                    text: confirmed + remaining,
                    hash: pendingLeg?.hash ?? confirmedLeg?.hash,
                    status: ActionState.ERROR,
                })
            } else {
                handleTransactionError(e)
            }
        }
    }

    return (
        <>
            <ModalBody>
                <Description>{t('confirm_details_text')}</Description>
                <TransactionSummary
                    items={[
                        {
                            label: 'Collateral',
                            value: {
                                current: summary.collateral.current?.formatted,
                                after: summary.collateral.after.formatted,
                                label: collateral.name,
                            },
                        },
                        {
                            label: 'Debt',
                            value: {
                                current: summary.debt.current?.formatted,
                                after: summary.debt.after.formatted,
                                label: 'HAI',
                            },
                        },
                        {
                            label: 'Collateral Ratio',
                            value: {
                                current: summary.collateralRatio.current?.formatted,
                                after: summary.collateralRatio.after.formatted,
                            },
                        },
                        {
                            label: 'Liquidation Price',
                            value: {
                                current: summary.liquidationPrice.current?.formatted,
                                after: summary.liquidationPrice.after.formatted,
                            },
                        },
                    ]}
                />
                {repayingInFull && (
                    <Text>
                        Paying off this vault settles its full debt, including fees accrued before the transaction
                        confirms.
                    </Text>
                )}
                {errorMessage && <Text role="alert">{errorMessage}</Text>}
                {debtLimitNotice && <Text role="status">{debtLimitNotice}</Text>}
                {!!notice && (
                    <Text $fontSize="0.8em" $color="rgba(0,0,0,0.4)">
                        {notice}
                    </Text>
                )}
            </ModalBody>
            <ModalFooter $justify="flex-end">
                <HaiButton $variant="yellowish" disabled={!canConfirm} onClick={handleConfirm}>
                    Confirm Transaction{notice ? 's' : ''}
                </HaiButton>
            </ModalFooter>
        </>
    )
}

const Description = styled(Text)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
    `}
`
