import { formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { TokenPair } from '../TokenPair'
import { useMemo } from 'react'

type DummyClaimableAsset = {
    asset: string
    amount: string
}

const dummyData: DummyClaimableAsset[] = [
    {
        asset: 'WETH',
        amount: '9',
    },
    {
        asset: 'OP',
        amount: '69',
    },
]

export function ClaimModal(props: ModalProps) {
    // TODO: extract claim asset identification and calculations to hook or provider

    const {
        vaultModel: { liquidationData },
        popupsModel: { isClaimPopupOpen },
    } = useStoreState((state) => state)
    const { setIsClaimPopupOpen } = useStoreActions(({ popupsModel }) => popupsModel)

    const { prices, total } = useMemo(() => {
        if (!liquidationData)
            return {
                prices: {},
                total: 0,
            }
        return dummyData.reduce(
            (acc, { asset, amount }) => {
                const price = parseFloat(
                    asset === 'HAI'
                        ? liquidationData.currentRedemptionPrice || '1'
                        : liquidationData.collateralLiquidationData[asset]?.currentPrice.value || '0'
                )
                acc.prices[asset] = price
                acc.total += parseFloat(amount) * price
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
                    <HaiButton $variant="yellowish" disabled={true} onClick={() => {}}>
                        Claim All
                    </HaiButton>
                </Flex>
            }
        >
            <Text>Claim your rewards earned from borrowing $HAI, or assets purchased through auctions.</Text>
            <Flex $width="100%" $column $justify="flex-start" $align="stretch" $gap={12}>
                {dummyData.map((asset, i) => (
                    <ClaimableAsset key={i} asset={asset} price={prices[asset.asset]} />
                ))}
            </Flex>
        </Modal>
    )
}

const ClaimableAssetContainer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    padding: 8px 16px;
    border-radius: 24px;
    border: 2px solid rgba(0, 0, 0, 0.1);
`

type ClaimableAssetProps = {
    asset: DummyClaimableAsset
    price?: number
}
function ClaimableAsset({ asset, price = 0 }: ClaimableAssetProps) {
    return (
        <ClaimableAssetContainer>
            <TokenPair tokens={[asset.asset as any]} hideLabel />
            <Flex $width="100%" $column $justify="center" $align="flex-start" $gap={4}>
                <Text $fontSize="1em" $fontWeight={700}>
                    {formatNumberWithStyle(asset.amount, { maxDecimals: 4 })} {asset.asset}
                </Text>
                <Text $fontSize="0.7em">
                    {formatNumberWithStyle(parseFloat(asset.amount) * price, { style: 'currency' })}
                </Text>
            </Flex>
        </ClaimableAssetContainer>
    )
}
