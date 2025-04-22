import { useStoreActions, useStoreState } from '~/store'
import { Modal } from '.'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { ActionState, formatNumberWithStyle, tokenMap, wait, isFormattedAddress, slugify, TOKEN_LOGOS } from '~/utils'
import styled from 'styled-components'
import { ContentWithStatus } from '../ContentWithStatus'
import { tokenAssets } from '~/utils'
import type { IAuction } from '~/types'
import { handleTransactionError, useEthersSigner } from '~/hooks'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { TokenArray } from '../TokenArray'
import dayjs from 'dayjs'
import { useStakingData } from '~/hooks/useStakingData'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { ethers } from 'ethers'

export function StakingClaimModal() {
    const signer = useEthersSigner()
    const {
        vaultModel: { liquidationData },
        popupsModel: { isStakeClaimPopupOpen },
    } = useStoreState((state) => state)
    const {
        popupsModel: { setIsStakeClaimPopupOpen, setIsWaitingModalOpen, setWaitingPayload },
        stakingModel: stakingActions,
    } = useStoreActions((actions) => actions)

    const { userRewards, refetchAll } = useStakingData()

    const [claiming, setClaiming] = useState(false)

    const { prices: veloPrices } = useVelodromePrices()

    const haiPrice = parseFloat(liquidationData?.currentRedemptionPrice || '1')
    const kitePrice = veloPrices?.KITE.raw
    const opPrice = liquidationData?.collateralLiquidationData?.OP?.currentPrice.value

    const HAI_ADDRESS = import.meta.env.VITE_HAI_ADDRESS
    const KITE_ADDRESS = import.meta.env.VITE_KITE_ADDRESS
    const OP_ADDRESS = import.meta.env.VITE_OP_ADDRESS

    const rewardsDataMap = {
        [HAI_ADDRESS]: {
            id: 0,
            name: tokenAssets.HAI.symbol,
            tokenImg: tokenAssets.HAI.icon,
            price: haiPrice,
        },
        [KITE_ADDRESS]: {
            id: 1,
            name: tokenAssets.KITE.symbol,
            tokenImg: tokenAssets.KITE.icon,
            price: kitePrice,
        },
        [OP_ADDRESS]: {
            id: 2,
            name: tokenAssets.OP.symbol,
            tokenImg: tokenAssets.OP.icon,
            price: opPrice,
        },
    }

    const onClaim = async () => {
        if (!signer || claiming) return
        try {
            setClaiming(true)

            setIsWaitingModalOpen(true)
            setWaitingPayload({
                title: 'Waiting For Confirmation',
                text: 'Claim Rewards',
                hint: 'Confirm this transaction in your wallet',
                status: ActionState.LOADING,
            })

            stakingActions.setTransactionState(ActionState.LOADING)
            await stakingActions.getReward({ signer })

            stakingActions.setTransactionState(ActionState.SUCCESS)
            setIsWaitingModalOpen(false)
            setWaitingPayload({ status: ActionState.NONE })

            // Refetch all data after successful claim
            await refetchAll({})

            setIsStakeClaimPopupOpen(false)
        } catch (error) {
            console.error('Failed to claim rewards:', error)
            stakingActions.setTransactionState(ActionState.ERROR)
            handleTransactionError(error)
        } finally {
            setClaiming(false)
        }
    }

    if (!isStakeClaimPopupOpen) return null
    const content = userRewards.map((reward) => {
        return (
            <ClaimableAsset
                key={`reward-${reward.id}`}
                asset={rewardsDataMap[reward.tokenAddress as any].name}
                amount={ethers.utils.formatEther(reward.amount)}
                price={rewardsDataMap[reward.tokenAddress as any].price as number}
                claim={{
                    description: `${rewardsDataMap[reward.tokenAddress as any].name} Rewards`,
                    createdAt: Date.now(),
                }}
            />
        )
    })

    return (
        <Modal
            heading="CLAIM"
            maxWidth="560px"
            onClose={() => setIsStakeClaimPopupOpen(false)}
            footerContent={
                <Flex $width="100%" $justify="space-between" $align="center">
                    <Text>
                        <strong>Total Estimated Value:</strong>
                        &nbsp;
                        {formatNumberWithStyle(
                            userRewards.reduce((acc, reward) => {
                                const amount = parseFloat(ethers.utils.formatEther(reward.amount))
                                const price = rewardsDataMap[reward.tokenAddress as any].price as number
                                return acc + amount * price
                            }, 0),
                            { style: 'currency' }
                        )}
                    </Text>
                    <HaiButton $variant="yellowish" onClick={onClaim} disabled={claiming || !userRewards.length}>
                        {claiming ? 'Claiming...' : 'Claim All'}
                    </HaiButton>
                </Flex>
            }
        >
            <Text>Claim your staking rewards. Unclaimed rewards will accure bellow and do not expire.</Text>
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

type Claim = {
    description: string
    createdAt: number
}

type ClaimableAssetProps = {
    asset: string
    amount: string
    price?: number
    claim?: Claim
    distributor?: any
    onSuccess?: () => void
} /*& (
    | {
          asset: string
          auction: IAuction
          internal?: undefined
          incentive: boolean
      }
    | {
          asset: 'COIN' | 'PROTOCOL_TOKEN'
          auction?: undefined
          internal: boolean
          incentive: boolean
      }
)*/

const returnDaysLeftToClaim = (date: number) => {
    const deploymentTime = dayjs(date * 1000)
    const dayDiff = dayjs().diff(deploymentTime, 'day')
    if (dayDiff > 90) {
        return 0
    }
    return 90 - dayjs().diff(deploymentTime, 'day')
}

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

function ClaimableAsset({ asset, amount, price = 0, claim }: ClaimableAssetProps) {
    const signer = useEthersSigner()
    const { address: account } = useAccount()

    const {
        auctionModel: auctionActions,
        popupsModel: popupsActions,
        transactionsModel: transactionsActions,
    } = useStoreActions((actions) => actions)

    const [status, setStatus] = useState(ActionState.NONE)

    const onClaim = async () => {
        /*if (incentive) {
            const formatted = isFormattedAddress(account)
            if (!formatted) {
                console.debug('wrong address')
                return false
            }
            const { index, amount, proof } = claim
            try {
                const txResponse = await distributor.claim(index, formatted, amount, proof)
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
                        status: 'success',
                    })
                    await txResponse.wait()
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
        }*/
    }

    if (!claim) return <div></div>

    return (
        <ClaimableAssetContainer style={status === ActionState.SUCCESS ? { opacity: 0.5 } : undefined}>
            <CenteredFlex $gap={12}>
                <TokenArray size={48} tokens={[(tokenMap[asset] || asset) as any]} hideLabel />
                <Flex $width="100%" $column $justify="center" $align="flex-start" $gap={4}>
                    <>
                        <Text $fontSize="1em" $fontWeight={700}>
                            {claim.description}
                        </Text>
                    </>

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
            <CenteredFlex $column $gap={12}></CenteredFlex>
        </ClaimableAssetContainer>
    )
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
