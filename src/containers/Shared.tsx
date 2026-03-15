import { Suspense, lazy, useEffect, useCallback, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { utils } from 'ethers'
import { useAccount, useNetwork } from 'wagmi'

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

/**
 * Ensure HAIAERO is present in a token list.
 * SDK v1.2.33+ includes HAIAERO natively; this fallback covers older builds
 * by cloning the HAIVELOV2 entry with HAIAERO-specific addresses.
 */
function withHaiAero(tokenList: Record<string, any>): Record<string, any> {
    if (tokenList.HAIAERO || !tokenList.HAIVELOV2) return tokenList
    return {
        ...tokenList,
        HAIAERO: {
            ...tokenList.HAIVELOV2,
            symbol: 'HAIAERO',
            name: 'haiAERO',
            address: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152',
            bytes32String: utils.formatBytes32String('HAIAERO'),
            collateralJoin: '0xc83e160E117A420d7BccE800450dE07Ff51d13bA',
            collateralAuctionHouse: '0xeA089d5902ac42A4b25aB7749CECA8FB4a1eAf12',
            isCollateral: true,
            hasRewards: true,
        },
    }
}

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
    const isStakeRoute = location.pathname.startsWith('/stake')
    const isVaultRoute = location.pathname.startsWith('/vaults')
    const isHaiVeloRoute =
        location.pathname === '/haiVELO' ||
        (location.pathname === '/vaults/open' && ['HAIVELO', 'HAIVELOV2'].includes(openCollateral))
    const isHaiAeroRoute =
        location.pathname === '/haiAERO' ||
        (location.pathname === '/vaults/open' && ['HAIAERO'].includes(openCollateral))

    const tokenList = publicGeb ? withHaiAero(publicGeb.tokenList) : undefined
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
        connectWalletActions.setTokensData(withHaiAero(publicGeb.tokenList))
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
            tokensData: withHaiAero(publicGeb.tokenList),
        })
    }, [vaultActions, publicGeb, needsMarketData])

    useEffect(() => {
        if (!isEarnRoute) return
        if (!account || !signer || !geb) return
        if (chain?.id !== NETWORK_ID) return

        vaultActions.fetchUserVaults({
            address: account,
            geb,
            tokensData: withHaiAero(geb.tokenList),
            chainId: NETWORK_ID,
        })
    }, [account, signer, geb, chain?.id, vaultActions, isEarnRoute])

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

        if (isAuctionRoute) {
            return <ClaimsProvider>{intentionHeader}</ClaimsProvider>
        }

        if (isStakeRoute) {
            return <StakingProvider>{intentionHeader}</StakingProvider>
        }

        if (isHaiVeloRoute || isHaiAeroRoute) {
            return (
                <StakingProvider>
                    <ClaimsProvider>{intentionHeader}</ClaimsProvider>
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
