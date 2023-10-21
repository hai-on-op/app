import { useEffect } from 'react'
import styled from 'styled-components'
import { useEthersSigner } from '~/hooks/useEthersAdapters'
import { useAccount } from 'wagmi'

import { useStoreState, useStoreActions } from '@/store'
import { useGeb } from '~/hooks'
import Accounts from './Accounts'
import SafeList from './SafeList'
import { isAddress } from '~/utils'

const OnBoarding = ({ ...props }) => {
    const { address: account } = useAccount()
    const signer = useEthersSigner()
    const geb = useGeb()

    const {
        connectWalletModel: connectWalletState,
        safeModel: safeState,
        popupsModel: popupsState,
    } = useStoreState((state) => state)
    const { safeModel: safeActions } = useStoreActions((state) => state)

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
    }, [account, address, connectWalletState.isWrongNetwork, connectWalletState.tokensData, geb, signer, safeActions])

    return (
        <Container id="app-page">
            <Content>
                {safeState.safeCreated ? (
                    <SafeList address={address} />
                ) : popupsState.isWaitingModalOpen ? null : (
                    <Accounts />
                )}
            </Content>
        </Container>
    )
}

export default OnBoarding

const Container = styled.div``

const Content = styled.div`
    position: relative;
`