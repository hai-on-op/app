import { useEffect, useState } from 'react'
import { type RouteComponentProps } from 'react-router-dom'
import { useAccount } from 'wagmi'

import { useStoreActions, useStoreState } from '~/store'
import { useEthersSigner, useGeb } from '~/hooks'
import { type ISafe, isAddress } from '~/utils'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { ManageVault } from './ManageVault'
import { VaultsList } from './VaultsList'
import { Caret } from '~/components/Icons/Caret'

export function Vaults(props: RouteComponentProps<{ address?: string }>) {
    const { address: account } = useAccount()
    const signer = useEthersSigner()
    const geb = useGeb()

    const { tokensData, isWrongNetwork } = useStoreState(state => state.connectWalletModel)
    const { safeModel: safeActions } = useStoreActions(actions => actions)

    const { address = '' } = props.match.params

    useEffect(() => {
        if (
            (!account && !address)
            || (address && !isAddress(address.toLowerCase()))
            || !signer
            || isWrongNetwork
        ) return

        async function fetchSafes() {
            await safeActions.fetchUserSafes({
                address: address || (account as string),
                geb,
                tokensData,
            })
        }
        fetchSafes()
        
        const interval = setInterval(() => {
            if (
                (!account && !address)
                || (address && !isAddress(address.toLowerCase()))
                || !signer
                || isWrongNetwork
            ) fetchSafes()
        }, 3000)

        return () => clearInterval(interval)
    }, [account, address, isWrongNetwork, tokensData, geb, signer, safeActions])

    const [navIndex, setNavIndex] = useState(0)
    const [activeVault, setActiveVault] = useState<ISafe>()

    if (activeVault) return (
        <ManageVault
            vault={activeVault}
            headerContent={(
                <BackButton onClick={() => setActiveVault(undefined)}>
                    <Caret direction="left"/>
                    <Text>
                        Back to {navIndex === 0 ? 'All': 'My'} Vaults
                    </Text>
                </BackButton>
            )}
        />
    )

    return (
        <VaultsList
            setActiveVault={setActiveVault}
            navIndex={navIndex}
            setNavIndex={setNavIndex}
        />
    )
}

const BackButton = styled(HaiButton)`
    height: 48px;
`