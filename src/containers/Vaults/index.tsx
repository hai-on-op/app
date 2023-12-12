import { useEffect, useState } from 'react'
import { type RouteComponentProps } from 'react-router-dom'
import { useAccount, useNetwork } from 'wagmi'

import { DEFAULT_NETWORK_ID, VaultAction, isAddress } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { VaultProvider } from '~/providers/VaultProvider'
import { useEthersSigner, useGeb } from '~/hooks'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { ManageVault } from './ManageVault'
import { VaultsList } from './VaultsList'
import { Caret } from '~/components/Icons/Caret'

export function Vaults(props: RouteComponentProps<{ address?: string }>) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const {
        connectWalletModel: {
            tokensData,
            isWrongNetwork,
        },
        vaultModel: { singleVault },
    } = useStoreState(state => state)
    const { vaultModel: vaultActions } = useStoreActions(actions => actions)

    const { address = '' } = props.match.params

    useEffect(() => {
        if (
            (!account && !address)
            || (address && !isAddress(address.toLowerCase()))
            || !signer
            || isWrongNetwork
        ) return

        async function fetchVaults() {
            await vaultActions.fetchUserVaults({
                address: address || (account as string),
                geb,
                tokensData,
                chainId: chain?.id || DEFAULT_NETWORK_ID,
            })
        }
        fetchVaults()
        
        const interval = setInterval(() => {
            if (
                (!account && !address)
                || (address && !isAddress(address.toLowerCase()))
                || !signer
                || isWrongNetwork
            ) fetchVaults()
        }, 3000)

        return () => clearInterval(interval)
    }, [account, address, isWrongNetwork, tokensData, geb, signer, vaultActions])

    const [navIndex, setNavIndex] = useState(0)
    const [action, setAction] = useState<VaultAction>(VaultAction.INFO)

    return (
        <VaultProvider
            action={action}
            setAction={setAction}>
            {action === VaultAction.CREATE || singleVault
                ? (
                    <ManageVault headerContent={(
                        <BackButton onClick={() => {
                            vaultActions.setSingleVault(undefined)
                            setAction(VaultAction.INFO)
                        }}>
                            <Caret direction="left"/>
                            <Text>
                                Back to {navIndex === 0 ? 'All': 'My'} Vaults
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
