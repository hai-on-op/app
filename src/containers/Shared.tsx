import { useEffect, useCallback, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { utils } from 'ethers'
import { useAccount, useNetwork } from 'wagmi'
import { getTokenList } from '@hai-on-op/sdk'

import type { ReactChildren } from '~/types'
import {
    EMPTY_ADDRESS,
    NETWORK_ID,
    // SYSTEM_STATUS,
    ActionState,
    blockedAddresses,
    getNetworkName,
    isAddress,
    timeout,
} from '~/utils'
import { TransactionUpdater } from '~/services/TransactionUpdater'
import { useStoreState, useStoreActions } from '~/store'
// import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useTokenContract, useEthersSigner, useGeb, usePrevious, usePublicGeb } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex } from '~/styles'
import { ImagePreloader } from '~/components/ImagePreloader'
import { BlockedAddress } from '~/components/BlockedAddress'
import { ParallaxBackground } from '~/components/ParallaxBackground'
import { Header } from './Header'
import { WaitingModal } from '~/components/Modal/WaitingModal'
import { ClaimModal } from '~/components/Modal/ClaimModal'
import { IntentionHeader } from '~/components/IntentionHeader'
import { HaiAlert } from '~/components/HaiAlert'
import { StartAuction } from './Auctions/StartAuction'

type Props = {
    children: ReactChildren
}
export function Shared({ children }: Props) {
    const { address: account } = useAccount()
    const previousAccount = usePrevious(account)
    const { chain } = useNetwork()
    const networkName = getNetworkName(NETWORK_ID)
    const signer = useEthersSigner()
    const publicGeb = usePublicGeb()
    const geb = useGeb()

    const history = useHistory()
    const location = useLocation()
    const isSplash = location.pathname === '/'

    const tokenList = getTokenList(networkName)
    const coinTokenContract = useTokenContract(tokenList.HAI?.address)
    const protTokenContract = useTokenContract(tokenList.KITE?.address)

    const {
        connectWalletModel: connectWalletState,
        auctionModel: { auctionsData },
    } = useStoreState((state) => state)

    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        transactionsModel: transactionsActions,
        vaultModel: vaultActions,
        auctionModel: { setCoinBalances, setProtInternalBalance, setInternalBalance },
    } = useStoreActions((actions) => actions)

    const resetModals = useCallback(() => {
        popupsActions.setIsClaimPopupOpen(false)
        popupsActions.setIsWaitingModalOpen(false)
    }, [popupsActions])

    useEffect(() => {
        if (!account || !geb || !connectWalletState?.forceUpdateTokens) return

        connectWalletActions.fetchTokenData({ geb, user: account })
    }, [account, geb, connectWalletState?.forceUpdateTokens, connectWalletActions])

    useEffect(() => {
        if (!connectWalletState || !signer) return

        signer.getBalance().then((balance) => {
            connectWalletActions.updateEthBalance({
                chainId: NETWORK_ID,
                balance: Number(utils.formatEther(balance)),
            })
        })
    }, [account, signer, connectWalletState, connectWalletActions])

    useEffect(() => {
        if (!connectWalletState) return
        const { HAI, KITE } = connectWalletState.tokensFetchedData

        if (!HAI?.balanceE18 || !KITE?.balanceE18) return

        setCoinBalances({
            hai: utils.formatEther(HAI.balanceE18),
            kite: utils.formatEther(KITE.balanceE18),
        })
    }, [connectWalletState, setCoinBalances])

    useEffect(() => {
        if (!account || !coinTokenContract || !protTokenContract || !connectWalletState.proxyAddress) return

        protTokenContract.allowance(account, connectWalletState.proxyAddress).then((allowance) => {
            const formattedAllowance = utils.formatEther(allowance)
            connectWalletActions.setProtAllowance(formattedAllowance)
        })

        coinTokenContract.allowance(account, connectWalletState.proxyAddress).then((allowance) => {
            const formattedAllowance = utils.formatEther(allowance)
            connectWalletActions.setCoinAllowance(formattedAllowance)
        })
    }, [account, coinTokenContract, connectWalletState.proxyAddress, connectWalletActions, protTokenContract])

    useEffect(() => {
        if (!auctionsData) return

        const protInternalBalance = auctionsData.protocolTokenProxyBalance
        setProtInternalBalance(utils.formatEther(protInternalBalance))

        // coinTokenSafeBalance has 45 decimals
        const coinVaultBalance = auctionsData.coinTokenSafeBalance

        // const coinInternalBalance = coinBalance.add(coinVaultBalance)
        setInternalBalance(utils.formatUnits(coinVaultBalance, 45))
    }, [auctionsData, setInternalBalance, setProtInternalBalance])

    useEffect(() => {
        connectWalletActions.setTokensData(publicGeb?.tokenList)
    }, [publicGeb?.tokenList, connectWalletActions, chain?.id])

    useEffect(() => {
        connectWalletActions.fetchFiatPrice()
    }, [connectWalletActions])

    useEffect(() => {
        if (!publicGeb) return

        vaultActions.fetchLiquidationData({
            geb: publicGeb,
            tokensData: publicGeb.tokenList,
        })
    }, [vaultActions, publicGeb])

    const accountChecker = useCallback(async () => {
        if (!account || !chain?.id || !signer || !geb) {
            popupsActions.setIsInitializing(false)
            return
        }

        popupsActions.setWaitingPayload({
            title: '',
            status: ActionState.LOADING,
        })
        popupsActions.setIsInitializing(true)
        try {
            connectWalletActions.setProxyAddress('')
            const userProxy = await geb.getProxyAction(account)
            if (userProxy?.proxyAddress && userProxy.proxyAddress !== EMPTY_ADDRESS) {
                connectWalletActions.setProxyAddress(userProxy.proxyAddress)
            }
            const txs = localStorage.getItem(`${account}-${NETWORK_ID}`)
            if (txs) {
                transactionsActions.setTransactions(JSON.parse(txs))
            }
            await timeout(200)
            if (!connectWalletState.ctHash) {
                connectWalletActions.setStep(2)
                const { pathname } = window.location

                let address = ''
                if (pathname && pathname !== '/' && pathname !== '/vaults') {
                    const route = pathname.split('/')[1]
                    if (isAddress(route)) {
                        address = route.toLowerCase()
                    }
                }
                await vaultActions.fetchUserVaults({
                    address: address ? address : (account as string),
                    geb,
                    tokensData: geb.tokenList,
                    chainId: NETWORK_ID,
                })
            }
        } catch (error: any) {
            console.error(error)
            connectWalletActions.setStep(1)
            popupsActions.setIsInitializing(false)
        } finally {
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({
                title: '',
                status: ActionState.NONE,
            })
        }

        await timeout(500)
        popupsActions.setIsInitializing(false)
    }, [account, chain?.id, signer, geb, connectWalletActions, popupsActions, vaultActions, transactionsActions])

    const accountChange = useCallback(() => {
        resetModals()
        const isAccountSwitched = account && previousAccount && account !== previousAccount
        if (!account) {
            connectWalletActions.setStep(0)
        }
        if (isAccountSwitched) {
            history.push('/')
        }
        transactionsActions.setTransactions({})
    }, [account, previousAccount, history, connectWalletActions, vaultActions, transactionsActions])

    const networkChecker = useCallback(() => {
        accountChange()
        if (chain?.id !== NETWORK_ID) {
            popupsActions.setIsInitializing(false)
            connectWalletActions.setIsWrongNetwork(true)
        } else {
            connectWalletActions.setIsWrongNetwork(false)
            if (account) {
                connectWalletActions.setStep(1)
                accountChecker()
            } else {
                popupsActions.setIsInitializing(false)
            }
        }
    }, [accountChange, accountChecker, account, chain?.id, geb, connectWalletActions, popupsActions])

    useEffect(() => {
        networkChecker()
    }, [networkChecker])

    // const {
    //     data: { priceDiff },
    // } = useAnalytics()
    // const haiAlertActive = useMemo(() => {
    //     // TODO: determine diff threshold
    //     return priceDiff > 0
    // }, [priceDiff])
    const [haiAlertActive, setHaiAlertActive] = useState(true)

    return (
        <Container>
            <TransactionUpdater />

            <Background aria-hidden="true">
                {isSplash && (
                    <video
                        src="/assets/tie-dye-reduced.mov"
                        width={1920}
                        height={1072}
                        muted
                        autoPlay
                        playsInline
                        loop
                    />
                )}
            </Background>
            {!isSplash && <ParallaxBackground />}
            <Header tickerActive={!isSplash} />
            <ClaimModal />
            {!isSplash && <WaitingModal />}

            {/* {SYSTEM_STATUS && SYSTEM_STATUS.toLowerCase() === 'shutdown' && (
                <AlertContainer>
                    <AlertLabel
                        type="danger"
                        text={t('shutdown_text')}
                    />
                </AlertContainer>
            )} */}
            {account && blockedAddresses.includes(account.toLowerCase()) ? (
                <BlockedAddress />
            ) : (
                <Content
                    $padTop={!isSplash}
                    $padBottom={!isSplash ? (haiAlertActive ? '240px' : '168px') : undefined}
                    $maxWidth={!isSplash ? 'min(1200px, calc(100vw - 48px))' : undefined}
                >
                    <IntentionHeader>{location.pathname === '/auctions' && <StartAuction />}</IntentionHeader>
                    {children}
                </Content>
            )}
            {!isSplash && <HaiAlert active={haiAlertActive} setActive={setHaiAlertActive} />}
            <ImagePreloader />
        </Container>
    )
}

const Container = styled.div`
    max-height: 100vh;
    overflow: hidden auto;
`

const Background = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    background-color: white;
    background-image: url('/assets/tie-dye.jpg');
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    pointer-events: none;

    & video {
        min-width: 100%;
        min-height: 100%;
        object-fit: cover;
        opacity: 0.5;
    }

    z-index: 0;
`

const Content = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'flex-start',
    $align: 'center',
    $gap: 48,
    ...props,
}))<{
    $padTop?: boolean
    $padBottom?: string
    $maxWidth?: string
}>`
    padding: 0 48px;
    padding-bottom: ${({ $padBottom = '0px' }) => $padBottom};
    margin-top: ${({ $padTop = false }) => ($padTop ? '240px' : '0px')};

    & > * {
        max-width: ${({ $maxWidth = 'auto' }) => $maxWidth};
    }

    ${({ theme, $padTop = false, $padBottom = '0px' }) => theme.mediaWidth.upToSmall`
        padding: 0 24px;
        padding-bottom: ${$padBottom};
        margin-top: ${$padTop ? '152px' : '0px'};
    `}
`
