import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { useAccount, useNetwork } from 'wagmi'

import { DEFAULT_NETWORK_ID, DEFAULT_VAULT_DATA, ActionState, VaultAction } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { handleTransactionError, useEthersSigner, useGeb } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { TransactionSummary } from '../TransactionSummary'

export function ReviewVaultTxModal({ onClose, ...props }: ModalProps) {
    const { t } = useTranslation()
    const history = useHistory()
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const {
        connectWalletModel: { tokensData },
        vaultModel: { vaultData, singleVault },
    } = useStoreState((state) => state)
    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        vaultModel: vaultActions,
    } = useStoreActions((actions) => actions)

    const { action, updateForm, collateral, summary } = useVault()

    const reset = useCallback(() => {
        updateForm('clear')
        vaultActions.setVaultData(DEFAULT_VAULT_DATA)
        connectWalletActions.setIsStepLoading(true)
        vaultActions.fetchUserVaults({
            address: account as string,
            geb,
            tokensData,
            chainId: chain?.id || DEFAULT_NETWORK_ID,
        })
    }, [updateForm, vaultActions, connectWalletActions, account, geb, tokensData])

    const handleConfirm = useCallback(async () => {
        if (!account || !signer) return

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
            onClose?.()
            reset()
        } catch (e: any) {
            vaultActions.setTransactionState(ActionState.ERROR)
            handleTransactionError(e)
        }
    }, [
        onClose,
        account,
        signer,
        history,
        action,
        vaultData,
        singleVault,
        connectWalletActions,
        popupsActions,
        vaultActions,
        reset,
    ])

    return (
        <Modal
            heading="REVIEW TRANSACTION"
            onClose={onClose}
            {...props}
            footerContent={
                <Footer>
                    <HaiButton $variant="yellowish" disabled={!account || !signer} onClick={handleConfirm}>
                        Confirm Transaction
                    </HaiButton>
                </Footer>
            }
        >
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
        </Modal>
    )
}

const Description = styled(Text)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
    `}
`

const Footer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-end',
    $align: 'center',
    ...props,
}))``
