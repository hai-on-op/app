import { useEffect } from 'react'

import type { ReactChildren } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Grid, Text } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { VaultActions } from './VaultActions'
import { ManageDropdown } from './ManageDropdown'

type ManageVaultProps = {
    headerContent?: ReactChildren,
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const { updateForm, collateral } = useVault()

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    <ManageDropdown/>
                    <RewardsTokenPair tokens={['OP']}/>
                </CenteredFlex>
                <Text>
                    Market Price: ({collateral.name})&nbsp;
                    <strong>
                        {collateral.priceInUSD
                            ? formatNumberWithStyle(collateral.priceInUSD.toString(), {
                                maxDecimals: 2,
                                style: 'currency',
                            })
                            : '--'
                        }
                    </strong>
                </Text>
                {headerContent}
            </Header>
            <Body>
                <ProxyPrompt>
                    <Grid
                        $width="100%"
                        $columns="5fr 3fr"
                        $gap={48}>
                        <Overview/>
                        <VaultActions/>
                    </Grid>
                </ProxyPrompt>
            </Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 24px 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
    z-index: 1;
`

const Body = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 48,
    ...props,
}))`
    padding: 48px;
`
