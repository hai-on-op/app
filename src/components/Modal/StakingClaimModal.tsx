import { useStoreActions, useStoreState } from '~/store'
import { Modal } from '.'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { ActionState, formatNumberWithStyle, tokenMap, wait, isFormattedAddress, slugify } from '~/utils'
import styled from 'styled-components'
import { ContentWithStatus } from '../ContentWithStatus'
import type { IAuction } from '~/types'
import { useEthersSigner } from '~/hooks'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { TokenArray } from '../TokenArray'
import dayjs from 'dayjs'
import { useStakingData } from '~/hooks/useStakingData'
import { ethers } from 'ethers'

export function StakingClaimModal() {
    const signer = useEthersSigner()
    const {
        popupsModel: { isStakeClaimPopupOpen },
    } = useStoreState((state) => state)
    const {
        popupsModel: { setIsStakeClaimPopupOpen },
        stakingModel: stakingActions,
    } = useStoreActions((actions) => actions)

    const { userRewards } = useStakingData()
    const [claiming, setClaiming] = useState(false)

    const onClaim = async () => {
        if (!signer || claiming) return
        try {
            setClaiming(true)
            await stakingActions.getReward({ signer })
            setIsStakeClaimPopupOpen(false)
        } catch (error) {
            console.error('Failed to claim rewards:', error)
        } finally {
            setClaiming(false)
        }
    }

    if (!isStakeClaimPopupOpen) return null

    const content = userRewards.map((reward) => (
        <ClaimableAsset
            key={`reward-${reward.id}`}
            asset="KITE"
            amount={ethers.utils.formatEther(reward.amount)}
            price={0.321475} // This should come from somewhere else
            claim={{ description: `Reward Type ${reward.id}`, createdAt: Date.now() }}
        />
    ))

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
                            userRewards.reduce(
                                (acc, reward) => acc + parseFloat(ethers.utils.formatEther(reward.amount)) * 0.321475,
                                0
                            ),
                            { style: 'currency' }
                        )}
                    </Text>
                    <HaiButton
                        $variant="yellowish"
                        onClick={onClaim}
                        disabled={claiming || !userRewards.length}
                    >
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
