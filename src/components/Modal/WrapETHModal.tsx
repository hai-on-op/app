import { useEffect, useMemo, useState } from 'react'
import { useAccount, useNetwork } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useBalance, useEthersSigner, useGeb } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { NumberInput } from '../NumberInput'
import { TransactionSummary } from '../TransactionSummary'

enum Action {
    WRAP,
    UNWRAP,
}

export function WrapETHModal(props: ModalProps) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const [action, setAction] = useState(Action.WRAP)

    const { ethBalance } = useStoreState(({ connectWalletModel }) => connectWalletModel)
    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        vaultModel: vaultActions,
    } = useStoreActions((actions) => actions)

    const wethBalance = useBalance('WETH')

    const [amount, setAmount] = useState('')

    useEffect(() => () => setAmount(''), [action])

    const refreshBalance = () => {
        if (!account) return
        connectWalletActions.fetchTokenData({ geb, user: account })
    }

    const [balance, balanceMinusCushion] = useMemo(() => {
        if (!chain?.id || !ethBalance) return []

        const bal = parseFloat(ethBalance[chain.id].toString())
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
    }, [chain?.id, ethBalance])

    const details = useMemo(() => {
        switch (action) {
            case Action.UNWRAP:
                return {
                    action: 'Unwrap',
                    symbol: 'WETH',
                    balance: wethBalance,
                    balanceMinusCushion: wethBalance,
                }
            case Action.WRAP:
                return {
                    action: 'Wrap',
                    symbol: 'ETH',
                    balance,
                    balanceMinusCushion,
                }
        }
    }, [action, balance, balanceMinusCushion, wethBalance])

    const isNonZero = parseFloat(amount || '0') > 0

    const insufficientFunds = parseFloat(amount || '0') > parseFloat(details.balance?.raw || '0')

    const onWrap = async () => {
        if (!signer || !isNonZero || insufficientFunds) return

        const title = `${details.action}ping ${details.symbol}`
        try {
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                text: title,
                hint: 'Confirm this transaction in your wallet',
                status: ActionState.LOADING,
            })

            switch (action) {
                case Action.UNWRAP: {
                    await vaultActions.unwrapEther({
                        signer,
                        title,
                        amount,
                    })
                    break
                }
                case Action.WRAP: {
                    await vaultActions.wrapEther({
                        signer,
                        title,
                        amount,
                    })
                    break
                }
            }
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
                    <SwitchText onClick={() => setAction((a) => (a === Action.WRAP ? Action.UNWRAP : Action.WRAP))}>
                        Need to {action === Action.WRAP ? 'unwrap' : 'wrap'} instead?
                    </SwitchText>
                    <HaiButton
                        $variant="yellowish"
                        disabled={!signer || !isNonZero || insufficientFunds}
                        onClick={onWrap}
                    >
                        {details.action}
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
                        label: 'ETH',
                        value: {
                            current: isNonZero ? balance?.formatted || '0' : undefined,
                            after: formatNumberWithStyle(
                                action === Action.WRAP
                                    ? parseFloat(balance?.raw || '0') - parseFloat(amount || '0')
                                    : parseFloat(balance?.raw || '0') + parseFloat(amount || '0'),
                                { maxDecimals: 4 }
                            ),
                            label: 'ETH',
                            tooltip: isNonZero
                                ? `This estimate does not include any fees associated with the ${details.action.toLowerCase()} transaction`
                                : undefined,
                        },
                    },
                    {
                        label: 'WETH',
                        value: {
                            current: isNonZero ? wethBalance?.formatted || '0' : undefined,
                            after: formatNumberWithStyle(
                                action === Action.WRAP
                                    ? parseFloat(wethBalance?.raw || '0') + parseFloat(amount || '0')
                                    : parseFloat(wethBalance?.raw || '0') - parseFloat(amount || '0'),
                                { maxDecimals: 4 }
                            ),
                            label: 'WETH',
                        },
                    },
                ]}
            />
        </Modal>
    )
}

const SwitchText = styled(Text).attrs((props) => ({
    $textAlign: 'left',
    $color: 'rgba(0,0,0,0.5)',
    $fontSize: '0.8em',
    $textDecoration: 'underline',
    ...props,
}))`
    width: 100%;
    cursor: pointer;
`

const Footer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))``
