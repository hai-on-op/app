import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { useAccount, useNetwork } from 'wagmi'

import { DEFAULT_NETWORK_ID, DEFAULT_SAFE_STATE, VaultAction } from '~/utils'
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
        safeModel: { safeData, singleSafe },
    } = useStoreState(state => state)
    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        safeModel: safeActions,
    } = useStoreActions(actions => actions)

    const {
        action,
        updateForm,
        collateral,
        summary,
    } = useVault()

    const reset = useCallback(() => {
        updateForm('clear')
        safeActions.setSafeData(DEFAULT_SAFE_STATE)
        connectWalletActions.setIsStepLoading(true)
        safeActions.setIsSafeCreated(true)
        safeActions.fetchUserSafes({
            address: account as string,
            geb,
            tokensData,
            chainId: chain?.id || DEFAULT_NETWORK_ID,
        })
    }, [updateForm, safeActions, connectWalletActions, account, geb, tokensData])

    const handleConfirm = useCallback(async () => {
        if (!account || !signer) return

        safeActions.setIsSuccessfulTx(false)
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting For Confirmation',
            text: action === VaultAction.CREATE ? 'Create Vault': 'Modify Vault',
            hint: 'Confirm this transaction in your wallet',
            status: 'loading',
        })
        try {
            connectWalletActions.setIsStepLoading(true)
            switch(action) {
                case VaultAction.CREATE: {
                    await safeActions.depositAndBorrow({
                        safeData,
                        signer,
                    })
                    history.push('/vaults')
                    break
                }
                case VaultAction.DEPOSIT_BORROW: {
                    if (!singleSafe) throw new Error('Safe marked for modification, but no safe is selected')
                    await safeActions.depositAndBorrow({
                        safeData,
                        signer,
                        safeId: singleSafe.id,
                    })
                    break
                }
                case VaultAction.WITHDRAW_REPAY: {
                    if (!singleSafe) throw new Error('Safe marked for modification, but no safe is selected')
                    await safeActions.repayAndWithdraw({
                        safeData,
                        signer,
                        safeId: singleSafe.id,
                    })
                    break
                }
                default: throw new Error(`Invalid operation (${action})`)
            }
            safeActions.setIsSuccessfulTx(true)
            safeActions.setIsSafeCreated(true)
            popupsActions.setIsWaitingModalOpen(false)
            onClose?.()
            reset()
        } catch(e: any) {
            safeActions.setIsSuccessfulTx(false)
            handleTransactionError(e)
        }
    }, [
        onClose, account, signer, history,
        action, safeData, singleSafe, connectWalletActions, popupsActions, safeActions, reset,
    ])

    return (
        <Modal
            heading="REVIEW TRANSACTION"
            onClose={onClose}
            {...props}
            footerContent={(
                <Footer>
                    <HaiButton
                        $variant="yellowish"
                        disabled={!account || !signer}
                        onClick={handleConfirm}>
                        Confirm Transaction
                    </HaiButton>
                </Footer>
            )}>
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

const Description = styled(Text)``

const Footer = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-end',
    $align: 'center',
    ...props,
}))``
