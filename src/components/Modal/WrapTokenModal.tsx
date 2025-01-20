import { useEffect, useMemo, useState } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { handleTransactionError, useBalance, useEthersSigner, useGeb, useTokenApproval, ApprovalState } from '~/hooks'
import { useAddTokens } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text, CenteredFlex } from '~/styles'
import { Modal, type ModalProps } from './index'
import { WrapNumberInput } from '../WrapNumberInput'

// import { Link } from '../Link'

enum Action {
    WRAP,
    UNWRAP,
}

// Add interface for the component props
interface FlashMessageContainerProps {
    $variant?: string
    $pad?: boolean
    $gap?: number
    $grow?: number
}

interface FlashMessageTextProps {
    $variant?: string
}

export function WrapTokenModal(props: ModalProps) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const { addTokens } = useAddTokens({ isHaiVelo: true })

    const [action] = useState(Action.WRAP)

    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        vaultModel: vaultActions,
    } = useStoreActions((actions) => actions)

    const veloBalance = useBalance('VELO')

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
            action: 'MINT',
            symbol: 'haiVELO',
            balance,
            balanceMinusCushion,
        }
    }, [balance, balanceMinusCushion])

    const isNonZero = parseFloat(amount || '0') > 0

    const insufficientFunds = parseFloat(amount || '0') > parseFloat(details.balance?.raw || '0')

    const onWrap = async () => {
        if (!signer || !isNonZero || insufficientFunds) return

        const title = `Minting ${details.symbol}`
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
            heading={`${details.action} ${details.symbol}`}
            footerContent={
                <Footer>
                    <HaiButton
                        $variant="yellowish"
                        disabled={!signer || !isNonZero || insufficientFunds}
                        onClick={onWrap}
                    >
                        {approvalState === ApprovalState.NOT_APPROVED ? 'Approve' : 'Mint haiVELO'}
                    </HaiButton>
                    <HaiButton $variant="greenish" onClick={addTokens}>
                        Add haiVELO
                    </HaiButton>
                </Footer>
            }
        >
            Convert your VELO into haiVELO to use as collateral while earning veVELO rewards.
            <WrapNumberInput
                label={'VELO to convert'}
                value={amount}
                placeholder="0.00"
                unitLabel={'VELO'}
                onChange={(value: string) => setAmount(value)}
                subLabel={`Max ${details.balanceMinusCushion?.formatted || '0'} VELO`}
                onMax={() => setAmount(details.balanceMinusCushion?.raw || '0')}
                whiteBackground={true}
            />
            <WrapNumberInput
                label={'haiVELO recieved'}
                value={amount}
                disabled={true}
                placeholder="0.00"
                unitLabel={details.symbol}
                onChange={(value: string) => setAmount(value)}
                subLabel=""
                onMax={() => setAmount(details.balanceMinusCushion?.raw || '0')}
                opacity={0.5}
            />
            <FlashMessageContainer $variant="warningBackground" $pad={true} $gap={8} $grow={0}>
                <FlashMessageText $fontWeight={700} $variant="warningColor">
                    ⚠️ VELO is permanently max locked into veVELO with haiVELO issued at a 1:1 ratio.
                </FlashMessageText>
            </FlashMessageContainer>
            {/* <FlashMessageContainer
                $variant="successBackground"
                $pad={true}
                $gap={8}
                $grow={0}
                style={{ marginTop: -10 }}
            >
                <FlashMessageText $fontWeight={700} $variant="successColor">
                    Get an estimated 20% more haiVELO by swapping on Velodrome&nbsp;
                    <Link
                        style={{ display: 'inline' }}
                        href={'https://velodrome.finance/'}
                        $fontWeight={700}
                        $width="100%"
                        $textDecoration="underline"
                    >
                        here.
                    </Link>
                </FlashMessageText>
            </FlashMessageContainer> */}
        </Modal>
    )
}

const FlashMessageText = styled(Text).attrs((props: FlashMessageTextProps) => ({
    $textAlign: 'left',
    $color: 'rgba(0,0,0,1)',
    $fontSize: '0.8em',
    ...props,
}))`
    width: 100%;
    color: ${({ theme, $variant = 'default' }) => (theme.colors as any)[$variant]};
`

export const FlashMessageContainer = styled(CenteredFlex)<FlashMessageContainerProps>`
    height: 36px;
    background-color: ${({ theme, $variant = 'default' }) => (theme.colors as any)[$variant]};
    border: 1px solid ${({ theme }) => theme.colors.dimmedBackground};
    text-align: left;
    padding: 6px 10px;
    width: 100%;
    border-radius: 8px;
    color: ${({ theme, $variant = 'default' }) => (theme.colors as any)[$variant]};
`
const Footer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $gap: 10,
    $justify: 'start',
    $align: 'center',
    ...props,
}))``
