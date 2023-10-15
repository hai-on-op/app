import { ethers } from 'ethers'
import { useCallback, useEffect, useState } from 'react'
import useDebounce from '../hooks/useDebounce'
import store, { useStoreState } from '../store'
import { useEthersSigner } from '~/hooks/useEthersAdapters'
import { useAccount, useNetwork } from 'wagmi'

export default function ApplicationUpdater(): null {
    const { chain } = useNetwork()
    const chainId = chain?.id
    const { address: account } = useAccount()
    const signer = useEthersSigner()

    const { connectWalletModel: connectedWalletState } = useStoreState((state) => state)
    const { blockNumber } = connectedWalletState

    const [state, setState] = useState<{
        chainId: number | undefined
        balance: number
    }>({
        chainId,
        balance: 0,
    })

    const fetchEthBalanceCallBack = useCallback(
        (result: any) => {
            setState((state) => {
                if (chainId === state.chainId) {
                    return {
                        chainId,
                        balance: Number(ethers.utils.formatEther(result)),
                    }
                }
                return state
            })
        },
        [chainId, setState]
    )

    // attach/detach listeners
    useEffect(() => {
        if (!signer || !chainId || !account) return undefined
        setState({ chainId, balance: 0 })
        signer
            .getBalance(account)
            .then(fetchEthBalanceCallBack)
            .catch((error) => console.error(`Failed to fetch balance for chainId: ${chainId}`, error))
    }, [chainId, signer, fetchEthBalanceCallBack, account, blockNumber])

    const debouncedState = useDebounce(state, 100)

    useEffect(() => {
        if (!debouncedState.chainId || !debouncedState.balance) return
        store.dispatch.connectWalletModel.updateEthBalance({
            chainId: debouncedState.chainId,
            balance: debouncedState.balance,
        })
    }, [debouncedState.balance, debouncedState.chainId])

    return null
}
