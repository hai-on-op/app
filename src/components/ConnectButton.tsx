import { ConnectButton as RKConnectButton } from '@rainbow-me/rainbowkit'

import { NETWORK_ID } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, type FlexProps, HaiButton, Text } from '~/styles'
import { Caret } from './Icons/Caret'

type ConnectButtonProps = FlexProps & {
    showBalance?: boolean
}
export function ConnectButton({ showBalance = false, ...props }: ConnectButtonProps) {
    return (
        <RKConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, openChainModal }) => {
                if (!account) return (
                    <Button
                        {...props}
                        onClick={openConnectModal}>
                        Connect
                    </Button>
                )
                if (chain?.id !== NETWORK_ID) return (
                    <Button
                        {...props}
                        onClick={openChainModal}>
                        Switch Network
                    </Button>
                )

                const decimalIndex = account.balanceFormatted?.indexOf('.') ?? -1
                return (
                    <Container {...props}>
                        {showBalance && (
                            <BalanceContainer>
                                {decimalIndex > -1
                                    ? account.balanceFormatted?.slice(
                                        0,
                                        decimalIndex + 5
                                    )
                                    : account.balanceFormatted
                                } ETH
                            </BalanceContainer>
                        )}
                        <Button
                            $width={!showBalance ? 'calc(100% + 4px)': undefined}
                            onClick={openAccountModal}>
                            <Text>{account.displayName}</Text>
                            <Caret direction="down"/>
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
`

const BalanceContainer = styled(Text).attrs(props => ({
    $textAlign: 'center',
    $fontWeight: 700,
    $fontSize: '0.8rem',
    ...props,
}))`
    padding: 0 24px;
`
const Button = styled(HaiButton).attrs(props => ({
    $variant: 'yellowish',
    ...props,
}))`
    height: calc(100% + 4px);
    margin: -2px;
    gap: 12px;
`
