import { action, Action, thunk, Thunk } from 'easy-peasy'

import {
    Geb,
    ICollateralAuction,
    AuctionData,
    fetchAuctionData,
    CollateralAuctionsData,
    fetchCollateralAuctionData,
} from '@hai-on-op/sdk'

import {
    handleAuctionBid,
    handleAuctionBuy,
    handleAuctionClaim,
    handleClaimInternalBalance,
    IAuctionBuy,
    IClaimInternalBalance,
    getCollateralAuctions,
    getDebtAuctions,
    getSurplusAuctions,
    formatSurplusAndDebtAuctions,
    formatCollateralAuctions,
    SURPLUS_BATCH_SIZE,
    DEBT_BATCH_SIZE,
    COLLATERAL_BATCH_SIZE,
} from '~/utils'
import { IAuctionBid, IAuction, AuctionEventType, LoadingAuctionsData } from '~/types'
import { StoreModel } from '~/model'

export interface AuctionModel {
    fetchAuctions: Thunk<
        AuctionModel,
        {
            geb: Geb
            type: AuctionEventType
            tokenSymbol?: string
            startBlock?: number
            loadedAuctions?: any[]
            loadingAuctionsData?: LoadingAuctionsData
            userProxy?: string
        }
    >

    amount: string
    setAmount: Action<AuctionModel, string>

    collateralAmount: string
    setCollateralAmount: Action<AuctionModel, string>

    operation: number
    setOperation: Action<AuctionModel, number>

    // protInternalBalance = user's KITE balance in the protocol
    protInternalBalance: string
    setProtInternalBalance: Action<AuctionModel, string>

    // internalbalance = user's HAI balance in the protocol
    internalBalance: string
    setInternalBalance: Action<AuctionModel, string>

    coinBalances: {
        hai: string
        kite: string
    }
    setCoinBalances: Action<
        AuctionModel,
        {
            hai: string
            kite: string
        }
    >

    selectedAuction: IAuction | null
    setSelectedAuction: Action<AuctionModel, IAuction | null>

    selectedCollateralAuction: ICollateralAuction | null
    setSelectedCollateralAuction: Action<AuctionModel, ICollateralAuction | null>

    auctionBid: Thunk<AuctionModel, IAuctionBid, any, StoreModel>
    auctionClaimInternalBalance: Thunk<AuctionModel, IClaimInternalBalance, any, StoreModel>
    auctionClaim: Thunk<AuctionModel, IAuctionBid, any, StoreModel>

    auctionBuy: Thunk<AuctionModel, IAuctionBuy, any, StoreModel>

    isSubmitting: boolean
    setIsSubmitting: Action<AuctionModel, boolean>

    auctionsData: AuctionData | null
    setAuctionsData: Action<AuctionModel, AuctionData>
    fetchAuctionsData: Thunk<AuctionModel, { geb: Geb; proxyAddress: string }, StoreModel>

    surplusAuctions: IAuction[] | undefined
    setSurplusAuctions: Action<AuctionModel, IAuction[] | undefined>

    debtAuctions: IAuction[] | undefined
    setDebtAuctions: Action<AuctionModel, IAuction[] | undefined>

    collateralAuctions: { [key: string]: ICollateralAuction[] }
    setCollateralAuctions: Action<AuctionModel, { collateral: string; auctions: ICollateralAuction[] }>

    collateralData: CollateralAuctionsData[] | null
    setCollateralData: Action<AuctionModel, CollateralAuctionsData[]>
    fetchCollateralData: Thunk<
        AuctionModel,
        {
            geb: Geb
            collateral: string
            auctionIds: string[]
        },
        CollateralAuctionsData[]
    >

    loadingAuctionsData: LoadingAuctionsData
    setLoadingAuctionsData: Action<AuctionModel, LoadingAuctionsData>
}

