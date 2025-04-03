import { type Action, type Thunk, action, thunk } from 'easy-peasy'
import { type TokenData, type TokenFetchData, fetchTokenData } from '@hai-on-op/sdk'

import { fetchFiatPrice } from '~/services/api'
import type { IBlockNumber, IFetchTokensDataPayload, ITokenBalance } from '~/types'

export interface ConnectWalletModel {
    blockNumber: IBlockNumber
    updateBlockNumber: Action<ConnectWalletModel, { chainId: number; blockNumber: number }>

    fiatPrice: number
    fetchFiatPrice: Thunk<ConnectWalletModel>
    setFiatPrice: Action<ConnectWalletModel, number>

    ethPriceChange: number
    setEthPriceChange: Action<ConnectWalletModel, number>

    isWrongNetwork: boolean
    setIsWrongNetwork: Action<ConnectWalletModel, boolean>

    proxyAddress: string
    setProxyAddress: Action<ConnectWalletModel, string>

    step: number
    setStep: Action<ConnectWalletModel, number>
    isStepLoading: boolean
    setIsStepLoading: Action<ConnectWalletModel, boolean>

    tokensData: { [token: string]: TokenData }
    setTokensData: Action<ConnectWalletModel, { [token: string]: TokenData }>
    tokensFetchedData: { [token: string]: TokenFetchData }
    fetchTokenData: Thunk<ConnectWalletModel, IFetchTokensDataPayload>
    setTokensFetchedData: Action<ConnectWalletModel, { [token: string]: TokenFetchData }>
    forceUpdateTokens: boolean
    setForceUpdateTokens: Action<ConnectWalletModel, boolean>

    ethBalance: ITokenBalance
    updateEthBalance: Action<ConnectWalletModel, { chainId: number; balance: number }>
    haiBalance: ITokenBalance
    updateHaiBalance: Action<ConnectWalletModel, { chainId: number; balance: string }>
    veloBalance: ITokenBalance
    uniswapPoolBalance: ITokenBalance
    updateUniswapPoolBalance: Action<ConnectWalletModel, { chainId: number; balance: string }>

    coinAllowance: string
    setCoinAllowance: Action<ConnectWalletModel, string>
    protAllowance: string
    setProtAllowance: Action<ConnectWalletModel, string>

    ctHash: string
    setCtHash: Action<ConnectWalletModel, string>
}

const ctHashState = localStorage.getItem('ctHash')

const blockNumberState = localStorage.getItem('blockNumber')

const DEFAULT_TOKEN_BALANCE: ITokenBalance = {
    1: '0',
    10: '0',
    420: '0',
}

export const connectWalletModel: ConnectWalletModel = {
    blockNumber: blockNumberState ? JSON.parse(blockNumberState) : {},
    updateBlockNumber: action((state, payload) => {
        const { chainId, blockNumber } = payload
        if (typeof state.blockNumber[chainId] !== 'number') {
            state.blockNumber[chainId] = blockNumber
        } else {
            state.blockNumber[chainId] = Math.max(blockNumber, state.blockNumber[chainId])
        }
        localStorage.setItem('blockNumber', JSON.stringify(state.blockNumber))
    }),

    fiatPrice: 0,
    fetchFiatPrice: thunk(async (actions) => {
        const res = await fetchFiatPrice()
        if (res && res.usd) {
            actions.setFiatPrice(res.usd)
        }

        if (res && res.usd_24h_change) {
            actions.setEthPriceChange(res.usd_24h_change)
        }
    }),
    setFiatPrice: action((state, payload) => {
        state.fiatPrice = payload
    }),

    ethPriceChange: 0,
    setEthPriceChange: action((state, payload) => {
        state.ethPriceChange = payload
    }),

    isWrongNetwork: false,
    setIsWrongNetwork: action((state, payload) => {
        state.isWrongNetwork = payload
    }),

    proxyAddress: '',
    setProxyAddress: action((state, payload) => {
        state.proxyAddress = payload
    }),

    step: 0,
    setStep: action((state, payload) => {
        state.step = payload
        state.isStepLoading = false
    }),
    isStepLoading: false,
    setIsStepLoading: action((state, payload) => {
        state.isStepLoading = payload
    }),

    tokensData: {},
    setTokensData: action((state, payload) => {
        state.tokensData = payload
    }),
    tokensFetchedData: {},
    fetchTokenData: thunk(async (actions, payload) => {
        const tokenList = payload.geb.tokenList
        const fetched = await fetchTokenData(payload.geb, payload.user, tokenList)
        if (fetched) {
            actions.setTokensFetchedData(fetched)
            actions.setForceUpdateTokens(false)
        }
    }),
    setTokensFetchedData: action((state, payload) => {
        state.tokensFetchedData = payload
    }),
    forceUpdateTokens: true,
    setForceUpdateTokens: action((state, payload) => {
        state.forceUpdateTokens = payload
    }),

    ethBalance: { ...DEFAULT_TOKEN_BALANCE },
    updateEthBalance: action((state, payload) => {
        const { chainId, balance } = payload
        state.ethBalance[chainId] = balance
    }),
    haiBalance: { ...DEFAULT_TOKEN_BALANCE },
    updateHaiBalance: action((state, payload) => {
        const { chainId, balance } = payload
        state.haiBalance[chainId] = balance
    }),
    uniswapPoolBalance: { ...DEFAULT_TOKEN_BALANCE },
    updateUniswapPoolBalance: action((state, payload) => {
        const { chainId, balance } = payload
        state.uniswapPoolBalance[chainId] = balance
    }),

    coinAllowance: '',
    setCoinAllowance: action((state, payload) => {
        state.coinAllowance = payload
    }),
    protAllowance: '',
    setProtAllowance: action((state, payload) => {
        state.protAllowance = payload
    }),

    ctHash: ctHashState || '',
    setCtHash: action((state, payload) => {
        state.ctHash = payload
        localStorage.setItem('ctHash', payload)
    }),
}
