import { useEffect } from 'react'
import { useAccount, useNetwork } from 'wagmi'

import { DEFAULT_NETWORK_ID, isAddress } from '~/utils'
import { useStoreState, useStoreActions } from '~/store'
import { useEthersSigner, useGeb } from '~/hooks'

import styled from 'styled-components'
import Accounts from './Accounts'
import SafeList from './SafeList'

const OnBoarding = ({ ...props }) => {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()

    const {
        connectWalletModel: connectWalletState,
        safeModel: safeState,
        popupsModel: popupsState,
    } = useStoreState(state => state)
    const { safeModel: safeActions } = useStoreActions(actions => actions)

    const address: string = props.match.params.address ?? ''

    useEffect(() => {
        if (
            (!account && !address) ||
            (address && !isAddress(address.toLowerCase())) ||
            !signer ||
            connectWalletState.isWrongNetwork
        )
            return

        async function fetchSafes() {
            await safeActions.fetchUserSafes({
                address: address || (account as string),
                geb,
                tokensData: connectWalletState.tokensData,
                chainId: chain?.id || DEFAULT_NETWORK_ID,
            })
        }
        fetchSafes()
        const ms = 3000
        const interval = setInterval(() => {
            if (
                (!account && !address) ||
                (address && !isAddress(address.toLowerCase())) ||
                !signer ||
                connectWalletState.isWrongNetwork
            )
                fetchSafes()
        }, ms)

        return () => clearInterval(interval)
    }, [account, address, connectWalletState.isWrongNetwork, connectWalletState.tokensData, geb, signer, safeActions, chain?.id])

    return (
        <Container id="app-page">
            <Content>
                {safeState.safeCreated
                    ? <SafeList address={address} />
                    : !popupsState.isWaitingModalOpen
                        ? <Accounts />
                        : null
                }
            </Content>
        </Container>
    )
}

export default OnBoarding

const Container = styled.div``

const Content = styled.div`
    position: relative;
`
