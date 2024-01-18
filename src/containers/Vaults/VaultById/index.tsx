import { useMediaQuery, useVaultById } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, Flex, Grid } from '~/styles'
import { ContentWithStatus } from '~/components/ContentWithStatus'
import { BrandedTitle } from '~/components/BrandedTitle'
import { Overview } from './Overview'
import { ActivityTable } from './ActivityTable'

type VaultByIdProps = {
    id?: string
}
export function VaultById({ id = '' }: VaultByIdProps) {
    const { error, loading, vault } = useVaultById(id)

    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <Container>
            <Header>
                <BrandedTitle
                    textContent={`VAULT #${id}`}
                    $fontSize={isLargerThanSmall ? '3rem': '2.4rem'}
                />
            </Header>
            <Body>
                <ContentWithStatus
                    loading={loading}
                    error={error?.message}
                    isEmpty={!loading && !vault}
                    emptyContent={`Vault with id '${id}' not found`}>
                    <BodyGrid>
                        <Overview vault={vault}/>
                        <ActivityTable vault={vault}/>
                    </BodyGrid>
                </ContentWithStatus>
            </Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    min-height: 400px;
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
    padding: 0px;
`

const BodyGrid = styled(Grid)`
    width: 100%;
    grid-template-columns: 1fr;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
        grid-gap: 24px;
    `}
`
