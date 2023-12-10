import { useEffect, useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ethers, utils } from 'ethers'
import { useAccount, useNetwork } from 'wagmi'
import { getTokenList } from '@hai-on-op/sdk'

import type { ReactChildren } from '~/types'
import {
    ETHERSCAN_PREFIXES,
    blockedAddresses,
    capitalizeName,
    EMPTY_ADDRESS,
    SYSTEM_STATUS,
    timeout,
    ChainId,
    isAddress,
    getNetworkName,
    NETWORK_ID,
} from '~/utils'
// import ApplicationUpdater from '~/services/ApplicationUpdater'
// import MulticallUpdater from '~/services/MulticallUpdater'
// import BalanceUpdater from '~/services/BalanceUpdater'
import TransactionUpdater from '~/services/TransactionUpdater'
import { useStoreState, useStoreActions } from '~/store'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useTokenContract, useEthersSigner, useGeb, usePlaylist, usePrevious } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex } from '~/styles'
import ImagePreloader from '~/components/ImagePreloader'
import LiquidateSafeModal from '~/components/Modals/LiquidateSafeModal'
// import ProxyModal from '~/components/Modals/ProxyModal'
// import WalletModal from '~/components/WalletModal'
import AuctionsModal from '~/components/Modals/AuctionsModal'
import TopUpModal from '~/components/Modals/SafeManagerModal'
import ScreenLoader from '~/components/Modals/ScreenLoader'
import WaitingModal from '~/components/Modals/WaitingModal'
import LoadingModal from '~/components/Modals/LoadingModal'
import WethModal from '~/components/Modals/WETHModal'
import BlockedAddress from '~/components/BlockedAddress'
import ToastPayload from '~/components/ToastPayload'
import AlertLabel from '~/components/AlertLabel'
import { IntentionHeader } from '~/components/IntentionHeader'
import { ParallaxBackground } from '~/components/ParallaxBackground'
import { HaiAlert } from '~/components/HaiAlert'
import { Header } from './Header'
import { EarnStats } from './Earn/Stats'
import { BorrowStats } from './Vaults/Stats'
import { AuctionStats } from './Auctions/Stats'

const playlist = [
    '/audio/get-hai-together.wav',
    '/audio/hai-as-fuck.wav',
]

const toastId = 'networdToastHash'
const successAccountConnection = 'successAccountConnection'

