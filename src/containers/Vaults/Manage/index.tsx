import { useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

import type { ReactChildren } from '~/types'
import { MinterChainId } from '~/types/minterProtocol'
import { VaultAction } from '~/utils'
import { isAeroV2Route } from '~/services/aeroV2/navigation'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery, useVaultById } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
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
import { AeroV2Panel } from './Minter/AeroV2Panel'
import { ManageDropdown } from './ManageDropdown'
import { NavContainer } from '~/components/NavContainer'
import { ActivityTable } from '../VaultById/ActivityTable'

type ManageVaultProps = {
    headerContent?: ReactChildren
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const { action, vault, updateForm } = useVault()
    const history = useHistory()
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    const requestedTab = params.get('tab')

    const collateralName =
        location.pathname === '/haiAERO'
            ? 'HAIAERO'
            : location.pathname === '/haiVELO'
            ? 'HAIVELOV2'
            : params.get('collateral') || vault?.collateralName
    const isHAIVELO = collateralName === 'HAIVELOV2'
    const isHAIVELO_V1 = collateralName === 'HAIVELO'
    const isHAIAERO = collateralName === 'HAIAERO'

    const isMinterProtocol = isHAIVELO || isHAIAERO
    const supportsAeroV2 = isMinterProtocol || isHAIVELO_V1

    const { vault: vaultWithActivity } = useVaultById(vault?.id || '')

    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')
    const [showMigrate, setShowMigrate] = useState(false)

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    const hasMatchingVault =
        vault &&
        ((isHAIVELO && (vault.collateralName === 'HAIVELOV2' || vault.collateralName === 'HAIVELO')) ||
            (isHAIAERO && vault.collateralName === 'HAIAERO') ||
            !isMinterProtocol)
    const isCreateFlow = action === VaultAction.CREATE || !hasMatchingVault
    const tabs = [
        ...(supportsAeroV2 ? [{ id: 'aero-v2', label: isHAIAERO ? 'haiAERO v2' : 'Migrate to haiAERO v2' }] : []),
        ...(isMinterProtocol ? [{ id: 'legacy-mint', label: isHAIAERO ? 'Mint haiAERO v1' : 'Mint haiVELO' }] : []),
        ...(isHAIAERO ? [{ id: 'legacy-bridge', label: 'Bridge haiAERO v1' }] : []),
        {
            id: 'manage',
            label: supportsAeroV2
                ? isCreateFlow
                    ? 'Create legacy vault'
                    : 'Manage legacy vault'
                : isCreateFlow
                ? 'Create Vault'
                : 'Manage',
        },
        ...(!isCreateFlow ? [{ id: 'activity', label: 'Activity' }] : []),
    ]
    // Stable tab IDs keep wallet/vault loading and browser navigation from changing the selected action.
    const defaultTab =
        isHAIAERO && location.pathname === '/haiAERO'
            ? 'aero-v2'
            : isMinterProtocol && isCreateFlow
            ? 'legacy-mint'
            : 'manage'
    const selectedTab =
        supportsAeroV2 && isAeroV2Route(location.pathname, location.search)
            ? 'aero-v2'
            : tabs.some(({ id }) => id === requestedTab)
            ? requestedTab!
            : requestedTab === 'activity'
            ? 'manage'
            : defaultTab
    const isAeroV2Tab = selectedTab === 'aero-v2'
    const requestedMode = params.get('mode')
    const initialMode =
        requestedMode === 'mint' || requestedMode === 'migrate' || requestedMode === 'bridge'
            ? requestedMode
            : isHAIVELO || isHAIVELO_V1
            ? 'migrate'
            : 'mint'
    const initialSource = isHAIVELO_V1 ? 'haiVeloV1' : isHAIVELO ? 'haiVeloV2' : 'haiAeroV1'

    const selectTab = (index: number) => {
        const search = new URLSearchParams(location.search)
        search.set('tab', tabs[index].id)
        search.delete('mode')
        history.push({ ...location, search: search.toString() })
    }

    // Determine content to show based on current tab and vault type
    const renderTabContent = () => {
        const isCreateMode = isCreateFlow

        if (isAeroV2Tab) {
            return (
                <AeroV2Panel
                    key={`${initialMode}:${initialSource}`}
                    initialMode={initialMode}
                    initialSource={initialSource}
                    onLegacyBridge={() => history.push('/haiAERO?tab=legacy-bridge')}
                />
            )
        }

        // haiVELO tabs: [Mint, Manage/Create, Activity?]
        if (isHAIVELO && selectedTab === 'legacy-mint') {
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
        if (isHAIAERO && selectedTab === 'legacy-mint') {
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

        if (isHAIAERO && selectedTab === 'legacy-bridge') {
            return (
                <BridgeTabContainer>
                    <BridgeTab initialDirection={requestedTab === 'legacy-bridge' ? 'base-to-optimism' : undefined} />
                    <MigrationNextStep>
                        <Text $fontSize="0.85em">
                            This bridge moves haiAERO v1. Once your tokens arrive on Optimism, you can migrate them to
                            haiAERO v2.
                        </Text>
                        <HaiButton onClick={() => history.push('/haiAERO?tab=aero-v2&mode=migrate')}>
                            Continue to migration
                        </HaiButton>
                    </MigrationNextStep>
                </BridgeTabContainer>
            )
        }

        if (selectedTab === 'manage') {
            return (
                <ProxyPrompt
                    targetNetworkName="Optimism"
                    continueText={isCreateMode ? 'create a vault' : 'manage your vault'}
                >
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
            navItems={tabs.map(({ label }) => label)}
            selected={tabs.findIndex(({ id }) => id === selectedTab)}
            onSelect={selectTab}
            stackHeader
            scrollTabs={supportsAeroV2}
            headerContent={
                headerContent || (!isAeroV2Tab && selectedTab !== 'legacy-bridge') ? (
                    <>
                        <Header $removePadding={isCreateFlow}>
                            <Flex $align="center" $gap={8}>
                                {headerContent}
                                {isHAIVELO_V1 && !isAeroV2Tab && (
                                    <HaiButton $variant="yellowish" onClick={() => setShowMigrate(true)}>
                                        Migrate to haiVELO v2
                                    </HaiButton>
                                )}
                            </Flex>
                            {!isAeroV2Tab && selectedTab !== 'legacy-bridge' && (
                                <CenteredFlex $gap={12}>
                                    {isMinterProtocol ? (
                                        <RewardsTokenArray tokens={['HAI']} hideLabel={isUpToExtraSmall} />
                                    ) : null}
                                    <ManageDropdown $width={isUpToSmall ? '100%' : undefined} />
                                </CenteredFlex>
                            )}
                        </Header>
                        {showMigrate && <MigrateHaiVeloV2Modal onClose={() => setShowMigrate(false)} />}
                    </>
                ) : undefined
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
    flex-direction: column;
    gap: 20px;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 16px;
    `}
`

const MigrationNextStep = styled(Flex)`
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    width: 100%;
    padding: 24px;
    border: ${({ theme }) => theme.border.thin};
    border-radius: 16px;
    line-height: 1.5;

    button {
        white-space: normal;
    }
`
