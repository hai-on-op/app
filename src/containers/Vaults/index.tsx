import { useState } from 'react'
import { type RouteComponentProps, useHistory } from 'react-router-dom'

import { VaultAction } from '~/utils'
import { useStoreState } from '~/store'
import { VaultProvider } from '~/providers/VaultProvider'
import { useVaultRouting } from '~/hooks'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { Caret } from '~/components/Icons/Caret'
import { ManageVault } from './Manage'
import { VaultsList } from './VaultsList'

export function Vaults(props: RouteComponentProps<{ address?: string }>) {
    const history = useHistory()

    const { vaultModel: { singleVault } } = useStoreState(state => state)

    const { address = '' } = props.match.params
    const { action, setAction } = useVaultRouting(address)

    const [navIndex, setNavIndex] = useState(0)

    return (
        <VaultProvider
            action={action}
            setAction={setAction}>
            {action === VaultAction.CREATE || singleVault
                ? (
                    <ManageVault headerContent={(
                        <BackButton onClick={() => history.push(`/vaults`)}>
                            <Caret direction="left"/>
                            <Text>
                                Back to {navIndex === 0 ? 'Available': 'My'} Vaults
                            </Text>
                        </BackButton>
                    )}/>
                )
                : (
                    <VaultsList
                        navIndex={navIndex}
                        setNavIndex={setNavIndex}
                    />
                )
            }
        </VaultProvider>
    )
}

const BackButton = styled(HaiButton)`
    height: 48px;
`
