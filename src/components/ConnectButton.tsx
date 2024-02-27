import { ConnectButton as RKConnectButton } from '@rainbow-me/rainbowkit'

import { NETWORK_ID, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useAddTokens, useBalances } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, type FlexProps, HaiButton, Text, Grid } from '~/styles'
import { Caret } from './Icons/Caret'
import { PlusCircle } from 'react-feather'

type ConnectButtonProps = FlexProps & {
    showBalance?: 'horizontal' | 'vertical'
}
export function ConnectButton({ showBalance, ...props }: ConnectButtonProps) {
    const {
        connectWalletModel: { ethBalance },
    } = useStoreState((state) => state)

    const [haiBalance, kiteBalance] = useBalances(['HAI', 'KITE'])

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
                    <Container {...props} $vertical={showBalance === 'vertical'}>
                        {showBalance && (
                            <Grid $columns="repeat(3, min-content)">
                                <BalanceContainer as="button" title="Add HAI & KITE to Wallet" onClick={addTokens}>
                                    <PlusCircle size={18} />
                                    <Text>
                                        {formatNumberWithStyle(kiteBalance.raw, {
                                            maxDecimals: 0,
                                        })}{' '}
                                        KITE
                                    </Text>
                                </BalanceContainer>
                                <BalanceContainer as="button" title="Add HAI & KITE to Wallet" onClick={addTokens}>
                                    <PlusCircle size={18} />
                                    <Text>
                                        {formatNumberWithStyle(haiBalance.raw, {
                                            maxDecimals: 0,
                                        })}{' '}
                                        HAI
                                    </Text>
                                </BalanceContainer>
                                <BalanceContainer>
                                    <Text>
                                        {formatNumberWithStyle(ethBalance[chain.id], {
                                            maxDecimals: 1,
                                            maxSigFigs: 2,
                                        })}{' '}
                                        ETH
                                    </Text>
                                </BalanceContainer>
                            </Grid>
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

const Button = styled(HaiButton).attrs((props) => ({
    $variant: 'yellowish',
    ...props,
}))`
    height: 100%;
    gap: 12px;
`

const BalanceContainer = styled(CenteredFlex).attrs((props) => ({
    $shrink: 0,
    $gap: 6,
    $textAlign: 'center',
    $fontFamily: 'inherit',
    $fontWeight: 700,
    $fontSize: '0.8em',
    $whiteSpace: 'nowrap',
    ...props,
}))`
    height: 100%;
    padding-left: 12px;
    padding-right: 26px;
    margin-right: -20px;
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

const Container = styled(CenteredFlex)<{ $vertical?: boolean }>`
    width: ${({ $width = 'fit-content' }) => $width};
    height: 48px;
    border-radius: 999px;
    backdrop-filter: blur(13px);
    font-size: ${({ theme }) => theme.font.small};

    & > *:first-child {
        height: 100%;
    }

    ${({ $vertical }) =>
        $vertical &&
        css`
            flex-direction: column-reverse;
            height: auto;
            border: none;
            border-radius: 24px;
            & > * {
                width: 100%;
                height: 36px;
                flex-shrink: 0;
                flex-grow: 1;
            }
            & ${Button} {
                margin-bottom: -2px;
                border-top-left-radius: 24px;
                border-bottom-left-radius: 0px;
                border-top-right-radius: 24px;
                border-bottom-right-radius: 0px;
                z-index: 2;
            }
            & ${BalanceContainer} {
                padding: 6px 12px;
                margin-right: -2px;
                border: ${({ theme }) => theme.border.medium};
                border-top-left-radius: 0px;
                border-bottom-left-radius: 0px;
                &:first-child {
                    border-bottom-left-radius: 24px;
                }
                &:last-child {
                    border-top-right-radius: 0px;
                    border-bottom-right-radius: 24px;
                    margin-right: 0px;
                }
            }
        `}
`
