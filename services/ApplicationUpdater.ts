// Copyright (C) 2020  Uniswap
// https://github.com/Uniswap/uniswap-interface

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
import { useCallback, useEffect, useState } from 'react'
import { useStoreActions } from '@/store'
import { useDebounce, useEthersProvider } from '@/hooks'
import { useNetwork } from 'wagmi'

export default function ApplicationUpdater(): null {
    const { chain } = useNetwork()
    const chainId = chain?.id
    const provider = useEthersProvider()

    const { updateBlockNumber } = useStoreActions(actions => actions.connectWalletModel)
    const [state, setState] = useState<{
        chainId: number | undefined
        blockNumber: number | null
    }>({
        chainId,
        blockNumber: null,
    })

    const blockNumberCallback = useCallback(
        (blockNumber: number) => {
            setState((state) => {
                if (chainId === state.chainId) {
                    if (typeof state.blockNumber !== 'number') return { chainId, blockNumber }
                    return {
                        chainId,
                        blockNumber: Math.max(blockNumber, state.blockNumber),
                    }
                }
                return state
            })
        },
        [chainId, setState]
    )

    // attach/detach listeners
    useEffect(() => {
        if (!provider || !chainId) return undefined

        setState({ chainId, blockNumber: null })

        provider
            .getBlockNumber()
            .then(blockNumberCallback)
            .catch((error: any) => console.error(`Failed to get block number for chainId: ${chainId}`, error))

        provider.on('block', blockNumberCallback)
        return () => {
            provider.removeListener('block', blockNumberCallback)
        }
    }, [chainId, provider, blockNumberCallback])

    const debouncedState = useDebounce(state, 100)

    useEffect(() => {
        if (!debouncedState.chainId || !debouncedState.blockNumber) return

        updateBlockNumber({
            chainId: debouncedState.chainId,
            blockNumber: debouncedState.blockNumber,
        })
    }, [debouncedState.blockNumber, debouncedState.chainId])

    return null
}
