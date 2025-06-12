import { useEffect, useMemo, useState } from 'react'
// import dayjs from 'dayjs'
import type { IAuction } from '~/types'
import { ActionState, formatNumberWithStyle, tokenMap, wait, isFormattedAddress } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useClaims } from '~/providers/ClaimsProvider'
import { useAccount } from 'wagmi'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { handleTransactionError, useEthersSigner, useGeb } from '~/hooks'
import { utils } from 'ethers'
import { useDistributorContract } from '~/hooks/useContract'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { TokenArray } from '../TokenArray'
import { ContentWithStatus } from '../ContentWithStatus'

// const returnDaysLeftToClaim = (date: number) => {
//     const deploymentTime = dayjs(date * 1000)
//     const dayDiff = dayjs().diff(deploymentTime, 'day')
//     if (dayDiff > 90) {
//         return 0
//     }
//     return 90 - dayjs().diff(deploymentTime, 'day')
// }

function formatTime(seconds: number) {
    // Handle zero or negative values
    if (seconds <= 0) {
        return 'now'
    }

    // Convert seconds to hours
    const hours = Math.floor(seconds / 3600)

    // If it's more than or equal to 1 hour, return just the hours
    if (hours >= 1) {
        return `${hours} hour${hours > 1 ? 's' : ''}`
    }

    // If less than an hour, convert to minutes
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

// const returnAmount = (value: BigNumberish) => utils.formatEther(value)

export function RemainingTime({ endTimestamp }: { endTimestamp?: number }) {
    const [formattedTimeRemaining, setFormattedTimeRemaining] = useState<string>('')

    useEffect(() => {
        if (endTimestamp) {
            const updateTime = () => {
                const currentTime = Math.floor(Date.now() / 1000)
                const remainingSeconds = endTimestamp - currentTime

                setFormattedTimeRemaining(formatTime(remainingSeconds))
            }

            updateTime()
            const intervalId = setInterval(updateTime, 1000)
            return () => clearInterval(intervalId)
        }
    }, [endTimestamp])

    if (!endTimestamp) return null
    return <span>{formattedTimeRemaining}</span>
}

// Token types we want to support for incentives
const INCENTIVE_TOKENS = ['KITE', 'OP', 'DINERO', 'HAI'] as const
type IncentiveToken = (typeof INCENTIVE_TOKENS)[number]

// Define proper types for incentive claims
interface IncentiveClaim {
    isPaused?: boolean
    isClaimed?: boolean
    hasClaimableDistros?: boolean
    amount?: any
    description?: string
    claimIt?: () => Promise<any>
    [key: string]: any
}

const ScrollableBody = styled(Flex).attrs((props) => ({
    $width: 'calc(100% + 72px)',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))`
    max-height: max(calc(100vh - 400px), 100px);
    padding: 12px 36px;
    overflow: hidden auto;
    border-top: 1px solid rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        width: calc(100% + 32px);
        padding: 12px 16px;
    `}
`

const ClaimableAssetContainer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    padding: 8px 16px;
    border-radius: 20px;
    border: 2px solid rgba(0, 0, 0, 0.1);
`

type ClaimableAssetProps = {
    asset: string
    amount: string
    price?: number
    claim?: IncentiveClaim
    distributor?: any
    onSuccess?: () => void
    incentive: boolean
} & (
    | {
          asset: string
          auction: IAuction
          internal?: undefined
      }
    | {
          asset: 'COIN' | 'PROTOCOL_TOKEN'
          auction?: undefined
          internal: boolean
      }
)

const ClaimableIncentive = ({
    asset,
    claim,
    price,
    onSuccess,
}: {
    asset: string
    claim: IncentiveClaim
    price: number
    onSuccess?: () => void
}) => {
    console.log(`ClaimableIncentive for ${asset}:`, claim)
    if (!claim || claim.isClaimed) return null

    // Make sure we have the correct amount/value for display
    let amount = '0'
    if (claim.amount) {
        amount = typeof claim.amount === 'object' ? utils.formatEther(claim.amount) : claim.amount.toString()
    }

    const distributor = useDistributorContract(claim.distributorAddress)
    return (
        <ClaimableAsset
            key={`distributor-${claim.distributorAddress}`}
            asset={asset}
            claim={claim}
            amount={amount}
            price={price || 0}
            distributor={distributor}
            incentive={true}
            auction={{} as IAuction} // Dummy auction object to satisfy the union type
            onSuccess={onSuccess}
        />
    )
}

function ClaimableAsset({
    asset,
    amount,
    price = 0,
    auction,
    internal,
    incentive,
    claim,
    onSuccess,
}: ClaimableAssetProps) {
    const signer = useEthersSigner()
    const { address: account } = useAccount()

    const {
        auctionModel: auctionActions,
        popupsModel: popupsActions,
        transactionsModel: transactionsActions,
    } = useStoreActions((actions) => actions)

    const [status, setStatus] = useState(ActionState.NONE)

    // Get pause state from the claim data
    const isDistributorPaused = (claim as IncentiveClaim)?.isPaused

    const onClaim = async () => {
        if (incentive) {
            console.log('claim', claim)

            const formatted = isFormattedAddress(account)
            if (!formatted) {
                console.debug('wrong address')
                return false
            }
            const incentiveClaim = claim as IncentiveClaim
            try {
                const txResponse = await incentiveClaim.claimIt?.()
                if (txResponse) {
                    transactionsActions.addTransaction({
                        chainId: txResponse?.chainId,
                        hash: txResponse?.hash,
                        from: txResponse.from,
                        summary: `Claiming ${asset}`,
                        addedTime: new Date().getTime(),
                        originalTx: txResponse,
                    })
                    popupsActions.setIsWaitingModalOpen(true)
                    popupsActions.setWaitingPayload({
                        title: 'Transaction Submitted',
                        hash: txResponse?.hash,
                        status: ActionState.SUCCESS,
                    })
                    onSuccess?.()
                    popupsActions.setIsWaitingModalOpen(false)
                    popupsActions.setWaitingPayload({ status: ActionState.NONE })
                } else {
                    throw new Error('No transaction request!')
                }
            } catch (e) {
                console.error(e)
            }
        } else {
            if (status === ActionState.LOADING || !signer) return

            setStatus(ActionState.LOADING)
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                status: ActionState.LOADING,
                title: 'Claiming Assets',
            })
            try {
                if (internal) {
                    await auctionActions.auctionClaimInternalBalance({
                        signer,
                        auctionId: '1',
                        auctionType: 'COLLATERAL',
                        bid: amount,
                        token: asset,
                        title: `Claim ${tokenMap[asset]}`,
                    })
                } else if (auction) {
                    await auctionActions.auctionClaim({
                        signer,
                        auctionId: auction.auctionId,
                        title: 'Claim Assets',
                        auctionType: auction.englishAuctionType,
                        bid: amount,
                    })
                }
                setStatus(ActionState.SUCCESS)
                popupsActions.setWaitingPayload({
                    status: ActionState.SUCCESS,
                    title: 'Claiming Assets',
                })
                onSuccess?.()
                await wait(3000)
                popupsActions.setIsWaitingModalOpen(false)
                popupsActions.setWaitingPayload({ status: ActionState.NONE })
            } catch (e: any) {
                handleTransactionError(e)
                setStatus(ActionState.ERROR)
                popupsActions.setWaitingPayload({
                    status: ActionState.ERROR,
                    title: 'Claiming Assets',
                    hint: 'An error occurred',
                })
            }
        }
    }

    return (
        <ClaimableAssetContainer style={status === ActionState.SUCCESS ? { opacity: 0.5 } : undefined}>
            <CenteredFlex $gap={12}>
                <TokenArray size={48} tokens={[(tokenMap[asset] || asset) as any]} hideLabel />
                <Flex $width="100%" $column $justify="center" $align="flex-start" $gap={4}>
                    {incentive ? (
                        <>
                            <Text $fontSize="1em" $fontWeight={700}>
                                {(claim as IncentiveClaim)?.description || asset}
                            </Text>
                        </>
                    ) : (
                        <Text $fontSize="0.7em">
                            {auction && auction.auctionId
                                ? `Auction: #${auction.auctionId} (${auction.englishAuctionType})`
                                : `Unsuccessful Bid(s)`}
                        </Text>
                    )}

                    <Text $fontSize="1em" $fontWeight={700}>
                        {formatNumberWithStyle(amount, { maxDecimals: 4 })} {tokenMap[asset] || asset}
                    </Text>
                    <Text $fontSize="0.7em">
                        {formatNumberWithStyle(parseFloat(amount) * price, {
                            style: 'currency',
                            minDecimals: 2,
                            maxDecimals: 2,
                        })}
                    </Text>
                </Flex>
            </CenteredFlex>
            <CenteredFlex $column $gap={12}>
                <HaiButton
                    $variant="yellowish"
                    disabled={
                        !signer ||
                        status === ActionState.LOADING ||
                        status === ActionState.SUCCESS ||
                        isDistributorPaused
                    }
                    onClick={onClaim}
                >
                    {status === ActionState.SUCCESS ? 'Claimed' : isDistributorPaused ? 'Paused' : 'Claim'}
                </HaiButton>
            </CenteredFlex>
        </ClaimableAssetContainer>
    )
}

