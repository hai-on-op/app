import { type Address, useBalance, useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { ConnectButton as RKConnectButton } from '@rainbow-me/rainbowkit'

import { NETWORK_ID, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useAddTokens } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, type FlexProps, HaiButton, Text } from '~/styles'
import { Caret } from './Icons/Caret'
import { PlusCircle } from 'react-feather'

type ConnectButtonProps = FlexProps & {
    showBalance?: boolean
}
export function ConnectButton({ showBalance = false, ...props }: ConnectButtonProps) {
    const { address } = useAccount()

    const {
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const { data: ethBalance } = useBalance({ address })
    const { data: haiBalance } = useBalance({
        address: tokensData?.HAI?.address ? address : undefined,
        token: tokensData?.HAI?.address as Address,
    })
    const { data: kiteBalance } = useBalance({
        address: tokensData?.KITE?.address ? address : undefined,
        token: tokensData?.KITE?.address as Address,
    })

    const { addTokens } = useAddTokens()

    return (
        <RKConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, openChainModal }) => {
                if (!account)
                    return (
                        <Button {...props} onClick={openConnectModal}>
                            Connect
                        </Button>
                    )
                if (chain?.id !== NETWORK_ID)
                    return (
                        <Button {...props} onClick={openChainModal}>
                            Switch Network
                        </Button>
                    )

                return (
                    <Container {...props}>
                        {showBalance && (
                            <>
                                <BalanceContainer as="button" title="Add HAI & KITE to Wallet" onClick={addTokens}>
                                    <PlusCircle size={18} />
                                    <Text>
                                        {formatNumberWithStyle(formatEther(kiteBalance?.value || BigInt(0)), {
                                            maxDecimals: 0,
                                        })}{' '}
                                        KITE
                                    </Text>
                                </BalanceContainer>
                                <BalanceContainer as="button" title="Add HAI & KITE to Wallet" onClick={addTokens}>
                                    <PlusCircle size={18} />
                                    <Text>
                                        {formatNumberWithStyle(formatEther(haiBalance?.value || BigInt(0)), {
                                            maxDecimals: 0,
                                        })}{' '}
                                        HAI
                                    </Text>
                                </BalanceContainer>
                                <BalanceContainer>
                                    <Text>
                                        {formatNumberWithStyle(formatEther(ethBalance?.value || BigInt(0)), {
                                            maxDecimals: 0,
                                        })}{' '}
                                        ETH
                                    </Text>
                                </BalanceContainer>
                            </>
                        )}
                        <Button $width={!showBalance ? 'calc(100% + 4px)' : undefined} onClick={openAccountModal}>
                            <Text>{account.displayName}</Text>
                            <Caret direction="down" />
                        </Button>
                    </Container>
                )
            }}
        </RKConnectButton.Custom>
    )
}

const Container = styled(CenteredFlex)`
    width: ${({ $width = 'fit-content' }) => $width};
    height: 48px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    backdrop-filter: blur(13px);
    font-size: ${({ theme }) => theme.font.small};
`

const BalanceContainer = styled(CenteredFlex).attrs((props) => ({
    $shrink: 0,
    $gap: 8,
    $textAlign: 'center',
    $fontFamily: 'inherit',
    $fontWeight: 700,
    $fontSize: '0.8em',
    $whiteSpace: 'nowrap',
    ...props,
}))`
    height: calc(100% + 4px);
    padding-left: 12px;
    padding-right: 20px;
    margin: -2px;
    margin-right: -12px;
    border-top-left-radius: 999px;
    border-bottom-left-radius: 999px;
    border: ${({ theme }) => theme.border.medium};
    border-right: none;

    &:nth-child(1) {
        background: ${({ theme }) => theme.colors.blueish};
    }
    &:nth-child(2) {
        background: ${({ theme }) => theme.colors.greenish};
    }
    &:nth-child(3) {
        background: ${({ theme }) => theme.colors.pinkish};
    }

    ${({ onClick }) =>
        !!onClick &&
        css`
            cursor: pointer;
        `}
`
const Button = styled(HaiButton).attrs((props) => ({
    $variant: 'yellowish',
    ...props,
}))`
    height: calc(100% + 4px);
    margin: -2px;
    gap: 12px;
`
