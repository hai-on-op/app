import { useEffect, useMemo, useState } from 'react'
import { useAccount, useNetwork } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { handleTransactionError, useBalance, useEthersSigner, useGeb, useTokenApproval, ApprovalState } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton } from '~/styles'
import { Modal, type ModalProps } from './index'
import { NumberInput } from '../NumberInput'
import { TransactionSummary } from '../TransactionSummary'

enum Action {
    WRAP,
    UNWRAP,
}

export function WrapTokenModal(props: ModalProps) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const [action] = useState(Action.WRAP)

    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        vaultModel: vaultActions,
    } = useStoreActions((actions) => actions)

    const veloBalance = useBalance('VELO')
    const haiVeloBalance = useBalance('HAIVELO')

    const [amount, setAmount] = useState('')

    const [approvalState, approve] = useTokenApproval(
        amount,
        geb?.tokenList?.VELO?.address,
        geb?.contracts?.wrappedTokenHaiVelo?.address
    )

    useEffect(() => () => setAmount(''), [action])

    const refreshBalance = () => {
        if (!account) return
        connectWalletActions.fetchTokenData({ geb, user: account })
    }

    const [balance, balanceMinusCushion] = useMemo(() => {
        if (!chain?.id || !veloBalance) return []
        const bal = parseFloat(veloBalance.raw)
        const balMinusCushion = Math.max(bal - 0.01, 0).toString()
        return [
            {
                raw: bal.toString(),
                formatted: formatNumberWithStyle(bal, { maxDecimals: 4 }),
            },
            {
                raw: balMinusCushion,
                formatted: formatNumberWithStyle(balMinusCushion, { maxDecimals: 4 }),
            },
        ]
    }, [chain?.id, veloBalance])

    const details = useMemo(() => {
        return {
            action: 'Wrap',
            symbol: 'VELO',
            balance,
            balanceMinusCushion,
        }
    }, [balance, balanceMinusCushion])

    const isNonZero = parseFloat(amount || '0') > 0

    const insufficientFunds = parseFloat(amount || '0') > parseFloat(details.balance?.raw || '0')

    const onWrap = async () => {
        if (!signer || !isNonZero || insufficientFunds) return

        const title = `${details.action}ping ${details.symbol}`
        try {
            popupsActions.setIsWaitingModalOpen(true)

            if (approvalState === ApprovalState.NOT_APPROVED) {
                popupsActions.setWaitingPayload({
                    title: 'Waiting For Approval',
                    text: `Approving ${details.symbol}`,
                    hint: 'Confirm the approval transaction in your wallet',
                    status: ActionState.LOADING,
                })

                await approve()

                popupsActions.setWaitingPayload({
                    title: 'Waiting For Confirmation',
                    text: title,
                    hint: 'Confirm this transaction in your wallet',
                    status: ActionState.LOADING,
                })
            } else {
                popupsActions.setWaitingPayload({
                    title: 'Waiting For Confirmation',
                    text: title,
                    hint: 'Confirm this transaction in your wallet',
                    status: ActionState.LOADING,
                })
            }

            await vaultActions.wrapToken({
                signer,
                title,
                amount,
            })

            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
        } catch (error: any) {
            handleTransactionError(error)
        } finally {
            refreshBalance()
        }
    }

    return (
        <Modal
            {...props}
            heading={`${details.action} ${details.symbol}`.toUpperCase()}
            footerContent={
                <Footer>
                    <HaiButton
                        $variant="yellowish"
                        disabled={!signer || !isNonZero || insufficientFunds}
                        onClick={onWrap}
                    >
                        {approvalState === ApprovalState.NOT_APPROVED ? 'Approve' : details.action}
                    </HaiButton>
                </Footer>
            }
        >
            <NumberInput
                label={`${details.symbol} to ${details.action}`}
                value={amount}
                placeholder="0.00"
                unitLabel={details.symbol}
                onChange={(value: string) => setAmount(value)}
                subLabel={`Max ${details.balanceMinusCushion?.formatted || '0'} ${details.symbol}`}
                onMax={() => setAmount(details.balanceMinusCushion?.raw || '0')}
            />
            <TransactionSummary
                items={[
                    {
                        label: 'VELO',
                        value: {
                            current: isNonZero ? balance?.formatted || '0' : undefined,
                            after: formatNumberWithStyle(
                                action === Action.WRAP
                                    ? parseFloat(balance?.raw || '0') - parseFloat(amount || '0')
                                    : parseFloat(balance?.raw || '0') + parseFloat(amount || '0'),
                                { maxDecimals: 4 }
                            ),
                            label: 'VELO',
                            tooltip: isNonZero
                                ? `This estimate does not include any fees associated with the ${details.action.toLowerCase()} transaction`
                                : undefined,
                        },
                    },
                    {
                        label: 'haiVELO',
                        value: {
                            current: isNonZero ? haiVeloBalance?.formatted || '0' : undefined,
                            after: formatNumberWithStyle(
                                action === Action.WRAP
                                    ? parseFloat(haiVeloBalance?.raw || '0') + parseFloat(amount || '0')
                                    : parseFloat(haiVeloBalance?.raw || '0') - parseFloat(amount || '0'),
                                { maxDecimals: 4 }
                            ),
                            label: 'haiVELO',
                        },
                    },
                ]}
            />
        </Modal>
    )
}

const Footer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))``
