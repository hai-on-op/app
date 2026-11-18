import { useEffect, useMemo, useState } from 'react'
import { useAccount, useBalance, useNetwork } from 'wagmi'
import { getAddressList } from '@hai-on-op/sdk'
import type { Address } from 'viem'
import { constants, utils } from 'ethers'

import { ActionState, formatNumberWithStyle, getNetworkName, parseTokenAmount } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { NumberInput } from '../NumberInput'
import { TransactionSummary } from '../TransactionSummary'

enum Action {
    WRAP,
    UNWRAP,
}

const gasCushion = utils.parseEther('0.01')

export function WrapETHModal(props: ModalProps) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()

    const [action, setAction] = useState(Action.WRAP)

    const { ethBalance } = useStoreState(({ connectWalletModel }) => connectWalletModel)
    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        vaultModel: vaultActions,
    } = useStoreActions((actions) => actions)

    // The wrap transaction uses this deployment's WETH contract with the wallet's signer.
    const wethAddress = chain?.id ? getAddressList(getNetworkName(chain.id)).ETH : undefined
    const { data: wrapped, refetch: refreshWrappedBalance } = useBalance({
        address: account,
        chainId: chain?.id,
        token: wethAddress as Address | undefined,
        enabled: !!account && !!chain?.id && !!wethAddress,
    })
    const wethBalance = useMemo(
        () =>
            wrapped && {
                raw: wrapped.formatted,
                formatted: formatNumberWithStyle(wrapped.formatted, { maxDecimals: 4, minSigFigs: 1 }),
            },
        [wrapped]
    )

    const [amount, setAmount] = useState('')

    useEffect(() => () => setAmount(''), [action])

    const refreshBalance = () => {
        if (!account) return
        connectWalletActions.setForceUpdateTokens(true)
        void refreshWrappedBalance()
    }

    const nativeWei = parseTokenAmount(String((chain && ethBalance[chain.id]) ?? '0')) ?? constants.Zero
    const wrappedWei = parseTokenAmount(wethBalance?.raw || '0') ?? constants.Zero
    const nativeRaw = utils.formatEther(nativeWei)
    const maxWrap = utils.formatEther(nativeWei.gt(gasCushion) ? nativeWei.sub(gasCushion) : constants.Zero)
    const balance = { raw: nativeRaw, formatted: formatNumberWithStyle(nativeRaw, { maxDecimals: 4 }) }
    const balanceMinusCushion = { raw: maxWrap, formatted: formatNumberWithStyle(maxWrap, { maxDecimals: 4 }) }

    const details =
        action === Action.UNWRAP
            ? { action: 'Unwrap', symbol: 'WETH', balanceMinusCushion: wethBalance }
            : { action: 'Wrap', symbol: 'ETH', balanceMinusCushion }
    const amountWei = parseTokenAmount(amount)
    const isNonZero = !!amountWei?.gt(0)
    const insufficientFunds = amountWei?.gt(action === Action.WRAP ? nativeWei : wrappedWei)
    const wrappedChange = action === Action.WRAP ? amountWei ?? constants.Zero : (amountWei ?? constants.Zero).mul(-1)

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
                            after: formatNumberWithStyle(utils.formatEther(nativeWei.sub(wrappedChange)), {
                                maxDecimals: 4,
                            }),
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
                            after: formatNumberWithStyle(utils.formatEther(wrappedWei.add(wrappedChange)), {
                                maxDecimals: 4,
                            }),
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
