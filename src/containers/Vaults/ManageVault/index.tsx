import { useEffect } from 'react'

import type { ReactChildren } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Text } from '~/styles'
import { BrandedDropdown } from '~/components/BrandedDropdown'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { VaultActions } from './VaultActions'

type ManageVaultProps = {
    headerContent?: ReactChildren
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const { updateForm, collateral, debt } = useVault()

    const relativePrice = parseFloat(collateral.priceInUSD || '0') / parseFloat(debt.priceInUSD)

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    <BrandedDropdown
                        label={(<>
                            <TokenPair
                                tokens={[collateral.name as any, 'HAI']}
                                hideLabel
                            />
                            <Text>{collateral.name}/HAI • 1 of 12</Text>
                        </>)}
                        style={{ paddingLeft: '8px' }}>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                    </BrandedDropdown>
                    <RewardsTokenPair tokens={['OP']}/>
                </CenteredFlex>
                <Text>
                    Market Price:&nbsp;
                    <strong>
                        {relativePrice
                            ? formatNumberWithStyle(relativePrice.toString(), { maxDecimals: 2 })
                            : '--'
                        } HAI/{collateral.name}
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
    ...props
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
    ...props
}))`
    padding: 48px;
`
