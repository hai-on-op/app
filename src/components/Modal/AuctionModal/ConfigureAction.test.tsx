import { cleanup, fireEvent, screen } from '@testing-library/react'
import { fetchCollateralAuctionData } from '@hai-on-op/sdk'
import { BigNumber, utils } from 'ethers'
import { afterEach, vi } from 'vitest'
import { store } from '~/store'
import { renderWithProviders } from '~/test/testUtils'
import type { IAuction } from '~/types'
import { ConfigureAction } from './ConfigureAction'

afterEach(cleanup)

vi.mock('@hai-on-op/sdk', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@hai-on-op/sdk')>()),
    fetchCollateralAuctionData: vi.fn(),
}))

vi.mock('~/hooks', () => ({
    useAuction: () => ({ buyToken: 'HAI', sellToken: 'WETH' }),
    useBalances: () => [{ raw: '3000' }, { raw: '0' }],
    usePublicGeb: () => ({}),
}))

const auction: IAuction = {
    auctionId: '1',
    englishAuctionType: 'COLLATERAL',
    sellToken: 'WETH',
    buyToken: 'HAI',
    buyAmount: '0',
    buyInitialAmount: '1800',
    sellAmount: '0',
    sellInitialAmount: '1200.1234567',
    createdAt: '0',
    createdAtTransaction: '',
    startedBy: '',
    auctionDeadline: '',
    englishAuctionBids: [],
    englishAuctionConfiguration: {
        bidDuration: '',
        bidIncrease: '',
        totalAuctionLength: '',
        DEBT_amountSoldIncrease: '',
    },
    winner: '',
    isClaimed: false,
    biddersList: [],
    remainingCollateral: utils.parseEther('1200.1234567').toString(),
    remainingToRaiseE18: utils.parseEther('1800').toString(),
}

describe('collateral auction bid', () => {
    beforeEach(() => {
        store.getActions().auctionModel.setAmount('')
        store.getActions().auctionModel.setCollateralAmount('')
    })

    it('quotes small amounts and the exact remaining collateral without display rounding', async () => {
        vi.mocked(fetchCollateralAuctionData).mockResolvedValue([
            {
                _auctionId: BigNumber.from(1),
                _boughtCollateral: utils.parseEther('3'),
                _adjustedBid: utils.parseEther('1'),
            },
        ])
        renderWithProviders(<ConfigureAction auction={auction} action="hai_bid" nextStep={vi.fn()} />)
        const [receive, bid] = (await screen.findAllByRole('spinbutton')) as HTMLInputElement[]
        fireEvent.change(receive, { target: { value: '0.0000003' } })
        expect(bid.value).toBe('0.0000001')
        fireEvent.change(receive, { target: { value: '0.000000000000000001' } })
        expect(bid.value).toBe('0.000000000000000001')
        fireEvent.click(screen.getByText(/Max:.*WETH/))
        expect(receive.value).toBe('1200.1234567')
    })

    it('keeps bid review unavailable when the auction has no quote', async () => {
        vi.mocked(fetchCollateralAuctionData).mockResolvedValue([])
        const nextStep = vi.fn()
        renderWithProviders(<ConfigureAction auction={auction} action="hai_bid" nextStep={nextStep} />)
        await screen.findByText('Auction quote unavailable.')
        expect(screen.getAllByRole('textbox').every((input) => (input as HTMLInputElement).disabled)).toBe(true)
        const review = screen.getByRole('button') as HTMLButtonElement
        expect(review.disabled).toBe(true)
        fireEvent.click(review)
        expect(nextStep).not.toHaveBeenCalled()
    })
})
