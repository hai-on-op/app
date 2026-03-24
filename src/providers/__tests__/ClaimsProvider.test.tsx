import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchIncentivesDataMock, useAccountMock, useInternalBalancesMock, useMyActiveAuctionsMock, usePublicGebMock } =
    vi.hoisted(() => ({
        fetchIncentivesDataMock: vi.fn(),
        useAccountMock: vi.fn(),
        useInternalBalancesMock: vi.fn(),
        useMyActiveAuctionsMock: vi.fn(),
        usePublicGebMock: vi.fn(),
    }))

vi.mock('wagmi', () => ({
    useAccount: () => useAccountMock(),
}))

vi.mock('~/hooks', () => ({
    usePublicGeb: () => usePublicGebMock(),
}))

vi.mock('../ClaimsProvider/useInternalBalances', () => ({
    useInternalBalances: () => useInternalBalancesMock(),
}))

vi.mock('../ClaimsProvider/useMyActiveAuctions', () => ({
    useMyActiveAuctions: () => useMyActiveAuctionsMock(),
}))

vi.mock('../ClaimsProvider/useMyIncentives', () => ({
    fetchIncentivesData: (...args: unknown[]) => fetchIncentivesDataMock(...args),
}))

import { ClaimsProvider } from '../ClaimsProvider'

function renderProvider(props?: { includeIncentives?: boolean }) {
    return render(
        <ClaimsProvider {...props}>
            <div data-testid="claims-child" />
        </ClaimsProvider>
    )
}

describe('ClaimsProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        useAccountMock.mockReturnValue({
            address: '0x00000000000000000000000000000000000000bb',
        })

        usePublicGebMock.mockReturnValue({
            tokenList: {},
        })

        useInternalBalancesMock.mockReturnValue({
            HAI: { usdRaw: '1' },
            KITE: { usdRaw: '2' },
        })

        useMyActiveAuctionsMock.mockReturnValue({
            bids: [],
            activeBids: [],
            activeBidsValue: { raw: '0', formatted: '$0.00' },
            claimableAuctions: [],
            claimableAssetValue: { raw: '3', formatted: '$3.00' },
            loading: false,
            refetch: vi.fn(),
        })

        fetchIncentivesDataMock.mockResolvedValue({
            claimData: {},
            timerData: {
                endTime: 0,
                nextDistribution: '',
                isPaused: false,
            },
        })
    })

    it('fetches incentives by default', async () => {
        renderProvider()

        await waitFor(() => expect(fetchIncentivesDataMock).toHaveBeenCalledTimes(1))
    })

    it('skips incentives when explicitly disabled', async () => {
        renderProvider({ includeIncentives: false })

        await waitFor(() => expect(useMyActiveAuctionsMock).toHaveBeenCalledTimes(1))
        expect(fetchIncentivesDataMock).not.toHaveBeenCalled()
    })
})
