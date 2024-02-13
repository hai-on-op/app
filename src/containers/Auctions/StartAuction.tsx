import { useState } from 'react'
import { useAccount } from 'wagmi'

import { ActionState, Status, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { handleTransactionError, useStartAuction } from '~/hooks'

import { Flex, HaiButton, Text } from '~/styles'
import { Stats } from '~/components/Stats'
import { StatusLabel } from '~/components/StatusLabel'

export function StartAuction() {
    const { address } = useAccount()

    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const {
        startSurplusAcution,
        systemSurplus,
        surplusAmountToSell,
        surplusCooldownDone,
        allowStartSurplusAuction,
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
                <Flex $width="100%" $justify="space-between" $align="center">
                    {/* <BrandedTitle
                    textContent="SUPRLUS AUCTION"
                    $fontSize="2.4rem"
                /> */}
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
                </Flex>
                <Stats
                    stats={[
                        {
                            header: formatNumberWithStyle(systemSurplus) + ' HAI',
                            label: 'System Surplus',
                            tooltip: 'Hello World',
                        },
                        {
                            header: formatNumberWithStyle(surplusAmountToSell) + ' HAI',
                            label: 'Surplus Amount to Sell',
                            tooltip: 'Hello World',
                        },
                        {
                            header: (
                                <StatusLabel status={surplusCooldownDone ? Status.POSITIVE : Status.NEGATIVE}>
                                    {surplusCooldownDone ? 'INACTIVE' : 'ACTIVE'}
                                </StatusLabel>
                            ),
                            label: 'Cooldown Status',
                            tooltip: 'Hello World',
                        },
                        // {
                        //     header: formatNumberWithStyle(deltaToStartSurplusAuction) + ' HAI',
                        //     label: 'Fee to Start Surplus Auction',
                        //     tooltip: 'Hello World',
                        // },
                    ]}
                    columns="repeat(3, 1fr)"
                />
            </Flex>
            <Flex $width="100%" $column $justify="flex-start" $align="flex-start" $gap={16}>
                <Flex $width="100%" $justify="space-between" $align="center">
                    {/* <BrandedTitle
                    textContent="DEBT AUCTION"
                    $fontSize="2.4rem"
                /> */}
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
                </Flex>
                <Stats
                    stats={[
                        {
                            header: formatNumberWithStyle(systemDebt) + ' HAI',
                            label: 'System Debt',
                            tooltip: 'Hello World',
                        },
                        {
                            header: formatNumberWithStyle(debtAmountToSell) + ' HAI',
                            label: 'Debt Amount to Sell',
                            tooltip: 'Hello World',
                        },

                        {
                            header: formatNumberWithStyle(protocolTokensOffered) + ' KITE',
                            label: 'Protocol Tokens to be Offered',
                            tooltip: 'Hello World',
                        },
                        // {
                        //     header: formatNumberWithStyle(deltaToStartDebtAuction) + ' HAI',
                        //     label: 'Fee to Start Debt Auction',
                        //     tooltip: 'Hello World',
                        // },
                    ]}
                    columns="repeat(3, 1fr)"
                />
            </Flex>
        </>
    )
}
