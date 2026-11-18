import { useQuery } from '@tanstack/react-query'
import type { Geb } from '@hai-on-op/sdk'
import { fetchVaultDebtLimits } from '~/services/vaultDebtLimits'

export function useVaultDebtLimits(
    geb: Geb,
    enabled: boolean,
    collateralType?: string,
    safeHandler?: string,
    proxyAddress?: string
) {
    const active = enabled && !!collateralType
    const query = useQuery({
        queryKey: ['vaultDebtLimits', geb.network, collateralType, safeHandler, proxyAddress],
        queryFn: () => fetchVaultDebtLimits(geb, collateralType!, safeHandler, proxyAddress),
        enabled: active,
        staleTime: 12_000,
        refetchInterval: 12_000,
    })
    return {
        limits: active ? query.data : undefined,
        notice:
            active && query.isError
                ? 'Live vault debt data is unavailable. Showing an estimate.'
                : active && !query.data
                ? 'Checking live vault debt data…'
                : undefined,
    }
}