export function ClaimModal(props: ModalProps) {
    const { address: account } = useAccount()

    const { popupsModel: popupsActions, transactionsModel: transactionsActions } = useStoreActions((actions) => actions)

    const {
        vaultModel: { liquidationData },
        popupsModel: { isClaimPopupOpen },
    } = useStoreState((state) => state)
    const {
        auctionModel: auctionActions,
        popupsModel: { setIsClaimPopupOpen },
    } = useStoreActions((actions) => actions)

    const { prices: veloPrices } = useVelodromePrices()

    const kitePrice = veloPrices?.KITE.raw

    console.log('KITE price:', liquidationData)

    const dineroPrice = veloPrices?.DINERO.raw
    const opPrice = liquidationData?.collateralLiquidationData?.OP?.currentPrice.value
    const haiPrice = liquidationData?.currentRedemptionPrice

    const geb = useGeb()

    const { activeAuctions, internalBalances, incentivesData, refetchIncentives } = useClaims()

    const { prices, total } = useMemo(() => {
        if (!liquidationData)
            return {
                prices: {},
                total: 0,
            }
        const { collateralLiquidationData, currentRedemptionPrice } = liquidationData
        return activeAuctions.claimableAuctions.reduce(
            (acc, { sellAmount, auction }) => {
                if (!auction) return acc
                const token = tokenMap[auction.sellToken] || auction.sellToken
                const price =
                    token === 'HAI'
                        ? parseFloat(currentRedemptionPrice || '1')
                        : token === 'KITE'
                        ? Number(kitePrice || 0)
                        : parseFloat(collateralLiquidationData?.[token]?.currentPrice.value || '0')
                acc.prices[token] = price || 0 // Ensure price is never undefined
                acc.total += parseFloat(sellAmount) * (price || 0) // Safely handle undefined price
                return acc
            },
            { prices: {} as Record<string, number>, total: 0 }
        )
    }, [liquidationData, activeAuctions.claimableAuctions, kitePrice])

    if (!isClaimPopupOpen) return null

    // Helper function to get token price
    const getTokenPrice = (token: IncentiveToken): number => {
        switch (token) {
            case 'KITE':
                return Number(kitePrice || 0)
            case 'OP':
                return Number(opPrice || 0)
            case 'DINERO':
                return Number(dineroPrice || 0)
            case 'HAI':
                return Number(haiPrice || 0)
            default:
                return 0
        }
    }

    // Process all incentive tokens
    const incentiveTokens = INCENTIVE_TOKENS.reduce(
        (acc, token) => {
            const data = incentivesData?.claimData?.[token]
            const price = getTokenPrice(token)

            console.log(`Processing ${token}:`, data, 'price:', price)
            acc[token] = { data, price }
            return acc
        },
        {} as Record<IncentiveToken, { data: any; price: number }>
    )

    // Check if distributor is paused from any available incentive data
    const isDistributorPaused = incentivesData?.timerData?.isPaused

    console.log('incentiveTokens', incentiveTokens)

    // Generate content for each token
    const incentivesContent = INCENTIVE_TOKENS.flatMap((token) => {
        const { data, price } = incentiveTokens[token]
        if (!data?.hasClaimableDistros) return []

        console.log(`${token} has claimable distros:`, data.hasClaimableDistros)
        return [
            <ClaimableIncentive
                key={`${token}-Daily-rewards`}
                asset={token}
                claim={{ ...data }}
                price={price}
                onSuccess={refetchIncentives}
            />,
        ]
    })

    console.log('incentiveTokens', incentiveTokens)

    // Direct calculation for each token's incentive value
    // This is more reliable than the generic function
    const kiteValue =
        incentiveTokens.KITE?.data?.hasClaimableDistros && incentiveTokens.KITE?.data?.amount
            ? parseFloat(utils.formatEther(incentiveTokens.KITE.data.amount)) * (incentiveTokens.KITE.price || 0)
            : 0

    const opValue =
        incentiveTokens.OP?.data?.hasClaimableDistros && incentiveTokens.OP?.data?.amount
            ? parseFloat(utils.formatEther(incentiveTokens.OP.data.amount)) * (incentiveTokens.OP.price || 0)
            : 0

    const dineroValue =
        incentiveTokens.DINERO?.data?.hasClaimableDistros && incentiveTokens.DINERO?.data?.amount
            ? parseFloat(utils.formatEther(incentiveTokens.DINERO.data.amount)) * (incentiveTokens.DINERO.price || 0)
            : 0

    const haiValue =
        incentiveTokens.HAI?.data?.hasClaimableDistros && incentiveTokens.HAI?.data?.amount
            ? parseFloat(utils.formatEther(incentiveTokens.HAI.data.amount)) * (incentiveTokens.HAI.price || 0)
            : 0

    // Log direct values for debugging
    console.log('Direct values - KITE:', kiteValue, 'OP:', opValue, 'DINERO:', dineroValue, 'HAI:', haiValue)

    // Calculate total incentive value using direct values
    const totalIncentiveValue = kiteValue + opValue + dineroValue + haiValue
    console.log('Total incentive value:', totalIncentiveValue, kiteValue, opValue, dineroValue, haiValue)

    const totalClaimableValue = total + totalIncentiveValue
    console.log('Total claimable value (auction + incentives):', totalClaimableValue, 'auction total:', total)

    // Get content for auctions and internal balances
    const content = [
        ...incentivesContent,
        ...activeAuctions.claimableAuctions.map(({ sellAmount, auction }) => {
            if (!auction) return null
            const asset = tokenMap[auction.sellToken] || auction.sellToken
            return (
                <ClaimableAsset
                    key={auction.auctionId}
                    asset={asset}
                    amount={sellAmount}
                    price={prices[asset]}
                    auction={auction}
                    incentive={false}
                    onSuccess={() => {
                        auctionActions.fetchAuctions({
                            geb,
                            type: 'DEBT',
                        })
                        auctionActions.fetchAuctions({
                            geb,
                            type: 'SURPLUS',
                        })
                        activeAuctions.refetch()
                    }}
                />
            )
        }),
        ...(parseFloat(internalBalances.HAI?.raw || '0') > 0
            ? [
                  <ClaimableAsset
                      key="internalHai"
                      asset="COIN"
                      amount={internalBalances.HAI?.raw || '0'}
                      price={parseFloat(liquidationData?.currentRedemptionPrice || '1')}
                      internal={true}
                      incentive={false}
                      onSuccess={internalBalances.refetch}
                  />,
              ]
            : []),
        ...(parseFloat(internalBalances.KITE?.raw || '0') > 0
            ? [
                  <ClaimableAsset
                      key="internalKITE"
                      asset="PROTOCOL_TOKEN"
                      amount={internalBalances.KITE?.raw || '0'}
                      price={10}
                      internal={true}
                      incentive={false}
                      onSuccess={internalBalances.refetch}
                  />,
              ]
            : []),
    ]

    // Find a token that has claimAll function
    const tokenWithClaimAll = INCENTIVE_TOKENS.find(
        (token) => incentiveTokens[token]?.data?.claimAll && incentiveTokens[token]?.data?.hasClaimableDistros
    )

    // Get timer data from incentives data
    const timerData = incentivesData?.timerData

    const onClaimAll = async () => {
        const formatted = isFormattedAddress(account)
        if (!formatted || !tokenWithClaimAll) {
            console.debug('wrong address or no token with claimAll')
            return false
        }
        try {
            const txResponse = await incentiveTokens[tokenWithClaimAll].data.claimAll()
            if (txResponse) {
                transactionsActions.addTransaction({
                    chainId: txResponse?.chainId,
                    hash: txResponse?.hash,
                    from: txResponse.from,
                    summary: `Claiming all rewards`,
                    addedTime: new Date().getTime(),
                    originalTx: txResponse,
                })
                popupsActions.setIsWaitingModalOpen(true)
                popupsActions.setWaitingPayload({
                    title: 'Transaction Submitted',
                    hash: txResponse?.hash,
                    status: ActionState.SUCCESS,
                })
                await refetchIncentives()
                popupsActions.setIsWaitingModalOpen(false)
                popupsActions.setWaitingPayload({ status: ActionState.NONE })
            } else {
                throw new Error('No transaction request!')
            }
        } catch (e) {
            console.error(e)
        }
    }

    const isClaimAllDisabled = !tokenWithClaimAll

    return (
        <Modal
            heading="CLAIM"
            maxWidth="560px"
            {...props}
            onClose={() => setIsClaimPopupOpen(false)}
            footerContent={
                <Flex $width="100%" $column $gap={12}>
                    <Flex $width="100%" $justify="space-between" $align="center">
                        <Text>
                            <strong>Total Estimated Value:</strong>
                            &nbsp;
                            {content.filter((c) => !!c).length > 0 ? (
                                formatNumberWithStyle(totalClaimableValue, {
                                    style: 'currency',
                                    maxDecimals: 2,
                                    minDecimals: 0,
                                })
                            ) : (
                                <span style={{ fontStyle: 'italic' }}>No rewards available</span>
                            )}
                        </Text>
                        <HaiButton
                            $variant="yellowish"
                            onClick={onClaimAll}
                            disabled={
                                isClaimAllDisabled || isDistributorPaused || content.filter((c) => !!c).length === 0
                            }
                        >
                            Claim All
                        </HaiButton>
                    </Flex>

                    {timerData?.isPaused ? (
                        <Flex $width="100%" $justify="flex-start" $align="center">
                            <Text style={{ color: '#ff6b6b', textAlign: 'left', width: '100%' }}>
                                Distributor is currently paused to update rewards. <br />
                                {timerData?.endTime ? (
                                    <>
                                        Time to unpause:{' '}
                                        <span
                                            style={{
                                                backgroundColor: '#f8f8f8',
                                                padding: '0.2em 0.5em',
                                                borderRadius: '1em',
                                                fontWeight: 600,
                                                color: '#000',
                                            }}
                                        >
                                            <RemainingTime endTimestamp={timerData.endTime} />
                                        </span>
                                    </>
                                ) : null}
                            </Text>
                        </Flex>
                    ) : (
                        <Flex $width="100%" $justify="center" $align="center">
                            {timerData?.endTime ? (
                                <Text style={{ textAlign: 'left', width: '100%' }}>
                                    Next distribution in{' '}
                                    <span
                                        style={{
                                            backgroundColor: '#f8f8f8',
                                            padding: '0.2em 0.5em',
                                            borderRadius: '1em',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <RemainingTime endTimestamp={timerData.endTime} />
                                    </span>
                                </Text>
                            ) : null}
                        </Flex>
                    )}
                </Flex>
            }
        >
            <Text>
                Incentive rewards are distributed every 24 hours. Unclaimed rewards will accrue below and do not expire
            </Text>
            <ScrollableBody>
                <ContentWithStatus
                    loading={false}
                    error={undefined}
                    isEmpty={!content.filter((c) => !!c).length}
                    emptyContent="No rewards available to claim"
                >
                    {content}
                </ContentWithStatus>
            </ScrollableBody>
        </Modal>
    )
}
