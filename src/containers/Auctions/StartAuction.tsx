import { useState } from 'react'
import { useAccount } from 'wagmi'

import { ActionState, Status, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { handleTransactionError, useStartAuction } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Stats } from '~/components/Stats'
import { StatusLabel } from '~/components/StatusLabel'

export function StartAuction() {
    const { address } = useAccount()

    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const {
        startSurplusAcution,
        systemSurplus,
        surplusRequiredToAuction,
        surplusAmountToSell,
        surplusCooldownDone,
        allowStartSurplusAuction,
        surplusDelay,
        startDebtAcution,
        systemDebt,
        debtAmountToSell,
        protocolTokensOffered,
        allowStartDebtAuction,
    } = useStartAuction()

    const [isLoading, setIsLoading] = useState(false)
    // const [error, setError] = useState('')

    const handleStartSurplusAuction = async () => {
        if (!address || isLoading || !allowStartSurplusAuction) return

        setIsLoading(true)
        try {
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                hint: 'Confirm this transaction in your wallet',
                status: ActionState.LOADING,
            })
            await startSurplusAcution()
        } catch (e) {
            handleTransactionError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStartDebtAuction = async () => {
        if (!address || isLoading || !allowStartDebtAuction) return

        setIsLoading(true)
        try {
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                hint: 'Confirm this transaction in your wallet',
                status: ActionState.LOADING,
            })
            await startDebtAcution()
        } catch (e) {
            handleTransactionError(e)
        } finally {
            setIsLoading(false)
        }
    }

    if (!address) return null

    return (
        <>
            <Flex $width="100%" $column $justify="flex-start" $align="flex-start" $gap={16}>
                <Header>
                    <Text $fontSize="1.4rem" $fontWeight={700}>
                        Surplus Auction Details
                    </Text>
                    <HaiButton
                        disabled={!address || isLoading || !allowStartSurplusAuction}
                        $variant="yellowish"
                        onClick={handleStartSurplusAuction}
                    >
                        Start Surplus Auction
                    </HaiButton>
                </Header>
                <Stats
                    stats={[
                        {
                            header: formatNumberWithStyle(systemSurplus) + ' HAI',
                            label: 'System Surplus',
                            tooltip: `Total surplus accrued in the protocol's balance sheet. This is used to cover potential bad debt and for surplus auctions.`,
                        },
                        {
                            header: formatNumberWithStyle(surplusAmountToSell) + ' HAI',
                            label: 'Surplus Amount to Sell',
                            tooltip: `Amount of HAI sold in Surplus Auction. System surplus must exceed ${
                                surplusRequiredToAuction.total
                                    ? formatNumberWithStyle(surplusRequiredToAuction.total)
                                    : '--'
                            } HAI before auction may begin`,
                        },
                        {
                            header: (
                                <StatusLabel status={surplusCooldownDone ? Status.POSITIVE : Status.NEGATIVE}>
                                    {surplusCooldownDone ? 'INACTIVE' : 'ACTIVE'}
                                </StatusLabel>
                            ),
                            label: 'Cooldown Status',
                            tooltip: `Surplus auction may only trigger once every ${
                                surplusDelay
                                    ? formatNumberWithStyle(surplusDelay.toNumber() / 3600, { maxDecimals: 1 })
                                    : '--'
                            } hours.`,
                        },
                    ]}
                    columns="repeat(3, 1fr)"
                />
            </Flex>
            <Flex $width="100%" $column $justify="flex-start" $align="flex-start" $gap={16}>
                <Header>
                    <Text $fontSize="1.4rem" $fontWeight={700}>
                        Debt Auction Details
                    </Text>
                    <HaiButton
                        disabled={!address || isLoading || !allowStartDebtAuction}
                        $variant="yellowish"
                        onClick={handleStartDebtAuction}
                    >
                        Start Debt Auction
                    </HaiButton>
                </Header>
                <Stats
                    stats={[
                        {
                            header: formatNumberWithStyle(systemDebt) + ' HAI',
                            label: 'System Debt',
                            tooltip: 'Amount of uncovered or bad debt in protocol',
                        },
                        {
                            header: formatNumberWithStyle(debtAmountToSell) + ' HAI',
                            label: 'Debt Amount to Sell',
                            tooltip: `Amount of HAI raised per Debt Auction.  If needed, multiple Debt Auctions may run simultaneously.`,
                        },

                        {
                            header: formatNumberWithStyle(protocolTokensOffered) + ' KITE',
                            label: 'Protocol Tokens to be Offered',
                            tooltip: `Maximum number of protocol tokens to be minted and sold during a Debt Auction`,
                        },
                    ]}
                    columns="repeat(3, 1fr)"
                />
            </Flex>
        </>
    )
}

const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 8,
    ...props,
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
    `}
`
