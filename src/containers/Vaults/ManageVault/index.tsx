import { useEffect } from 'react'

import type { ReactChildren } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Text } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { VaultActions } from './VaultActions'
import { ManageDropdown } from './ManageDropdown'

type ManageVaultProps = {
    headerContent?: ReactChildren,
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const {
        updateForm,
        collateral,
        debt,
    } = useVault()

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    const relativePrice = parseFloat(collateral.priceInUSD || '0') / parseFloat(debt.priceInUSD)

    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    <ManageDropdown/>
                    <RewardsTokenPair tokens={['OP']}/>
                </CenteredFlex>
                <Text>
                    Market Price:&nbsp;
                    <strong>
                        {relativePrice
                            ? formatNumberWithStyle(relativePrice.toString(), { maxDecimals: 2 })
                            : '--'
                        } HAI / {collateral.name}
                    </strong>
                </Text>
                {headerContent}
            </Header>
            <Body>
                <ProxyPrompt>
                    <Overview/>
                    <VaultActions/>
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
