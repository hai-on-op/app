import { useEffect, useState } from 'react'

import type { ReactChildren } from '~/types'
import { MinterChainId } from '~/types/minterProtocol'
import { VaultAction } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useStoreState } from '~/store'
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
    const { action, vault, collateral, updateForm } = useVault()
    const { isOpenableCollateral } = useAnalytics()
    const tokensData = useStoreState(({ connectWalletModel }) => connectWalletModel.tokensData)

    const symbol =
        window.location.pathname === '/haiVELO'
            ? 'HAIVELOV2'
            : window.location.pathname === '/haiAERO'
            ? 'HAIAERO'
            : collateral.name
    const isHAIVELO = symbol === 'HAIVELOV2'
    const isHAIVELO_V1 = symbol === 'HAIVELO'
    const isHAIAERO = symbol === 'HAIAERO'
    const isMinterProtocol = isHAIVELO || isHAIAERO

    const { vault: vaultWithActivity } = useVaultById(vault?.id || '')

    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')
    const [showMigrate, setShowMigrate] = useState(false)

    // A draft and its open review belong to the selected vault or new collateral.
    const formKey = vault?.id ?? symbol
    useEffect(() => () => updateForm('clear'), [updateForm, formKey])

    const [selectedTab, setSelectedTab] = useState<string>()
    const isCreateFlow = action === VaultAction.CREATE || vault?.collateralName !== symbol
    const canOpen = tokensData[symbol]?.isCollateral && isOpenableCollateral(symbol)
    const navItems = [
        ...(isHAIVELO ? ['Mint haiVELO'] : isHAIAERO ? ['Mint haiAERO', 'Bridge haiAERO'] : []),
        ...(isCreateFlow ? (isMinterProtocol && canOpen ? ['Create Vault'] : []) : ['Manage', 'Activity']),
    ]
    const tab = selectedTab && navItems.includes(selectedTab) ? selectedTab : isCreateFlow ? navItems[0] : 'Manage'

    const renderTabContent = () => {
        if (tab === 'Mint haiVELO') {
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
        if (tab === 'Mint haiAERO') {
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

        if (tab === 'Bridge haiAERO') {
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

        if (tab === 'Manage' || tab === 'Create Vault' || (!isMinterProtocol && isCreateFlow && canOpen)) {
            return (
                <ProxyPrompt
                    targetNetworkName="Optimism"
                    continueText={isCreateFlow ? 'create a vault' : 'manage your vault'}
                >
                    <BodyGrid>
                        <Overview isHAIVELO={isMinterProtocol} />
                        <VaultActions key={formKey} />
                    </BodyGrid>
                </ProxyPrompt>
            )
        }

        return tab === 'Activity' ? <ActivityTable vault={vaultWithActivity} /> : null
    }

    return (
        <NavContainer
            navItems={navItems}
            selected={navItems.indexOf(tab)}
            onSelect={(index) => setSelectedTab(navItems[index])}
            stackHeader
            headerContent={
                <>
                    <Header $removePadding={isCreateFlow}>
                        <Flex $align="center" $gap={8}>
                            {headerContent}
                            {isHAIVELO_V1 && (
                                <HaiButton $variant="yellowish" onClick={() => setShowMigrate(true)}>
                                    Migrate to haiVELO v2
                                </HaiButton>
                            )}
                        </Flex>
                        <CenteredFlex $gap={12}>
                            {isMinterProtocol ? (
                                <RewardsTokenArray tokens={['HAI']} hideLabel={isUpToExtraSmall} />
                            ) : null}
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
