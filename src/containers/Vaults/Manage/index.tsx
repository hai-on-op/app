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
                    <BodyGrid>
                        <Overview/>
                        <VaultActions/>
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

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column-reverse;
        padding: 24px;

        & > * {
            &:first-child {
                flex-direction: column;
            }
        }
    `}

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
