import { useMemo, useState } from 'react'

import { ActionState, QueryEnglishAuction, formatNumberWithStyle, tokenMap } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner, useMyBids } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { TokenArray } from '../TokenArray'

export function ClaimModal(props: ModalProps) {
    // TODO: extract claim asset identification and calculations to hook or provider

    const {
        vaultModel: { liquidationData },
        popupsModel: { isClaimPopupOpen },
    } = useStoreState((state) => state)
    const { setIsClaimPopupOpen } = useStoreActions(({ popupsModel }) => popupsModel)

    const { claimableAuctions } = useMyBids()

    const { prices, total } = useMemo(() => {
        if (!liquidationData)
            return {
                prices: {},
                total: 0,
            }
        const { collateralLiquidationData, currentRedemptionPrice } = liquidationData
        return claimableAuctions.reduce(
            (acc, { sellAmount, auction }) => {
                if (!auction) return acc
                const price =
                    tokenMap[auction.sellToken] === 'HAI'
                        ? parseFloat(currentRedemptionPrice || '0')
                        : tokenMap[auction.sellToken] === 'KITE'
                        ? 10
                        : parseFloat(collateralLiquidationData?.[auction.sellToken]?.currentPrice.value || '0')
                acc.prices[tokenMap[auction.sellToken] || auction.sellToken] = price
                acc.total += parseFloat(sellAmount) * price
                return acc
            },
            { prices: {} as Record<string, number>, total: 0 }
        )
    }, [liquidationData])

    if (!isClaimPopupOpen) return null

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
                {claimableAuctions.map(({ sellAmount, auction }, i) => {
                    if (!auction) return null
                    const asset = tokenMap[auction.sellToken] || auction.sellToken
                    return (
                        <ClaimableAsset
                            key={i}
                            asset={asset}
                            amount={sellAmount}
                            price={prices[asset]}
                            auction={auction}
                        />
                    )
                })}
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
    border-radius: 999px;
    border: 2px solid rgba(0, 0, 0, 0.1);
`

type ClaimableAssetProps = {
    asset: string
    amount: string
    price?: number
} & {
    auction: QueryEnglishAuction
}
function ClaimableAsset({ asset, amount, price = 0, auction }: ClaimableAssetProps) {
    const signer = useEthersSigner()

    const { auctionModel: auctionActions } = useStoreActions((actions) => actions)

    const [status, setStatus] = useState(ActionState.NONE)

    const auctionType = (() => {
        switch (auction.englishAuctionType) {
            case 'DEBT':
            case 'SURPLUS':
                return auction.englishAuctionType
            case 'LIQUIDATION':
            default:
                return 'COLLATERAL'
        }
    })()

    const onClaim = async () => {
        if (status === ActionState.LOADING || !signer) return

        setStatus(ActionState.LOADING)
        try {
            await auctionActions.auctionClaimInternalBalance({
                signer,
                auctionId: auction.auctionId,
                title: 'Claim Assets',
                auctionType,
                bid: amount,
                token: asset === 'HAI' ? 'COIN' : 'PROTOCOL_TOKEN',
            })
            setStatus(ActionState.SUCCESS)
        } catch (e: any) {
            handleTransactionError(e)
            setStatus(ActionState.ERROR)
        }
    }

    return (
        <ClaimableAssetContainer style={status === ActionState.SUCCESS ? { opacity: 0.5 } : undefined}>
            <CenteredFlex $gap={12}>
                <TokenArray size={48} tokens={[asset as any]} hideLabel />
                <Flex $width="100%" $column $justify="center" $align="flex-start" $gap={4}>
                    <Text $fontSize="0.7em">
                        Auction: #{auction.auctionId} ({auctionType})
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
