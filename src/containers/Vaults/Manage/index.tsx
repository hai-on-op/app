import { useEffect, useMemo, useState } from 'react'

import type { ReactChildren } from '~/types'
import { VaultAction } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery, useVaultById } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { HaiVeloOverview } from "./HaiVeloOverview"
import { HaiVeloProvider } from '~/providers/HaiVeloProvider'
import { VaultActions } from './VaultActions'
import { MintHaiVeloActions } from './MintHaiVeloActions'
import { useAccount } from 'wagmi'
import { useHaiVeloAccount } from '~/hooks/haivelo/useHaiVeloAccount'
import { ManageDropdown } from './ManageDropdown'
import { NavContainer } from '~/components/NavContainer'
import { ActivityTable } from '../VaultById/ActivityTable'

type ManageVaultProps = {
    headerContent?: ReactChildren
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const { action, vault, updateForm } = useVault()

    const isHAIVELO =
        vault?.collateralName === 'HAIVELO' ||
        new URLSearchParams(window.location.search).get('collateral') === 'HAIVELO'

    const { vault: vaultWithActivity } = useVaultById(vault?.id || '')

    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    // Default to Manage tab for existing haiVELO vaults; Mint tab for CREATE/new
    const [tab, setTab] = useState(() => (isHAIVELO ? (action === VaultAction.CREATE ? 0 : 1) : 0))

    // Create navItems array based on vault type and action
    const getNavItems = () => {
        if (action === VaultAction.CREATE) {
            return isHAIVELO ? ['Mint haiVELO', 'Create Vault'] : []
        } else {
            return isHAIVELO ? ['Mint haiVELO', 'Manage', 'Activity'] : ['Manage', 'Activity']
        }
    }

    const navItems = getNavItems()

    // Determine content to show based on current tab and vault type
    const renderTabContent = () => {
        const isCreateMode = action === VaultAction.CREATE

        if (isHAIVELO && tab === 0) {
            // Mint HAI Velo tab content
            return (
                <ProxyPrompt>
                    <HaiVeloProvider>
                        <BodyGrid>
                            <HaiVeloOverview />
                            <MintHaiVeloActions />
                        </BodyGrid>
                    </HaiVeloProvider>
                </ProxyPrompt>
            )
        } else if (
            (!isHAIVELO && tab === 0 && isCreateMode) || // Create tab for non-HAIVELO in CREATE mode
            (!isHAIVELO && tab === 0 && !isCreateMode) || // Manage tab for non-HAIVELO in non-CREATE mode
            (isHAIVELO && tab === 1) // Create/Manage tab for HAIVELO
        ) {
            // Manage/Create content
            return (
                <ProxyPrompt>
                    <BodyGrid>
                        <Overview isHAIVELO={isHAIVELO} />
                        <VaultActions />
                    </BodyGrid>
                </ProxyPrompt>
            )
        } else {
            // Activity tab
            return <ActivityTable vault={vaultWithActivity} />
        }
    }

    return (
        <NavContainer
            navItems={navItems}
            selected={tab}
            onSelect={setTab}
            stackHeader
            headerContent={
                <Header $removePadding={action === VaultAction.CREATE}>
                    {headerContent}
                    <CenteredFlex $gap={12}>
                        {isHAIVELO ? <RewardsTokenArray tokens={['HAI']} hideLabel={isUpToExtraSmall} /> : null}
                        <ManageDropdown $width={isUpToSmall ? '100%' : undefined} />
                    </CenteredFlex>
                </Header>
            }
        >
            {renderTabContent()}
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
