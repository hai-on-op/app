import { formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Modal, type ModalProps } from './index'
import { TokenPair } from '../TokenPair'

type DummyClaimableAsset = {
    asset: string
    amount: string
}

// TOOD: get real claim data
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
    // TODO: calculate total $ value

    const { isClaimPopupOpen } = useStoreState(({ popupsModel }) => popupsModel)
    const { setIsClaimPopupOpen } = useStoreActions(({ popupsModel }) => popupsModel)

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
                        &nbsp;$27,765
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
                    <ClaimableAsset key={i} asset={asset} />
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

function ClaimableAsset({ asset }: { asset: DummyClaimableAsset }) {
    return (
        <ClaimableAssetContainer>
            <TokenPair tokens={[asset.asset as any]} hideLabel />
            <Flex $width="100%" $column $justify="center" $align="flex-start" $gap={4}>
                <Text $fontSize="1em" $fontWeight={700}>
                    {formatNumberWithStyle(asset.amount, { maxDecimals: 4 })} {asset.asset}
                </Text>
                {/* TODO: calculate individual $ amount */}
                <Text $fontSize="0.7em">{formatNumberWithStyle(asset.amount, { style: 'currency' })}</Text>
            </Flex>
        </ClaimableAssetContainer>
    )
}
