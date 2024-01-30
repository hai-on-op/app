import { useMemo } from 'react'

import type { FormattedBalance } from '~/types'
import { formatBalance } from '~/utils'
import { useStoreState } from '~/store'

export function useBalance(token: string): FormattedBalance {
    const {
        connectWalletModel: { tokensFetchedData },
    } = useStoreState((state) => state)

    return useMemo(() => {
        return formatBalance(tokensFetchedData[token]?.balanceE18 || '0')
    }, [token, tokensFetchedData])
}

export function useBalances(tokens: string[]): FormattedBalance[] {
    const {
        connectWalletModel: { tokensFetchedData },
    } = useStoreState((state) => state)

    return useMemo(() => {
        return tokens.map((token) => formatBalance(tokensFetchedData[token]?.balanceE18 || '0'))
    }, [tokens, tokensFetchedData])
}
