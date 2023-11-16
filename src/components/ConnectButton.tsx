import { ConnectButton as RKConnectButton } from '@rainbow-me/rainbowkit'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { Caret } from './Icons/Caret'

type ConnectButtonProps = {
    showBalance?: boolean
}
export function ConnectButton({ showBalance = false }: ConnectButtonProps) {
    return (
        <RKConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, openChainModal }) => {
                if (!account) return (
                    <Button onClick={openConnectModal}>
                        Connect
                    </Button>
                )
                if (chain?.id !== 420) return (
                    <Button onClick={openChainModal}>
                        Switch Network
                    </Button>
                )

                return (
                    <Container>
                        {showBalance && (
                            <BalanceContainer>
                                {account.balanceFormatted} ETH
                            </BalanceContainer>
                        )}
                        <Button onClick={openAccountModal}>
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
    width: fit-content;
    height: 48px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    backdrop-filter: blur(13px);
`

const BalanceContainer = styled(Text).attrs(props => ({
    $textAlign: 'center',
    $fontWeight: 700,
    $fontSize: '0.8rem',
    ...props
}))`
    padding: 0 24px;
`
const Button = styled(HaiButton).attrs(props => ({
    $variant: 'yellowish',
    ...props
}))`
    height: calc(100% + 4px);
    margin: -2px;
    gap: 12px;
`