const auctionModel: AuctionModel = {
    surplusAuctions: undefined,
    debtAuctions: undefined,
    collateralAuctions: {},
    fetchAuctions: thunk(
        async (
            actions,
            { geb, type, tokenSymbol, startBlock, loadedAuctions = [], loadingAuctionsData = {}, userProxy = '' }
        ) => {
            const latestBlock = startBlock || (await geb.provider.getBlockNumber())
            actions.setLoadingAuctionsData({
                ...loadingAuctionsData,
                loading: true,
            })
            if (type === 'SURPLUS') {
                const { auctions, endBlock } = await getSurplusAuctions(
                    geb,
                    latestBlock - SURPLUS_BATCH_SIZE,
                    latestBlock
                )
                const surplusAuctions = auctions.reverse().map((auction) => {
                    return {
                        ...auction,
                        englishAuctionType: 'SURPLUS',
                        sellToken: 'COIN',
                        buyToken: 'PROTOCOL_TOKEN',
                    }
                })
                if (surplusAuctions) {
                    const formattedAuctions = formatSurplusAndDebtAuctions(surplusAuctions, userProxy)
                    actions.setSurplusAuctions([...loadedAuctions, ...formattedAuctions])
                    actions.setLoadingAuctionsData({
                        surplusStartBlock: endBlock,
                        loading: false,
                    })
                }
            } else if (type === 'DEBT') {
                const { auctions, endBlock } = await getDebtAuctions(geb, latestBlock - DEBT_BATCH_SIZE, latestBlock)
                const debtAuctions = auctions.reverse().map((auction) => {
                    return {
                        ...auction,
                        englishAuctionType: 'DEBT',
                        sellToken: 'PROTOCOL_TOKEN',
                        buyToken: 'COIN',
                    }
                })
                if (debtAuctions) {
                    const formattedAuctions = formatSurplusAndDebtAuctions(debtAuctions, userProxy)
                    actions.setDebtAuctions([...loadedAuctions, ...formattedAuctions])
                    actions.setLoadingAuctionsData({
                        debtStartBlock: endBlock,
                        loading: false,
                    })
                }
            } else if (type === 'COLLATERAL') {
                const { auctions, endBlock } = await getCollateralAuctions(
                    geb,
                    tokenSymbol || 'WETH',
                    latestBlock - 1000000,
                    latestBlock
                )

                const collateralAuctions = auctions.reverse().map((auction) => {
                    return {
                        ...auction,
                        englishAuctionType: 'COLLATERAL',
                        sellToken: 'PROTOCOL_TOKEN',
                        buyToken: 'COIN',
                        tokenSymbol: tokenSymbol,
                        auctionDeadline: '1699122709',
                    }
                })
                if (collateralAuctions && tokenSymbol) {
                    const formmatedAuctions = formatCollateralAuctions(collateralAuctions, tokenSymbol)
                    actions.setCollateralAuctions({
                        collateral: tokenSymbol,
                        auctions: [...loadedAuctions, ...formmatedAuctions],
                    })
                    actions.setLoadingAuctionsData({
                        ...actions.loadingAuctionsData,
                        collateralStartBlock: endBlock,
                        loading: false,
                    })
                }
            }
        }
    ),
    setSurplusAuctions: action((state, payload) => {
        state.surplusAuctions = payload
    }),
    setDebtAuctions: action((state, payload) => {
        state.debtAuctions = payload
    }),
    setCollateralAuctions: action((state, { collateral, auctions }) => {
        state.collateralAuctions = { ...state.collateralAuctions, [collateral]: auctions }
    }),

    amount: '',
    setAmount: action((state, payload) => {
        state.amount = payload
    }),

    operation: 0,
    setOperation: action((state, payload) => {
        state.operation = payload
    }),

    collateralAmount: '',
    setCollateralAmount: action((state, payload) => {
        state.collateralAmount = payload
    }),

    protInternalBalance: '',
    setProtInternalBalance: action((state, payload) => {
        state.protInternalBalance = payload
    }),

    internalBalance: '',
    setInternalBalance: action((state, payload) => {
        state.internalBalance = payload
    }),

    coinBalances: {
        hai: '',
        kite: '',
    },
    setCoinBalances: action((state, payload) => {
        state.coinBalances = payload
    }),

    selectedAuction: null,
    setSelectedAuction: action((state, payload) => {
        state.selectedAuction = payload
    }),

    selectedCollateralAuction: null,
    setSelectedCollateralAuction: action((state, payload) => {
        state.selectedCollateralAuction = payload
    }),

    auctionBid: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleAuctionBid(payload)
        if (txResponse) {
            actions.setIsSubmitting(true)
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: payload.title,
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            storeActions.popupsModel.setIsWaitingModalOpen(true)
            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: 'success',
            })
            await txResponse.wait()
            actions.setIsSubmitting(false)
        }
    }),

    auctionBuy: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleAuctionBuy(payload)
        if (txResponse) {
            actions.setIsSubmitting(true)
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: payload.title,
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            storeActions.popupsModel.setIsWaitingModalOpen(true)
            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: 'success',
            })
            await txResponse.wait()
            actions.setIsSubmitting(false)
        }
    }),

    auctionClaim: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleAuctionClaim(payload)
        if (txResponse) {
            actions.setIsSubmitting(true)
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: payload.title,
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            storeActions.popupsModel.setIsWaitingModalOpen(true)
            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: 'success',
            })
            await txResponse.wait()
            actions.setIsSubmitting(false)
        }
    }),

    auctionClaimInternalBalance: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleClaimInternalBalance(payload)
        if (txResponse) {
            actions.setIsSubmitting(true)
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: payload.title,
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            storeActions.popupsModel.setIsWaitingModalOpen(true)
            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: 'success',
            })
            await txResponse.wait()
            actions.setIsSubmitting(false)
        }
    }),

    isSubmitting: false,
    setIsSubmitting: action((state, payload) => {
        state.isSubmitting = payload
    }),
    setAuctionsData: action((state, payload) => {
        state.auctionsData = payload
    }),
    fetchAuctionsData: thunk(async (actions, { geb, proxyAddress }) => {
        const fetched = await fetchAuctionData(geb, proxyAddress)
        if (fetched) {
            actions.setAuctionsData(fetched)
        }
    }),
    auctionsData: null,

    collateralData: null,
    setCollateralData: action((state, payload) => {
        state.collateralData = payload
    }),
    fetchCollateralData: thunk(async (state, { geb, collateral, auctionIds }) => {
        const fetched = await fetchCollateralAuctionData(geb, collateral, auctionIds)
        state.setCollateralData(fetched)
    }),

    loadingAuctionsData: {
        loading: false,
    },
    setLoadingAuctionsData: action((state, payload) => {
        state.loadingAuctionsData = { ...state.loadingAuctionsData, ...payload }
    }),
}

export default auctionModel
