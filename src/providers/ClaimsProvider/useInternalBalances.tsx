import { useMemo } from 'react'

import { formatSummaryCurrency } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { usePublicGeb } from '~/hooks'

export function useInternalBalances() {
    const {
        auctionModel: { internalBalance, protInternalBalance },
        connectWalletModel: { proxyAddress },
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)
    const { auctionModel: auctionActions } = useStoreActions((actions) => actions)

    const geb = usePublicGeb()

    return useMemo(() => {
        // ignore tiny balances
        const haiBalance = parseFloat(internalBalance) < 0.1 ? '0' : internalBalance
        const kiteBalance = parseFloat(protInternalBalance) < 0.01 ? '0' : protInternalBalance
        const balances = {
            HAI: formatSummaryCurrency(haiBalance, liquidationData?.currentRedemptionPrice || '1'),
            // TODO: get kite price
            KITE: formatSummaryCurrency(kiteBalance, '10'),
        }
        return {
            ...balances,
            refetch: geb && proxyAddress ? () => auctionActions.fetchAuctionsData({ geb, proxyAddress }) : undefined,
        }
    }, [geb, proxyAddress, liquidationData, internalBalance, protInternalBalance])
}