type Props = {
    children: ReactChildren,
}
const Shared = ({ children }: Props) => {
    const { t } = useTranslation()
    const { chain } = useNetwork()
    const chainId = chain?.id || NETWORK_ID
    const { address: account } = useAccount()
    const signer = useEthersSigner()
    const geb = useGeb()
    const history = useHistory()

    const previousAccount = usePrevious(account)

    const location = useLocation()
    const isSplash = location.pathname === '/'
    const isEarn = location.pathname === '/earn'
    const isVaults = location.pathname === '/vaults'
    const isAuctions = location.pathname === '/auctions'
    const tokensData = geb?.tokenList
    const networkName = getNetworkName(chainId)

    const coinTokenContract = useTokenContract(getTokenList(networkName).HAI.address)
    const protTokenContract = useTokenContract(getTokenList(networkName).KITE.address)

    const {
        settingsModel: settingsState,
        connectWalletModel: connectWalletState,
        auctionModel: { auctionsData },
    } = useStoreState(state => state)

    const {
        settingsModel: settingsActions,
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        transactionsModel: transactionsActions,
        safeModel: safeActions,
        auctionModel: {
            setCoinBalances,
            setProtInternalBalance,
            setInternalBalance,
        },
    } = useStoreActions(actions => actions)

    const resetModals = useCallback(() => {
        popupsActions.setIsConnectedWalletModalOpen(false)
        popupsActions.setIsConnectModalOpen(false)
        popupsActions.setIsConnectorsWalletOpen(false)
        popupsActions.setIsScreenModalOpen(false)
        popupsActions.setIsSettingModalOpen(false)
        popupsActions.setIsVotingModalOpen(false)
        popupsActions.setIsWaitingModalOpen(false)
        popupsActions.setShowSideMenu(false)
        popupsActions.setIsLoadingModalOpen({
            text: '',
            isOpen: false,
        })
    }, [popupsActions])

    const { forceUpdateTokens } = connectWalletState

    useEffect(() => {
        if (!account || !geb || !forceUpdateTokens) return
        
        connectWalletActions.fetchTokenData({ geb, user: account })
    }, [account, geb, forceUpdateTokens, connectWalletActions])

    useEffect(() => {
        if (!connectWalletState || !signer) return
        
        signer.getBalance().then((balance) => {
            connectWalletActions.updateEthBalance({
                chainId: chain?.id || NETWORK_ID,
                balance: Number(utils.formatEther(balance)),
            })
        })
    }, [account, signer, connectWalletState, connectWalletActions, chain?.id])

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
        setProtInternalBalance(ethers.utils.formatEther(protInternalBalance))

        // coinTokenSafeBalance has 45 decimals
        const coinSafeBalance = auctionsData.coinTokenSafeBalance

        // const coinInternalBalance = coinBalance.add(coinSafeBalance)
        setInternalBalance(ethers.utils.formatUnits(coinSafeBalance, 45))
    }, [auctionsData, setInternalBalance, setProtInternalBalance])

    useEffect(() => {
        connectWalletActions.setTokensData(tokensData)
    }, [tokensData, connectWalletActions])

    useEffect(() => {
        connectWalletActions.fetchFiatPrice()
    }, [connectWalletActions])

    const accountChecker = useCallback(async () => {
        if (!account || !chain?.id || !signer || !geb) return
        popupsActions.setWaitingPayload({
            title: '',
            status: 'loading',
        })
        popupsActions.setIsWaitingModalOpen(true)
        try {
            connectWalletActions.setProxyAddress('')
            const userProxy = await geb.getProxyAction(account)
            if (userProxy?.proxyAddress && userProxy.proxyAddress !== EMPTY_ADDRESS) {
                connectWalletActions.setProxyAddress(userProxy.proxyAddress)
            }
            const txs = localStorage.getItem(`${account}-${chain.id}`)
            if (txs) {
                transactionsActions.setTransactions(JSON.parse(txs))
            }
            await timeout(200)
            if (!connectWalletState.ctHash) {
                connectWalletActions.setStep(2)
                const { pathname } = window.location

                let address = ''
                if (pathname && pathname !== '/' && pathname !== '/safes') {
                    const route = pathname.split('/')[1]
                    if (isAddress(route)) {
                        address = route.toLowerCase()
                    }
                }
                await safeActions.fetchUserSafes({
                    address: address ? address : (account as string),
                    geb,
                    tokensData,
                    chainId,
                })
            }
        } catch(error: any) {
            safeActions.setIsSafeCreated(false)
            connectWalletActions.setStep(1)
        }

        await timeout(500)
        popupsActions.setIsWaitingModalOpen(false)
    }, [
        account, chain?.id, signer, geb,
        connectWalletActions, popupsActions, safeActions, transactionsActions,
    ])

    const accountChange = useCallback(() => {
        resetModals()
        const isAccountSwitched = account && previousAccount && account !== previousAccount
        if (!account) {
            connectWalletActions.setStep(0)
            safeActions.setIsSafeCreated(false)
        }
        if (isAccountSwitched) {
            history.push('/')
        }
        transactionsActions.setTransactions({})
    }, [account, previousAccount, history, connectWalletActions, safeActions, transactionsActions])

    const networkChecker = useCallback(() => {
        accountChange()
        const id: ChainId = chainId
        popupsActions.setIsSafeManagerOpen(false)
        if (chain?.id !== id) {
            const chainName = ETHERSCAN_PREFIXES[id]
            connectWalletActions.setIsWrongNetwork(true)
            // settingsActions.setBlockBody(true)
            toast(
                <ToastPayload
                    icon="AlertTriangle"
                    iconSize={40}
                    iconColor="orange"
                    textColor="#272727"
                    text={`
                        ${t('wrong_network')} ${capitalizeName(chainName === '' ? 'Mainnet' : chainName)}
                    `}
                />,
                {
                    autoClose: false,
                    type: 'warning',
                    toastId,
                }
            )
        } else {
            toast.update(toastId, { autoClose: 1 })
            settingsActions.setBlockBody(false)
            connectWalletActions.setIsWrongNetwork(false)
            if (account) {
                toast(
                    <ToastPayload
                        icon="Check"
                        iconColor="green"
                        text={t('wallet_connected')}
                    />,
                    {
                        type: 'success',
                        toastId: successAccountConnection,
                    }
                )
                connectWalletActions.setStep(1)
                accountChecker()
            }
        }
    }, [
        accountChange, accountChecker, account, chainId, chain?.id, geb,
        connectWalletActions, popupsActions, settingsActions,
    ])

    useEffect(() => {
        networkChecker()
    }, [networkChecker])

    const { play, pause } = usePlaylist(playlist, 0.2)

    useEffect(() => {
        if (settingsState.isPlayingMusic) play()
        else pause()
    }, [settingsState.isPlayingMusic, play, pause])

    const { data: { priceDiff } } = useAnalytics()
    const haiAlertActive = useMemo(() => {
        // TODO: determine diff threshold
        return priceDiff > 0
    }, [priceDiff])

    return (
        <Container>
            <Background>
                <video
                    src="/assets/tie-dye-reduced.mov"
                    width={1920}
                    height={1072}
                    muted
                    autoPlay
                    playsInline
                    loop
                />
            </Background>
            <Header tickerActive={!isSplash}/>
            {settingsState.blockBody && <BlockBodyContainer/>}
            {/* <WalletModal /> */}
            {/* <MulticallUpdater /> */}
            {/* <ApplicationUpdater /> */}
            {/* <BalanceUpdater /> */}
            {/* <ProxyModal /> */}
            {/* <ConnectedWalletModal /> */}
            <TransactionUpdater />
            <LoadingModal />
            <AuctionsModal />
            <WethModal />
            <ScreenLoader />
            <LiquidateSafeModal />
            {!isSplash && <WaitingModal />}
            <TopUpModal />

            {!isSplash && <ParallaxBackground/>}

            {SYSTEM_STATUS && SYSTEM_STATUS.toLowerCase() === 'shutdown' && (
                <AlertContainer>
                    <AlertLabel
                        type="danger"
                        text={t('shutdown_text')}
                    />
                </AlertContainer>
            )}
            {account && blockedAddresses.includes(account.toLowerCase())
                ? <BlockedAddress />
                : (
                    <Content
                        $padTop={!isSplash}
                        $padBottom={!isSplash && haiAlertActive}
                        $maxWidth={!isSplash ? 'min(1200px, calc(100vw - 96px))': undefined}>
                        {(isEarn || isVaults || isAuctions) && (
                            <IntentionHeader
                                type={isEarn
                                    ? 'earn'
                                    : isVaults
                                        ? 'borrow'
                                        : 'auctions'
                                }
                                setType={(type: string) => {
                                    history.push(`/${type === 'borrow' ? 'vaults': type}`)
                                }}>
                                {isEarn
                                    ? <EarnStats/>
                                    : isVaults
                                        ? <BorrowStats/>
                                        : isAuctions
                                            ? <AuctionStats/>
                                            : null
                                }
                            </IntentionHeader>
                        )}
                        {children}
                    </Content>
                )
            }
            {!isSplash && haiAlertActive && <HaiAlert/>}
            <ImagePreloader />
        </Container>
    )
}

export default Shared

const Container = styled.div`
    min-height: 100vh;
`

const BlockBodyContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 1000;
    background-color: rgba(35, 37, 39, 0.75);
    -webkit-tap-highlight-color: transparent;
`

const Background = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    background-color: white;

    & video {
        min-width: 100%;
        min-height: 100%;
        object-fit: cover;
        opacity: 0.5;
    }

    z-index: 0;
`

const Content = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'flex-start',
    $align: 'center',
    $gap: 48,
    ...props,
}))<{ $padTop?: boolean, $padBottom?: boolean, $maxWidth?: string }>`
    padding: 0 48px;
    ${({ $padBottom = false }) => $padBottom && css`padding-bottom: 120px;`}
    margin-top: ${({ $padTop = false }) => $padTop ? '240px': '0px'};

    & > * {
        max-width: ${({ $maxWidth = 'auto' }) => $maxWidth};
    }

    ${({ theme, $padTop = false }) => theme.mediaWidth.upToSmall`
        padding: 0 24px;
        margin-top: ${$padTop ? '200px': '0px'};
    `}
`

const AlertContainer = styled.div`
    padding: 0 20px;
`
