import { Geb, IDebtAuction, ICollateralAuction, ISurplusAuction } from '@hai-on-op/sdk'
import { COLLATERAL_BATCH_SIZE, DEBT_BATCH_SIZE, SURPLUS_BATCH_SIZE } from '../constants'

async function fetchAuctions(
    fetchFunction: (startBlock: number, endBlock: number) => Promise<{ auctions: any[] }>,
    startBlock: number,
    endBlock: number,
    blockAmount: number,
    accumulatedAuctions: any[]
): Promise<{ auctions: any[]; endBlock: number }> {
    // Check if endBlock is negative, and if so, set it to the lowest possible block number (usually 0).
    if (endBlock < 0) {
        endBlock = 0
    }

    // Check if blockAmount is greater than or equal to startBlock.
    if (blockAmount >= startBlock) {
        blockAmount = startBlock - 1
    }

    // Ensure that startBlock is never smaller than endBlock.
    if (endBlock <= startBlock) {
        return { auctions: accumulatedAuctions, endBlock: startBlock - 1 }
    }

    const auctionsFetched = await fetchFunction(startBlock, endBlock)
    const totalAuctions = accumulatedAuctions.concat(auctionsFetched.auctions)

    if (totalAuctions.length) {
        return { auctions: totalAuctions, endBlock: startBlock - 1 }
    } else {
        return fetchAuctions(fetchFunction, startBlock - blockAmount, startBlock - 1, blockAmount, totalAuctions)
    }
}

export const getSurplusAuctions = async (
    geb: Geb,
    startBlock: number,
    endBlock: number,
    blockAmount: number = SURPLUS_BATCH_SIZE,
    accumulatedAuctions: ISurplusAuction[] = []
): Promise<{ auctions: ISurplusAuction[]; endBlock: number }> => {
    return fetchAuctions(
        geb.auctions.getSurplusAuctions.bind(geb.auctions),
        startBlock,
        endBlock,
        blockAmount,
        accumulatedAuctions
    )
}

export const getDebtAuctions = async (
    geb: Geb,
    startBlock: number,
    endBlock: number,
    blockAmount: number = DEBT_BATCH_SIZE,
    accumulatedAuctions: IDebtAuction[] = []
): Promise<{ auctions: IDebtAuction[]; endBlock: number }> => {
    return fetchAuctions(
        geb.auctions.getDebtAuctions.bind(geb.auctions),
        startBlock,
        endBlock,
        blockAmount,
        accumulatedAuctions
    )
}

export const getCollateralAuctions = async (
    geb: Geb,
    collateral: string,
    startBlock: number,
    endBlock: number,
    blockAmount: number = COLLATERAL_BATCH_SIZE,
    accumulatedAuctions: ICollateralAuction[] = []
): Promise<{ auctions: ICollateralAuction[]; endBlock: number }> => {
    return fetchAuctions(
        (start, end) => geb.auctions.getCollateralAuctions(collateral, start, end),
        startBlock,
        endBlock,
        blockAmount,
        accumulatedAuctions
    )
}
