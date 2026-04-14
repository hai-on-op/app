import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/utils/graphql/client', () => ({
    client: {
        query: vi.fn(),
    },
}))

import { client } from '~/utils/graphql/client'
import { fetchTotalsAtBlock } from '../dataSources'
import { getProtocolConfig } from '../registry'

describe('fetchTotalsAtBlock', () => {
    beforeEach(() => {
        vi.mocked(client.query).mockReset()
    })

    it('queries both v1 and v2 totals when the protocol supports v1 migration', async () => {
        vi.mocked(client.query).mockResolvedValue({
            data: {
                v1: { totalCollateral: '10' },
                v2: { totalCollateral: '25' },
            },
        } as any)

        const totals = await fetchTotalsAtBlock(getProtocolConfig('haiVelo'), 123)

        expect(totals).toEqual({ v1Total: 10, v2Total: 25 })
        expect(client.query).toHaveBeenCalledWith(
            expect.objectContaining({
                variables: {
                    v1Id: 'HAIVELO',
                    v2Id: 'HAIVELOV2',
                    block: { number: 123 },
                },
            })
        )

        const queryDocument = vi.mocked(client.query).mock.calls[0][0].query
        expect(queryDocument.loc?.source.body).toContain('v1: collateralType')
    })

    it('skips the v1 query entirely when the protocol has no v1 collateral', async () => {
        vi.mocked(client.query).mockResolvedValue({
            data: {
                v2: { totalCollateral: '42' },
            },
        } as any)

        const totals = await fetchTotalsAtBlock(getProtocolConfig('haiAero'), 456)

        expect(totals).toEqual({ v1Total: 0, v2Total: 42 })
        expect(client.query).toHaveBeenCalledWith(
            expect.objectContaining({
                variables: {
                    v2Id: 'HAIAERO',
                    block: { number: 456 },
                },
            })
        )

        const queryDocument = vi.mocked(client.query).mock.calls[0][0].query
        expect(queryDocument.loc?.source.body).not.toContain('v1: collateralType')
    })

    it('silently falls back to zero totals when the subgraph cannot serve the historical block', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.mocked(client.query).mockRejectedValue(
            new Error(
                'Failed to decode `block.number` value: subgraph only has data starting at block number 114045137'
            )
        )

        const totals = await fetchTotalsAtBlock(getProtocolConfig('haiAero'), 43271973)

        expect(totals).toEqual({ v1Total: 0, v2Total: 0 })
        expect(consoleErrorSpy).not.toHaveBeenCalled()

        consoleErrorSpy.mockRestore()
    })
})
