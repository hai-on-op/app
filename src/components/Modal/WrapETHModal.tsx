import { useMemo, useState } from 'react'
import { useAccount, useNetwork } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner, useGeb } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { NumberInput } from '../NumberInput'

export function WrapETHModal(props: ModalProps) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const { ethBalance } = useStoreState(({ connectWalletModel }) => connectWalletModel)
    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        vaultModel: vaultActions,
    } = useStoreActions(actions => actions)

    const [wrapValue, setWrapValue] = useState('')

    const refreshBalance = () => {
        if (!account) return
        connectWalletActions.fetchTokenData({ geb, user: account })
    }

    const [balance = '0', balanceMinusCushion = '0'] = useMemo(() => {
        if (!chain?.id || !ethBalance) return []

        const bal = parseFloat(ethBalance[chain.id].toString())
        return [bal.toString(), Math.max(bal - 0.01, 0).toString()]
    }, [chain?.id, ethBalance])

    const isNonZero = parseFloat(wrapValue || '0') > 0

    const insufficientFunds = parseFloat(wrapValue || '0') > parseFloat(balance)

    const onWrap = async () => {
        if (!signer || !isNonZero || insufficientFunds) return
        try {
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                text: 'Wrapping ETH',
                hint: 'Confirm this transaction in your wallet',
                status: ActionState.LOADING,
            })

            await vaultActions.wrapEther({
                signer,
                title: 'Wrapping ETH',
                amount: wrapValue,
            })
        } catch(error: any) {
            handleTransactionError(error)
        } finally {
            refreshBalance()
        }
    }

    return (
        <Modal
            {...props}
            heading="WRAP ETH"
            footerContent={(
                <Footer>
                    <Text
                        $fontSize="0.8em"
                        $whiteSpace="nowrap">
                        <Text
                            as="span"
                            $fontWeight={700}>
                            ETH Balance:
                        </Text>
                        &nbsp;{formatNumberWithStyle(balance, { maxDecimals: 4 })} ETH
                    </Text>
                    <HaiButton
                        $variant="yellowish"
                        disabled={!signer || !isNonZero || insufficientFunds}
                        onClick={onWrap}>
                        Wrap
                    </HaiButton>
                </Footer>
            )}>
            <NumberInput
                label="ETH to wrap"
                value={wrapValue}
                placeholder="0.00"
                unitLabel="ETH"
                onChange={(value: string) => setWrapValue(value)}
                subLabel={`Max ${formatNumberWithStyle(balanceMinusCushion, { maxDecimals: 4 })} ETH`}
                onMax={() => setWrapValue(balanceMinusCushion)}
            />
        </Modal>
    )
}

const Footer = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))``
