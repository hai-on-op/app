import { Suspense, lazy, useEffect, useCallback, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { utils } from 'ethers'
import { useAccount, useBalance as useNativeBalance, useNetwork } from 'wagmi'

import type { ReactChildren } from '~/types'
import {
    EMPTY_ADDRESS,
    NETWORK_ID,
    // SYSTEM_STATUS,
    ActionState,
    blockedAddresses,
    timeout,
} from '~/utils'
import { TransactionUpdater } from '~/services/TransactionUpdater'
import { useStoreState, useStoreActions } from '~/store'
// import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useDocumentVisibility, useTokenContract, useEthersSigner, useGeb, usePrevious, usePublicGeb } from '~/hooks'
import { ClaimsProvider } from '~/providers/ClaimsProvider'
import { RewardsProvider } from '~/providers/RewardsProvider'
import { StakingProvider } from '~/providers/StakingProvider'
import { EarnProvider } from '~/providers/EarnProvider'
import { AprProvider } from '~/apr/AprProvider'

import styled from 'styled-components'
import { CenteredFlex, Flex } from '~/styles'
import { ImagePreloader } from '~/components/ImagePreloader'
import { BlockedAddress } from '~/components/BlockedAddress'
import { ParallaxBackground } from '~/components/ParallaxBackground'
import { Header } from './Header'
import { WaitingModal } from '~/components/Modal/WaitingModal'
import { IntentionHeader } from '~/components/IntentionHeader'
import { HaiAlert } from '~/components/HaiAlert'
import { StartAuction } from './Auctions/StartAuction'

const ClaimModal = lazy(() =>
    import('~/components/Modal/ClaimModal').then((module) => ({ default: module.ClaimModal }))
)
const StakingClaimModal = lazy(() =>
    import('~/components/Modal/StakingClaimModal').then((module) => ({ default: module.StakingClaimModal }))
)

type Props = {
    children: ReactChildren
}
export function Shared({ children }: Props) {
    const { address: account } = useAccount()
    const previousAccount = usePrevious(account)
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const publicGeb = usePublicGeb()
    const geb = useGeb()

    const history = useHistory()
    const location = useLocation()
    const isSplash = location.pathname === '/'
    const isDocumentVisible = useDocumentVisibility()
    const openCollateral = new URLSearchParams(location.search).get('collateral') || ''
    const splashVideo = useRef<HTMLVideoElement | null>(null)

    const isAuctionRoute = location.pathname.startsWith('/auctions')
    const isEarnRoute = location.pathname.startsWith('/earn')
    const preloadOwnerVaults = isEarnRoute || location.pathname === '/haiVELO' || location.pathname === '/haiAERO'
    const isStakeRoute = location.pathname.startsWith('/stake')
    const isVaultRoute = location.pathname.startsWith('/vaults')
    const isHaiVeloRoute =
        location.pathname === '/haiVELO' ||
        (location.pathname === '/vaults/open' && ['HAIVELO', 'HAIVELOV2'].includes(openCollateral))
    const isHaiAeroRoute =
        location.pathname === '/haiAERO' ||
        (location.pathname === '/vaults/open' && ['HAIAERO'].includes(openCollateral))

    const tokenList = publicGeb?.tokenList
    const coinTokenContract = useTokenContract(tokenList?.HAI?.address)
    const protTokenContract = useTokenContract(tokenList?.KITE?.address)

    const {
        connectWalletModel: connectWalletState,
        auctionModel: { auctionsData },
        popupsModel: { isClaimPopupOpen, isStakeClaimPopupOpen },
    } = useStoreState((state) => state)

    const needsProxyAllowances = isAuctionRoute || isVaultRoute
    const needsMarketData =
        isAuctionRoute ||
        isEarnRoute ||
        isStakeRoute ||
        isVaultRoute ||
        isHaiVeloRoute ||
        isHaiAeroRoute ||
        isClaimPopupOpen ||
        isStakeClaimPopupOpen

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

    const { data: nativeBalance, refetch: refreshNativeBalance } = useNativeBalance({
        address: account,
        chainId: chain?.id,
        enabled: !!account && !!chain?.id,
    })
    useEffect(() => {
        connectWalletActions.setBalanceOwner(account)
    }, [account, connectWalletActions])

    useEffect(() => {
        if (
            !account ||
            account !== connectWalletState.balanceOwner ||
            !publicGeb ||
            !connectWalletState.forceUpdateTokens
        )
            return
        const controller = new AbortController()
        connectWalletActions
            .fetchTokenData({ geb: publicGeb, user: account, signal: controller.signal })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) console.warn('Unable to refresh Optimism token balances', error)
            })
        return () => controller.abort()
    }, [
        account,
        publicGeb,
        connectWalletState.balanceOwner,
        connectWalletState.forceUpdateTokens,
        connectWalletActions,
    ])

    useEffect(() => {
        if (account && chain?.id && connectWalletState.forceUpdateTokens) void refreshNativeBalance()
    }, [account, chain?.id, connectWalletState.forceUpdateTokens, refreshNativeBalance])

    useEffect(() => {
        if (!account || !chain?.id || !nativeBalance) return
        connectWalletActions.updateEthBalance({ chainId: chain.id, balance: nativeBalance.formatted })
    }, [account, chain?.id, nativeBalance, connectWalletActions])

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
        // Only fetch allowances when user is on Optimism network (NETWORK_ID)
        // Skip when user is on other chains like Base (for haiAERO minting)
        // This prevents "call revert exception" errors when querying Optimism contracts from Base
        if (!needsProxyAllowances) return
        if (!account || !coinTokenContract || !protTokenContract || !connectWalletState.proxyAddress) return
        if (chain?.id !== NETWORK_ID) return

        protTokenContract
            .allowance(account, connectWalletState.proxyAddress)
            .then((allowance) => {
                const formattedAllowance = utils.formatEther(allowance)
                connectWalletActions.setProtAllowance(formattedAllowance)
            })
            .catch((error) => {
                console.debug('Error fetching KITE allowance (may be on different chain):', error.message)
            })

        coinTokenContract
            .allowance(account, connectWalletState.proxyAddress)
            .then((allowance) => {
                const formattedAllowance = utils.formatEther(allowance)
                connectWalletActions.setCoinAllowance(formattedAllowance)
            })
            .catch((error) => {
                console.debug('Error fetching HAI allowance (may be on different chain):', error.message)
            })
    }, [
        account,
        coinTokenContract,
        connectWalletState.proxyAddress,
        connectWalletActions,
        protTokenContract,
        chain?.id,
        needsProxyAllowances,
    ])

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
        if (!publicGeb?.tokenList) return
        connectWalletActions.setTokensData(publicGeb.tokenList)
    }, [publicGeb?.tokenList, connectWalletActions, chain?.id])

    useEffect(() => {
        if (!needsMarketData) return
        connectWalletActions.fetchFiatPrice()
    }, [connectWalletActions, needsMarketData])

    useEffect(() => {
        if (!needsMarketData) return
        if (!publicGeb) return

        vaultActions.fetchLiquidationData({
            geb: publicGeb,
            tokensData: publicGeb.tokenList,
        })
    }, [vaultActions, publicGeb, needsMarketData])

    useEffect(() => {
        if (!preloadOwnerVaults || !account || !signer || !geb || chain?.id !== NETWORK_ID) return

        const controller = new AbortController()

        vaultActions.fetchUserVaults({
            address: account,
            geb,
            tokensData: geb.tokenList,
            chainId: NETWORK_ID,
            signal: controller.signal,
        })
        return () => controller.abort()
    }, [account, signer, geb, chain?.id, vaultActions, preloadOwnerVaults])

    useEffect(() => {
        const video = splashVideo.current
        if (!isSplash || !video) return

        if (isDocumentVisible) {
            const playPromise = video.play()
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => undefined)
            }
            return
        }

        video.pause()
    }, [isSplash, isDocumentVisible])

    const accountChecker = useCallback(async () => {
        if (!account || !chain?.id || !signer) {
            popupsActions.setIsInitializing(false)
            return
        }

        // Skip Optimism-specific operations when user is on a different chain (e.g., Base for haiAERO)
        // This prevents errors from trying to call Optimism contracts with a non-Optimism signer
        const isOnOptimism = chain?.id === NETWORK_ID

        popupsActions.setWaitingPayload({
            title: '',
            status: ActionState.LOADING,
        })
        popupsActions.setIsInitializing(true)
        try {
            // Load cached transactions regardless of chain
            const txs = localStorage.getItem(`${account}-${NETWORK_ID}`)
            if (txs) {
                transactionsActions.setTransactions(JSON.parse(txs))
            }

            // Only perform Optimism-specific operations when on Optimism
            if (isOnOptimism && geb) {
                connectWalletActions.setProxyAddress('')
                const userProxy = await geb.getProxyAction(account)
                if (userProxy?.proxyAddress && userProxy.proxyAddress !== EMPTY_ADDRESS) {
                    connectWalletActions.setProxyAddress(userProxy.proxyAddress)
                }

                await timeout(200)
                if (!connectWalletState.ctHash) {
                    connectWalletActions.setStep(2)
                }
            } else {
                // When not on Optimism, just advance the step without fetching Optimism data
                connectWalletActions.setStep(2)
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
    }, [
        account,
        chain?.id,
        signer,
        geb,
        connectWalletActions,
        popupsActions,
        transactionsActions,
        connectWalletState.ctHash,
    ])

    useEffect(() => {
        if (previousAccount && previousAccount !== account) {
            vaultActions.setList([])
            vaultActions.setSingleVault(undefined)
        }
    }, [account, previousAccount, vaultActions])

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
    }, [account, previousAccount, history, connectWalletActions, transactionsActions, resetModals])

    const networkChecker = useCallback(() => {
        accountChange()
        // Allow both Optimism (NETWORK_ID) and Base (8453) as valid networks
        // Base is used for haiAERO minting flow
        const isValidNetwork = chain?.id === NETWORK_ID || chain?.id === 8453
        if (!isValidNetwork) {
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
    }, [accountChange, accountChecker, account, chain?.id, connectWalletActions, popupsActions])

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

    const intentionHeader = !isSplash ? (
        <IntentionHeader>{location.pathname === '/auctions' && <StartAuction />}</IntentionHeader>
    ) : null

    const scopedIntentionHeader = (() => {
        if (!intentionHeader) return null

        if (isEarnRoute) {
            return intentionHeader
        }

        if (isStakeRoute) {
            return <StakingProvider>{intentionHeader}</StakingProvider>
        }

        if (isHaiVeloRoute || isHaiAeroRoute) {
            return (
                <StakingProvider>
                    <ClaimsProvider>
                        <AprProvider>{intentionHeader}</AprProvider>
                    </ClaimsProvider>
                </StakingProvider>
            )
        }

        return intentionHeader
    })()

    const scopedContent = (() => {
        if (isEarnRoute) {
            return (
                <StakingProvider>
                    <ClaimsProvider>
                        <EarnProvider>
                            {scopedIntentionHeader}
                            {children}
                        </EarnProvider>
                    </ClaimsProvider>
                </StakingProvider>
            )
        }

        if (isAuctionRoute) {
            return (
                <ClaimsProvider includeIncentives={false}>
                    {scopedIntentionHeader}
                    {children}
                </ClaimsProvider>
            )
        }

        return (
            <>
                {scopedIntentionHeader}
                {children}
            </>
        )
    })()

    return (
        <Container>
            <TransactionUpdater />

            <Background aria-hidden="true">
                {isSplash && (
                    <video
                        ref={splashVideo}
                        src="/assets/tie-dye-reduced.mp4"
                        width={1920}
                        height={1072}
                        muted
                        autoPlay
                        playsInline
                        loop
                        preload="metadata"
                        poster="/assets/tie-dye.webp"
                    />
                )}
            </Background>
            {!isSplash && <ParallaxBackground />}
            <Header tickerActive={!isSplash} />
            <Suspense fallback={null}>
                {isClaimPopupOpen && (
                    <ClaimsProvider>
                        <RewardsProvider>
                            <ClaimModal />
                        </RewardsProvider>
                    </ClaimsProvider>
                )}
                {isStakeClaimPopupOpen && (
                    <StakingProvider>
                        <StakingClaimModal />
                    </StakingProvider>
                )}
            </Suspense>
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
                    {scopedContent}
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
    background-image: url('/assets/tie-dye.webp');
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
