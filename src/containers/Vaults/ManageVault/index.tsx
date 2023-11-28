import type { ReactChildren } from '~/types'
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
    const { collateralName, collateralUSD, haiUSD } = useVault()

    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    <BrandedDropdown
                        label={(<>
                            <TokenPair tokens={[collateralName as any, 'HAI']}/>
                            <Text>{`• 1 of `}12</Text>
                        </>)}>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                    </BrandedDropdown>
                    <RewardsTokenPair tokens={['OP']}/>
                </CenteredFlex>
                <Text>
                    Market Price:&nbsp;
                    <strong>{(((collateralUSD || 0) / haiUSD) || '--').toLocaleString()} HAI/{collateralName}</strong>
                </Text>
                {headerContent}
            </Header>
            <Body>
                <ProxyPrompt>
                    <>
                        <Overview/>
                        <VaultActions/>
                    </>
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
