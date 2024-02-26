import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { handleTransactionError, useCountdown, useStartAuction } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Stats } from '~/components/Stats'
import { ProgressBar } from '~/components/ProgressBar'

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
        lastSurplusTime,
        startDebtAcution,
        systemDebt,
        debtAmountToSell,
        protocolTokensOffered,
        allowStartDebtAuction,
    } = useStartAuction()

    const [isLoading, setIsLoading] = useState(false)
    // const [error, setError] = useState('')
    const [surplusSuccess, setSurplusSuccess] = useState(false)
    const [debtSuccess, setDebtSuccess] = useState(false)

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
            setSurplusSuccess(true)
        } catch (e) {
            handleTransactionError(e)
            setSurplusSuccess(false)
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
            setDebtSuccess(true)
        } catch (e) {
            handleTransactionError(e)
            setDebtSuccess(false)
        } finally {
            setIsLoading(false)
        }
    }

    const [countdownEl, setCountdownEl] = useState<HTMLElement | null>(null)

    const countdown = useMemo(() => {
        if (!lastSurplusTime || !surplusDelay) return 0
        return lastSurplusTime.add(surplusDelay).toNumber()
    }, [surplusDelay, lastSurplusTime])

    const [progress, setProgress] = useState(0)

    useCountdown(countdown, countdownEl, {
        onStart: surplusDelay ? (sec: number) => setProgress(1 - sec / surplusDelay.toNumber()) : undefined,
        onMinute: surplusDelay ? (min: number) => setProgress(1 - (60 * min) / surplusDelay.toNumber()) : undefined,
        onEnd: () => setProgress(1),
    })

    if (!address) return null

    return (
        <>
            <Flex $width="100%" $column $justify="flex-start" $align="flex-start" $gap={16}>
                <Header>
                    <Text $fontSize="1.4rem" $fontWeight={700}>
                        Surplus Auction Details
                    </Text>
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
                                <Flex $width="100%" $justify="flex-start" $align="center" $gap={8} $grow={1}>
                                    <ProgressBar
                                        progress={progress}
                                        overlayLabel={
                                            <Text
                                                ref={setCountdownEl}
                                                $fontSize="0.6rem"
                                                hidden={!countdown || progress === 1 || surplusCooldownDone}
                                            />
                                        }
                                    />
                                </Flex>
                            ),
                            label: 'Cooldown Status',
                            tooltip: `Surplus auction may only trigger once every ${
                                surplusDelay
                                    ? formatNumberWithStyle(surplusDelay.toNumber() / 3600, { maxDecimals: 1 })
                                    : '--'
                            } hours.`,
                            button: (
                                <HaiButton
                                    disabled={!address || isLoading || !allowStartSurplusAuction || surplusSuccess}
                                    $variant="yellowish"
                                    onClick={handleStartSurplusAuction}
                                >
                                    Start Surplus Auction
                                </HaiButton>
                            ),
                        },
                    ]}
                    columns="1fr 1fr 1.5fr"
                />
            </Flex>
            <Flex $width="100%" $column $justify="flex-start" $align="flex-start" $gap={16}>
                <Header>
                    <Text $fontSize="1.4rem" $fontWeight={700}>
                        Debt Auction Details
                    </Text>
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
                            button: (
                                <HaiButton
                                    disabled={!address || isLoading || !allowStartDebtAuction || debtSuccess}
                                    $variant="yellowish"
                                    onClick={handleStartDebtAuction}
                                >
                                    Start Debt Auction
                                </HaiButton>
                            ),
                        },
                    ]}
                    columns="1fr 1fr 1.5fr"
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
