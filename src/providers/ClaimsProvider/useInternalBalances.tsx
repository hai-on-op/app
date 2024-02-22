import { useMemo } from 'react'
import { usePublicGeb } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'
import { formatSummaryCurrency } from '~/utils'

export function useInternalBalances() {
    const {
        auctionModel: { internalBalance, protInternalBalance },
        connectWalletModel: { proxyAddress },
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)
    const { auctionModel: auctionActions } = useStoreActions((actions) => actions)

    const geb = usePublicGeb()

    return useMemo(() => {
        const balances = {
            HAI: formatSummaryCurrency(internalBalance, liquidationData?.currentRedemptionPrice || '1'),
            KITE: formatSummaryCurrency(protInternalBalance, '10'),
        }
        return {
            ...balances,
            refetch: geb && proxyAddress ? () => auctionActions.fetchAuctionsData({ geb, proxyAddress }) : undefined,
        }
    }, [geb, proxyAddress, liquidationData, internalBalance, protInternalBalance])
}
