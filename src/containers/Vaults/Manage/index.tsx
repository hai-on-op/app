import { useEffect } from 'react'

import type { ReactChildren } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Grid, Text } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { VaultActions } from './VaultActions'
import { ManageDropdown } from './ManageDropdown'

type ManageVaultProps = {
    headerContent?: ReactChildren
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    const isLargerThanSmall = useMediaQuery('upToSmall')

    const { updateForm, collateral } = useVault()

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    <ManageDropdown />
                    <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel={!isLargerThanSmall} />
                </CenteredFlex>
                <Flex $column $justify="center" $align="flex-start" $gap={4}>
                    <Text>
                        {collateral.name} Market Price:&nbsp;
                        <strong>
                            {collateral.priceInUSD
                                ? formatNumberWithStyle(collateral.priceInUSD.toString(), {
                                      maxDecimals: 2,
                                      style: 'currency',
                                  })
                                : '--'}
                        </strong>
                    </Text>
                    <Text>
                        HAI Redemption Price:&nbsp;
                        <strong>
                            {liquidationData?.currentRedemptionPrice
                                ? formatNumberWithStyle(liquidationData.currentRedemptionPrice, {
                                      maxDecimals: 2,
                                      style: 'currency',
                                  })
                                : '--'}
                        </strong>
                    </Text>
                </Flex>
                {headerContent}
            </Header>
            <Body>
                <ProxyPrompt>
                    <BodyGrid>
                        <Overview />
                        <VaultActions />
                    </BodyGrid>
                </ProxyPrompt>
            </Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 24px 48px;
    border-bottom: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column-reverse;
        padding: 24px;

        & > * {
            width: 100%;
            // &:first-child {
            //     flex-direction: column;
            // }
        }
    `}

    z-index: 1;
`

const Body = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 48,
    ...props,
}))`
    padding: 48px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
`

const BodyGrid = styled(Grid)`
    width: 100%;
    grid-template-columns: 5fr 3fr;
    grid-gap: 48px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
        grid-gap: 24px;
    `}
`
