import { useMemo, useState } from 'react'

import type { IAuction } from '~/types'
import { ActionState, formatNumberWithStyle, tokenMap, wait } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useClaims } from '~/providers/ClaimsProvider'
import { handleTransactionError, useEthersSigner } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { TokenArray } from '../TokenArray'
import { ContentWithStatus } from '../ContentWithStatus'

export function ClaimModal(props: ModalProps) {
    const {
        vaultModel: { liquidationData },
        popupsModel: { isClaimPopupOpen },
    } = useStoreState((state) => state)
    const { setIsClaimPopupOpen } = useStoreActions(({ popupsModel }) => popupsModel)

    const { activeAuctions, internalBalances } = useClaims()

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
                const price =
                    tokenMap[auction.sellToken] === 'HAI'
                        ? parseFloat(currentRedemptionPrice || '1')
                        : tokenMap[auction.sellToken] === 'KITE'
                        ? 10
                        : parseFloat(collateralLiquidationData?.[auction.sellToken]?.currentPrice.value || '0')
                acc.prices[tokenMap[auction.sellToken] || auction.sellToken] = price
                acc.total += parseFloat(sellAmount) * price
                return acc
            },
            { prices: {} as Record<string, number>, total: 0 }
        )
    }, [liquidationData, activeAuctions.claimableAuctions])

    if (!isClaimPopupOpen) return null

    const content = [
        ...activeAuctions.claimableAuctions.map(({ sellAmount, auction }, i) => {
            if (!auction) return null
            const asset = tokenMap[auction.sellToken] || auction.sellToken
            return (
                <ClaimableAsset
                    key={i}
                    asset={asset}
                    amount={sellAmount}
                    price={prices[asset]}
                    auction={auction}
                    onSuccess={activeAuctions.refetch}
                />
            )
        }),
        ...(parseFloat(internalBalances.HAI?.raw || '0') > 0
            ? [
                  <ClaimableAsset
                      key="internalHai"
                      asset="COIN"
                      amount={internalBalances.HAI?.raw || '0'}
                      price={prices.HAI}
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
                      price={prices.KITE}
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
                        {formatNumberWithStyle(total, { style: 'currency' })}
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

type ClaimableAssetProps = {
    asset: string
    amount: string
    price?: number
    onSuccess?: () => void
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
function ClaimableAsset({ asset, amount, price = 0, auction, internal, onSuccess }: ClaimableAssetProps) {
    const signer = useEthersSigner()

    const { auctionModel: auctionActions, popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const [status, setStatus] = useState(ActionState.NONE)

    const onClaim = async () => {
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
            popupsActions.setIsWaitingModalOpen(true)
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

    return (
        <ClaimableAssetContainer style={status === ActionState.SUCCESS ? { opacity: 0.5 } : undefined}>
            <CenteredFlex $gap={12}>
                <TokenArray size={48} tokens={[(tokenMap[asset] || asset) as any]} hideLabel />
                <Flex $width="100%" $column $justify="center" $align="flex-start" $gap={4}>
                    <Text $fontSize="0.7em">
                        {auction
                            ? `Auction: #${auction.auctionId} (${auction.englishAuctionType})`
                            : `Claimable ${tokenMap[asset]}`}
                    </Text>
                    <Text $fontSize="1em" $fontWeight={700}>
                        {formatNumberWithStyle(amount, { maxDecimals: 4 })} {asset}
                    </Text>
                    <Text $fontSize="0.7em">
                        {formatNumberWithStyle(parseFloat(amount) * price, { style: 'currency' })}
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
