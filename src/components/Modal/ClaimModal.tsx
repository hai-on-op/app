import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { IAuction } from '~/types'
import { ActionState, formatNumberWithStyle, tokenMap, wait, isFormattedAddress, slugify } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useClaims } from '~/providers/ClaimsProvider'
import { useAccount } from 'wagmi'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { handleTransactionError, useEthersSigner, useGeb } from '~/hooks'
import { BigNumberish, utils } from 'ethers'
import { useDistributorContract } from '~/hooks/useContract'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { TokenArray } from '../TokenArray'
import { ContentWithStatus } from '../ContentWithStatus'

const returnDaysLeftToClaim = (date: number) => {
    const deploymentTime = dayjs(date * 1000)
    const dayDiff = dayjs().diff(deploymentTime, 'day')
    if (dayDiff > 90) {
        return 0
    }
    return 90 - dayjs().diff(deploymentTime, 'day')
}

const returnAmount = (value: BigNumberish) => utils.formatEther(value)

export function ClaimModal(props: ModalProps) {
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
    const dineroPrice = veloPrices?.DINERO.raw
    const opPrice = liquidationData?.collateralLiquidationData?.OP?.currentPrice.value

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
                        ? kitePrice
                        : parseFloat(collateralLiquidationData?.[token]?.currentPrice.value || '0')
                acc.prices[token] = price
                acc.total += parseFloat(sellAmount) * price
                return acc
            },
            { prices: {} as Record<string, number>, total: 0 }
        )
    }, [liquidationData, activeAuctions.claimableAuctions])

    if (!isClaimPopupOpen) return null

    const kiteIncentivesData = incentivesData['KITE']
    const opIncentivesData = incentivesData['OP']
    const dineroIncentivesData = incentivesData['DINERO']

    const kiteIncentivesContent = kiteIncentivesData?.hasClaimableDistros
        ? kiteIncentivesData.claims.map((claim) => (
              <ClaimableIncentive
                  key={slugify(claim.description)}
                  asset="KITE"
                  claim={claim}
                  price={kitePrice}
                  onSuccess={refetchIncentives}
              />
          ))
        : []

    const opIncentivesContent = opIncentivesData?.hasClaimableDistros
        ? opIncentivesData.claims.map((claim) => (
              <ClaimableIncentive
                  key={slugify(claim.description)}
                  asset="OP"
                  claim={claim}
                  price={opPrice}
                  onSuccess={refetchIncentives}
              />
          ))
        : []

    const dineroIncentivesContent = dineroIncentivesData?.hasClaimableDistros
        ? dineroIncentivesData.claims.map((claim) => (
              <ClaimableIncentive
                  key={slugify(claim.description)}
                  asset="DINERO"
                  claim={claim}
                  price={dineroPrice}
                  onSuccess={refetchIncentives}
              />
          ))
        : []

    const tokenIncentiveValue = (claims, price) =>
        claims?.reduce((acc, claim) => {
            const value = claim.isClaimed ? 0 : parseFloat(returnAmount(claim.amount))
            return acc + value
        }, 0) * price

    const kiteIncentiveValue = tokenIncentiveValue(kiteIncentivesData?.claims, kitePrice)
    const opIncentiveValue = tokenIncentiveValue(opIncentivesData?.claims, opPrice)
    const dineroIncentiveValue = tokenIncentiveValue(dineroIncentivesData?.claims, dineroPrice)

    const totalIncentiveValue = kiteIncentiveValue + opIncentiveValue + dineroIncentiveValue

    const incentivesContent = [...kiteIncentivesContent, ...opIncentivesContent, ...dineroIncentivesContent]

    const totalClaimableValue = total + totalIncentiveValue

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
                      internal
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
                      internal
                      onSuccess={internalBalances.refetch}
                  />,
              ]
            : []),
    ]

    return (
        <Modal
            heading="CLAIM"
            maxWidth="560px"
            {...props}
            onClose={() => setIsClaimPopupOpen(false)}
            footerContent={
                <Flex $width="100%" $justify="space-between" $align="center">
                    <Text>
                        <strong>Total Estimated Value:</strong>
                        &nbsp;
                        {formatNumberWithStyle(totalClaimableValue, { style: 'currency' })}
                    </Text>
                </Flex>
            }
        >
            <Text>Claim incentive rewards, assets purchased in auctions, and reclaim unsuccessful auction bids</Text>
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

type Claim = object

type ClaimableAssetProps = {
    asset: string
    amount: string
    price?: number
    claim?: Claim
    distributor?: any
    onSuccess?: () => void
} & (
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
)

const ClaimableIncentive = ({ asset, claim, price, onSuccess }) => {
    if (claim.isClaimed) return null
    const distributor = useDistributorContract(claim.distributorAddress)
    return (
        <ClaimableAsset
            key={`distributor-${claim.distributorAddress}`}
            asset={asset}
            claim={claim}
            amount={returnAmount(claim.amount)}
            price={price}
            distributor={distributor}
            incentive
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
    distributor,
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

    const onClaim = async () => {
        if (incentive) {
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
                                {claim.description}
                            </Text>
                        </>
                    ) : (
                        <Text $fontSize="0.7em">
                            {auction
                                ? `Auction: #${auction.auctionId} (${auction.englishAuctionType})`
                                : `Unsuccessful Bid(s)`}
                        </Text>
                    )}
                    {incentive && (
                        <Text $fontSize="0.8em">{returnDaysLeftToClaim(claim.createdAt)} days left to claim</Text>
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
                    disabled={!signer || status === ActionState.LOADING || status === ActionState.SUCCESS}
                    onClick={onClaim}
                >
                    {status === ActionState.SUCCESS ? 'Claimed' : 'Claim'}
                </HaiButton>
            </CenteredFlex>
        </ClaimableAssetContainer>
    )
}
