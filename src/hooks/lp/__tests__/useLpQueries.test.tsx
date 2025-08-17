import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { useLpPool } from '../useLpPool'
import { useLpAllPositions } from '../useLpAllPositions'
import { useLpUserPositions } from '../useLpUserPositions'
import * as lpService from '~/services/lpData'

describe('LP read-only queries', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	function PoolComp() {
		const { data, isLoading, isError } = useLpPool()
		if (isLoading) return <div>loading</div>
		if (isError) return <div>error</div>
		return <div data-testid="pool">{data?.id || 'none'}</div>
	}

	function AllPosComp() {
		const { data, isLoading, isError } = useLpAllPositions()
		if (isLoading) return <div>loading</div>
		if (isError) return <div>error</div>
		return <div data-testid="count">{data?.length ?? 0}</div>
	}

	function UserPosComp({ address }: { address?: string }) {
		const { data, isLoading, isError } = useLpUserPositions(address)
		if (isLoading) return <div>loading</div>
		if (isError) return <div>error</div>
		return <div data-testid="user-count">{data?.length ?? 0}</div>
	}

	it('useLpPool returns typed pool data', async () => {
		vi.spyOn(lpService, 'fetchPoolData').mockResolvedValue({
			id: 'pool-1',
			liquidity: '123',
			totalValueLockedToken0: '0',
			totalValueLockedToken1: '0',
			totalValueLockedUSD: '0',
			token0: { symbol: 'HAI', decimals: 18 },
			token1: { symbol: 'WETH', decimals: 18 },
			token0Price: '1',
			token1Price: '1',
			tick: '0',
			sqrtPrice: '0',
		} as any)

		renderWithProviders(<PoolComp />)
		await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
		expect(screen.getByTestId('pool').textContent).toBe('pool-1')
	})

	it('useLpAllPositions returns positions', async () => {
		vi.spyOn(lpService, 'fetchAllActivePositions').mockResolvedValue([
			{
				id: 'p1',
				liquidity: '1',
				depositedToken0: '0',
				depositedToken1: '0',
				withdrawnToken0: '0',
				withdrawnToken1: '0',
				tickLower: { tickIdx: '0' },
				tickUpper: { tickIdx: '1' },
				owner: '0xabc',
			},
			{
				id: 'p2',
				liquidity: '2',
				depositedToken0: '0',
				depositedToken1: '0',
				withdrawnToken0: '0',
				withdrawnToken1: '0',
				tickLower: { tickIdx: '0' },
				tickUpper: { tickIdx: '1' },
				owner: '0xdef',
			},
		] as any)

		renderWithProviders(<AllPosComp />)
		await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
		expect(screen.getByTestId('count').textContent).toBe('2')
	})

	it('useLpUserPositions filters by owner address', async () => {
		vi.spyOn(lpService, 'fetchAllActivePositions').mockResolvedValue([
			{ id: 'p1', liquidity: '1', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xabc' } as any,
			{ id: 'p2', liquidity: '2', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xdef' } as any,
		] as any)

		renderWithProviders(<UserPosComp address={'0xAbC'} />)
		await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
		expect(screen.getByTestId('user-count').textContent).toBe('1')
	})
})


