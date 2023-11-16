import type { ReactChildren } from '~/types'
import { type ISafe } from '~/utils'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Text } from '~/styles'
import { BrandedDropdown } from '~/components/BrandedDropdown'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { Overview } from './Overview'
import { VaultActions } from './VaultActions'

type ManageVaultProps = {
    vault: ISafe,
    headerContent?: ReactChildren
}
export function ManageVault({ vault, headerContent }: ManageVaultProps) {
    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    <BrandedDropdown
                        label={(<>
                            <TokenPair tokens={['WETH', 'HAI']}/>
                            <Text>{` • 1 of `}12</Text>
                        </>)}>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                    </BrandedDropdown>
                    <RewardsTokenPair tokens={['OP']}/>
                </CenteredFlex>
                <Text>
                    Market Price:&nbsp;
                    <strong>1,874 HAI/WETH</strong>
                </Text>
                {headerContent}
            </Header>
            <Body>
                <Overview vault={vault}/>
                <VaultActions vault={vault}/>
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
