import { useEffect, useState } from 'react'

import type { ReactChildren } from '~/types'
import { VaultAction } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery, useVaultById } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { VaultActions } from './VaultActions'
import { ManageDropdown } from './ManageDropdown'
import { NavContainer } from '~/components/NavContainer'
import { ActivityTable } from '../VaultById/ActivityTable'

type ManageVaultProps = {
    headerContent?: ReactChildren
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const { action, vault, updateForm } = useVault()

    const { vault: vaultWithActivity } = useVaultById(vault?.id || '')

    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    const [tab, setTab] = useState(0)

    return (
        <NavContainer
            navItems={action === VaultAction.CREATE ? [] : [`Manage`, `Activity`]}
            selected={tab}
            onSelect={action === VaultAction.CREATE ? () => {} : setTab}
            stackHeader
            headerContent={
                <Header $removePadding={action === VaultAction.CREATE}>
                    {headerContent}
                    <CenteredFlex $gap={12}>
                        <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel={isUpToExtraSmall} />
                        <ManageDropdown $width={isUpToSmall ? '100%' : undefined} />
                    </CenteredFlex>
                </Header>
            }
        >
            {tab === 0 || action === VaultAction.CREATE ? (
                <ProxyPrompt>
                    <BodyGrid>
                        <Overview />
                        <VaultActions />
                    </BodyGrid>
                </ProxyPrompt>
            ) : (
                <ActivityTable vault={vaultWithActivity} />
            )}
        </NavContainer>
    )
}

const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))<{ $removePadding: boolean }>`
    position: relative;

    ${({ $removePadding }) =>
        $removePadding &&
        css`
            padding: 0px;
            padding-bottom: 48px;
        `}

    ${({ theme, $removePadding }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        gap: 12px;

        & > * {
            width: 100%;
        }
        ${
            $removePadding &&
            css`
                padding-bottom: 0px;
            `
        }}
    `}

    z-index: 1;
`

const BodyGrid = styled(Grid)`
    width: 100%;
    grid-template-columns: 5fr 3fr;
    grid-gap: 48px;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        grid-template-columns: 1fr;
        grid-gap: 24px;
        padding: 24px;
    `}
`
