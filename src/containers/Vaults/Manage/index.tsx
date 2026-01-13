import { useEffect, useState } from 'react'

import type { ReactChildren } from '~/types'
import { MinterChainId } from '~/types/minterProtocol'
import { VaultAction } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery, useVaultById } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton } from '~/styles'
import { MigrateHaiVeloV2Modal } from '~/components/Modal/MigrateHaiVeloV2Modal'
import { RewardsTokenArray } from '~/components/TokenArray'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { HaiVeloOverview } from './HaiVeloOverview'
import { HaiVeloProvider } from '~/providers/HaiVeloProvider'
import { MinterProtocolProvider } from '~/providers/MinterProtocolProvider'
import { VaultActions } from './VaultActions'
import { MintHaiVeloActions } from './MintHaiVeloActions'
import { MinterOverview, MintActions, BridgeTab } from './Minter'
import { ManageDropdown } from './ManageDropdown'
import { NavContainer } from '~/components/NavContainer'
import { ActivityTable } from '../VaultById/ActivityTable'

type ManageVaultProps = {
    headerContent?: ReactChildren
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const { action, vault, updateForm } = useVault()

    // Detect haiVELO pages
    const isHAIVELO =
        vault?.collateralName === 'HAIVELOV2' ||
        new URLSearchParams(window.location.search).get('collateral') === 'HAIVELOV2' ||
        window.location.pathname === '/haiVELO'

    const isHAIVELO_V1 =
        vault?.collateralName === 'HAIVELO' ||
        new URLSearchParams(window.location.search).get('collateral') === 'HAIVELO'

    // Detect haiAERO pages
    const isHAIAERO =
        vault?.collateralName === 'HAIAERO' ||
        new URLSearchParams(window.location.search).get('collateral') === 'HAIAERO' ||
        window.location.pathname === '/haiAERO'

    // Combined check for any minter protocol page
    const isMinterProtocol = isHAIVELO || isHAIAERO

    const { vault: vaultWithActivity } = useVaultById(vault?.id || '')

    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')
    const [showMigrate, setShowMigrate] = useState(false)

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    // Default to Manage tab for existing minter protocol vaults; Mint tab for CREATE/new
    const [tab, setTab] = useState(() => (isMinterProtocol ? (action === VaultAction.CREATE ? 0 : 1) : 0))

    // Create navItems array based on vault type and action
    const getNavItems = () => {
        if (action === VaultAction.CREATE) {
            if (isHAIVELO) {
                return ['Mint haiVELO', 'Create Vault']
            } else if (isHAIAERO) {
                return ['Mint haiAERO', 'Bridge to Optimism', 'Create Vault']
            }
            return []
        } else {
            if (isHAIVELO) {
                return ['Mint haiVELO', 'Manage', 'Activity']
            } else if (isHAIAERO) {
                return ['Mint haiAERO', 'Bridge to Optimism', 'Manage', 'Activity']
            }
            return ['Manage', 'Activity']
        }
    }

    const navItems = getNavItems()

    // Determine content to show based on current tab and vault type
    const renderTabContent = () => {
        const isCreateMode = action === VaultAction.CREATE

        // haiVELO tabs: [Mint, Manage/Create, Activity?]
        if (isHAIVELO && tab === 0) {
            // Mint HAI Velo tab content
            // Both HaiVeloProvider (for legacy components) and MinterProtocolProvider (for Execute modal) are needed
            return (
                <ProxyPrompt>
                    <HaiVeloProvider>
                        <MinterProtocolProvider protocolId="haiVelo">
                            <BodyGrid>
                                <HaiVeloOverview />
                                <MintHaiVeloActions />
                            </BodyGrid>
                        </MinterProtocolProvider>
                    </HaiVeloProvider>
                </ProxyPrompt>
            )
        }

        // haiAERO tabs: [Mint, Bridge, Manage/Create, Activity?]
        if (isHAIAERO && tab === 0) {
            // Mint haiAERO tab content - allows Base chain for minting
            return (
                <ProxyPrompt allowedChainIds={[MinterChainId.BASE]}>
                    <MinterProtocolProvider protocolId="haiAero">
                        <BodyGrid>
                            <MinterOverview />
                            <MintActions />
                        </BodyGrid>
                    </MinterProtocolProvider>
                </ProxyPrompt>
            )
        }

        if (isHAIAERO && tab === 1) {
            // Bridge tab content - allows Base chain for bridging
            return (
                <ProxyPrompt allowedChainIds={[MinterChainId.BASE]}>
                    <MinterProtocolProvider protocolId="haiAero">
                        <BridgeTabContainer>
                            <BridgeTab />
                        </BridgeTabContainer>
                    </MinterProtocolProvider>
                </ProxyPrompt>
            )
        }

        // Manage/Create tab
        const isManageTab =
            (!isMinterProtocol && tab === 0) || // Manage tab for non-minter protocols
            (isHAIVELO && tab === 1) || // Manage tab for haiVELO
            (isHAIAERO && tab === 2) // Manage tab for haiAERO

        if (isManageTab) {
            return (
                <ProxyPrompt>
                    <BodyGrid>
                        <Overview isHAIVELO={isMinterProtocol} />
                        <VaultActions />
                    </BodyGrid>
                </ProxyPrompt>
            )
        }

        // Activity tab (last tab)
        return <ActivityTable vault={vaultWithActivity} />
    }

    return (
        <NavContainer
            navItems={navItems}
            selected={tab}
            onSelect={setTab}
            stackHeader
            headerContent={
                <>
                    <Header $removePadding={action === VaultAction.CREATE}>
                        <Flex $align="center" $gap={8}>
                            {headerContent}
                            {isHAIVELO_V1 && (
                                <HaiButton $variant="yellowish" onClick={() => setShowMigrate(true)}>
                                    Migrate to haiVELO v2
                                </HaiButton>
                            )}
                        </Flex>
                        <CenteredFlex $gap={12}>
                            {isMinterProtocol ? <RewardsTokenArray tokens={['HAI']} hideLabel={isUpToExtraSmall} /> : null}
                            <ManageDropdown $width={isUpToSmall ? '100%' : undefined} />
                        </CenteredFlex>
                    </Header>
                    {showMigrate && <MigrateHaiVeloV2Modal onClose={() => setShowMigrate(false)} />}
                </>
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

const BridgeTabContainer = styled(Flex)`
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 16px;
    `}
`
