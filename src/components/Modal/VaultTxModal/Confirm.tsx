import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { BigNumber } from 'ethers'
import { useAccount, useNetwork } from 'wagmi'

import { NETWORK_ID, DEFAULT_VAULT_DATA, ActionState, VaultAction } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { handleTransactionError, useEthersSigner, useGeb } from '~/hooks'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { TransactionSummary } from '~/components/TransactionSummary'
import { ModalBody, ModalFooter } from '../index'

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

    const { action, updateForm, collateral, summary } = useVault()

    const notice = useMemo(() => {
        switch (action) {
            case VaultAction.DEPOSIT_REPAY:
                return `Note: Depositing and repaying in the same transaction is not currently supported, so you will be prompted to approve two separate transactions`
            case VaultAction.WITHDRAW_BORROW:
                return `Note: Withdrawing and borrowing in the same transaction is not currently supported, so you will be prompted to approve two separate transactions`
            default:
                return undefined
        }
    }, [action])

    const reset = () => {
        updateForm('clear')
        vaultActions.setVaultData(DEFAULT_VAULT_DATA)
        connectWalletActions.setIsStepLoading(true)
        vaultActions.fetchUserVaults({
            address: account as string,
            geb,
            tokensData,
            chainId: chain?.id || NETWORK_ID,
        })
    }

    const handleConfirm = async () => {
        if (!account || !signer || transactionState === ActionState.LOADING) return

        vaultActions.setTransactionState(ActionState.LOADING)
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting For Confirmation',
            text: action === VaultAction.CREATE ? 'Open Vault' : 'Modify Vault',
            hint: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })
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
                case VaultAction.DEPOSIT_REPAY: {
                    if (!singleVault) throw new Error('Vault marked for modification, but no vault is selected')
                    if (BigNumber.from(vaultData.deposit || '0').isZero()) {
                        await vaultActions.repayAndWithdraw({
                            vaultData,
                            signer,
                            vaultId: singleVault.id,
                        })
                    } else {
                        await vaultActions.depositAndRepay({
                            vaultData,
                            signer,
                            vaultId: singleVault.id,
                        })
                    }
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
                case VaultAction.WITHDRAW_BORROW: {
                    if (!singleVault) throw new Error('Vault marked for modification, but no vault is selected')
                    await vaultActions.withdrawAndBorrow({
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
            onClose?.()
            reset()
        } catch (e: any) {
            vaultActions.setTransactionState(ActionState.ERROR)
            handleTransactionError(e)
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
                {!!notice && (
                    <Text $fontSize="0.8em" $color="rgba(0,0,0,0.4)">
                        {notice}
                    </Text>
                )}
            </ModalBody>
            <ModalFooter $justify="flex-end">
                <HaiButton
                    $variant="yellowish"
                    disabled={!account || !signer || transactionState === ActionState.LOADING}
                    onClick={handleConfirm}
                >
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
