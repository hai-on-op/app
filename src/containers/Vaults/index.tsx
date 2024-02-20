import { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'

import { VaultAction } from '~/utils'
import { useStoreState } from '~/store'
import { VaultProvider } from '~/providers/VaultProvider'
import { useVaultRouting } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, HaiButton } from '~/styles'
import { Caret } from '~/components/Icons/Caret'
import { ManageVault } from './Manage'
import { VaultsList } from './VaultsList'
import { VaultsByOwner } from './VaultsByOwner'
import { VaultById } from './VaultById'

export function Vaults() {
    const history = useHistory()
    const { idOrOwner } = useParams<{ idOrOwner?: string }>()

    const {
        vaultModel: { singleVault },
    } = useStoreState((state) => state)

    const { location, params, action, setAction } = useVaultRouting()

    const [navIndex, setNavIndex] = useState(params.get('tab') === 'user' ? 1 : 0)

    useEffect(() => {
        if (location.pathname === '/vaults') {
            history.replace({ pathname: '/vaults', search: `?tab=${navIndex === 0 ? 'available' : 'user'}` })
        }
    }, [navIndex, location.pathname, history.replace])

    if (idOrOwner) {
        if (idOrOwner.startsWith('0x')) return <VaultsByOwner />
        return <VaultById id={idOrOwner} />
    }

    return (
        <VaultProvider action={action} setAction={setAction}>
            {action === VaultAction.CREATE || singleVault ? (
                <ManageVault
                    headerContent={
                        <BackButton onClick={() => history.push(`/vaults`)}>
                            <Caret direction="left" />
                            <CenteredFlex $width="100%">
                                Back to {navIndex === 0 ? 'Available' : 'My'} Vaults
                            </CenteredFlex>
                        </BackButton>
                    }
                />
            ) : (
                <VaultsList navIndex={navIndex} setNavIndex={setNavIndex} />
            )}
        </VaultProvider>
    )
}

const BackButton = styled(HaiButton)`
    height: 48px;
`
