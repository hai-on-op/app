import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BigNumber, constants } from 'ethers'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import { utils as gebUtils } from '@hai-on-op/sdk'

import type { IAuction } from '~/types'
import { Status, formatNumberWithStyle, sanitizeDecimals, toFixedString } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useAuction } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { NumberInput } from '~/components/NumberInput'
import { TransactionSummary } from '~/components/TransactionSummary'

function parseWadAmount(amount?: string) {
    return amount ? BigNumber.from(toFixedString(amount, 'WAD')) : BigNumber.from(0)
}

const DEFAULT_BID_CHANGES = {
    increase: formatEther('1010000000000000000'),
    decrease: formatEther('1050000000000000000'),
}

type ConfigureActionProps = {
    auction: IAuction
    action: string
    nextStep: (skip?: boolean) => void
}
export function ConfigureAction({ auction, action, nextStep }: ConfigureActionProps) {
    const { t } = useTranslation()

    const {
        auctionModel: {
            amount,
            auctionsData,
            coinBalances: { hai: haiBalance = '0', kite: kiteBalance = '0' },
            collateralAmount,
            collateralData,
            internalBalance,
            protInternalBalance,
        },
        connectWalletModel: { coinAllowance: haiAllowance = '0', protAllowance: kiteAllowance = '0' },
    } = useStoreState((state) => state)
    const { auctionModel: auctionActions } = useStoreActions((actions) => actions)

    const { buyToken, sellToken, remainingToSell } = useAuction(auction)

    const [error, setError] = useState('')
    // const [value, setValue] = useState('')
    // const [collateralValue, setCollateralValue] = useState('')

    const [bidIncrease, bidDecrease] = useMemo(() => {
        return !auctionsData
            ? [DEFAULT_BID_CHANGES.increase, DEFAULT_BID_CHANGES.decrease]
            : [
                  formatEther(auctionsData.surplusAuctionHouseParams.bidIncrease),
                  formatEther(auctionsData.debtAuctionHouseParams.bidDecrease),
              ]
    }, [auctionsData])

    const collateralPrice = useMemo(() => {
        if (!collateralData || auction.englishAuctionType !== 'COLLATERAL') {
            return {
                raw: BigNumber.from(0),
                formatted: '0',
            }
        }

        const [data = undefined] = collateralData.filter((item) => item._auctionId.toString() === auction.auctionId)
        const price =
            !data?._adjustedBid.gt(0) || !data?._boughtCollateral.gt(0)
                ? constants.WeiPerEther
                : data._boughtCollateral.mul(constants.WeiPerEther).div(data._adjustedBid)
        return {
            raw: price,
            formatted: formatUnits(price, 18),
        }
    }, [auction, collateralData])

    const handleAmountChange = useCallback(
        (val: string) => {
            setError('')
            // setValue(val)
            auctionActions.setAmount(val)
            const valBN = parseEther(val || '0')
            const colValueBN = valBN.mul(collateralPrice.raw).div(constants.WeiPerEther)
            const colValueBNDecimalsRemoved = gebUtils.decimalShift(gebUtils.decimalShift(colValueBN, -8), 8)

            const formatted = formatEther(colValueBNDecimalsRemoved.toString())
            // setCollateralValue(formatted)
            auctionActions.setCollateralAmount(formatted)
        },
        [collateralPrice.raw, auctionActions]
    )

    const handleCollateralAmountChange = useCallback(
        (amount: string) => {
            setError('')
            // setCollateralValue(amount)
            auctionActions.setCollateralAmount(amount)

            const value = (Number(amount) / Number(collateralPrice.formatted)).toString() || ''
            const sanitizedValue = sanitizeDecimals(value, 18)
            // setValue(sanitizedValue)
            auctionActions.setAmount(sanitizedValue)
        },
        [collateralPrice.formatted, auctionActions]
    )

    const maxBid = useMemo(() => {
        const buyAmountBN = parseWadAmount(auction.buyAmount)
        const bidIncreaseBN = parseWadAmount(bidIncrease)

        if (auction.englishAuctionType !== 'DEBT') {
            const amountToBuy =
                auction.biddersList.length && buyAmountBN.isZero()
                    ? BigNumber.from(toFixedString(auction.biddersList[0].buyAmount, 'WAD'))
                    : buyAmountBN
            return gebUtils.wadToFixed(amountToBuy.mul(bidIncreaseBN).div(gebUtils.WAD)).toString()
        }

        const sellAmountBN = parseWadAmount(auction.sellAmount)
        if (auction.englishAuctionBids.length || auction.status === Status.LIVE) {
            // We need to bid N% less than the current best bid
            return gebUtils
                .wadToFixed(sellAmountBN.mul(100).div(parseEther(bidDecrease)).mul(gebUtils.WAD).div(100))
                .toString()
        }
        // Auction restart (no bids and passed the dealine)
        // When doing restart we're allowed to accept more FLX, DEBT_amountSoldIncrease=1.2
        const numerator = sellAmountBN.mul(parseWadAmount(bidDecrease))
        return gebUtils.wadToFixed(numerator.div(bidIncreaseBN).mul(gebUtils.WAD)).toString()
    }, [auction, bidIncrease, bidDecrease])

    const maxAmount = useMemo(() => {
        if (auction.englishAuctionType !== 'COLLATERAL') return maxBid

        const haiToBidPlusOne = BigNumber.from((auction as any).remainingToRaiseE18 || '0').add(1)
        const haiToBid = formatUnits(haiToBidPlusOne.toString(), 18)

        return Number(haiBalance) < Number(haiToBid) ? haiBalance : haiToBid.toString()
    }, [auction, maxBid, haiBalance])

    const maxCollateral = useMemo(() => {
        const convertedAmountBN = parseEther(maxAmount).mul(collateralPrice.raw).div(constants.WeiPerEther)
        const convertedAmount = formatEther(convertedAmountBN)
        const max = Math.min(parseFloat(convertedAmount), parseFloat(remainingToSell || '0')).toString()
        return {
            raw: max,
            formatted: formatNumberWithStyle(max, { maxDecimals: 4 }),
        }
    }, [maxAmount, collateralPrice.raw, remainingToSell])

    const passesChecks = useCallback(() => {
        const maxBidAmountBN = parseWadAmount(maxBid)
        const maxAmountBN = parseWadAmount(maxAmount)
        const valueBN = parseWadAmount(amount)
        const haiBalanceBN = parseWadAmount(haiBalance)
        const kiteBalanceBN = parseWadAmount(kiteBalance)
        const internalBalanceBN =
            Number(internalBalance || '0') > 0.00001
                ? BigNumber.from(toFixedString(internalBalance, 'WAD'))
                : BigNumber.from(0)
        const kiteInternalBalanceBN =
            Number(protInternalBalance || '0') > 0.00001
                ? BigNumber.from(toFixedString(protInternalBalance, 'WAD'))
                : BigNumber.from(0)
        const totalHaiBalance = haiBalanceBN.add(internalBalanceBN)
        const totalKiteBalance = kiteBalanceBN.add(kiteInternalBalanceBN)

        const buyAmountBN = parseWadAmount(auction.buyAmount)
        // console.log({
        //     hai: haiBalanceBN.toString(),
        //     kite: kiteBalanceBN.toString(),
        //     value: valueBN.toString(),
        //     maxBid: maxBidAmountBN.toString(),
        //     buy: buyAmountBN.toString(),
        // })

        if (valueBN.lt(0)) {
            setError('You cannot bid a negative number')
            return false
        }
        if (valueBN.isZero()) {
            setError('You cannot bid nothing')
            return false
        }

        switch (auction.englishAuctionType) {
            case 'SURPLUS': {
                if (buyAmountBN.gt(totalKiteBalance) || valueBN.gt(kiteBalanceBN)) {
                    setError(`Insufficient KITE balance.`)
                    return false
                }
                if (auction.biddersList.length && valueBN.lt(maxBidAmountBN)) {
                    setError(
                        `You need to bid ${((Number(bidIncrease) - 1) * 100).toFixed(0)}% more KITE vs the highest bid`
                    )
                    return false
                }
                break
            }
            case 'DEBT': {
                if (buyAmountBN.gt(haiBalanceBN)) {
                    setError(`Insufficient HAI balance.`)
                    return false
                }
                if (valueBN.gt(maxBidAmountBN)) {
                    if (!auction.biddersList.length) {
                        setError(`You can only bid to receive a maximum of ${maxBid} ${sellToken}`)
                    } else {
                        setError(
                            `You need to bid to receive ${((Number(bidDecrease) - 1) * 100).toFixed(
                                0
                            )}% less KITE vs the lowest bid`
                        )
                    }
                    return false
                }
                break
            }
            case 'COLLATERAL': {
                // Collateral Error when you dont have enough balance
                // console.log(buyAmountBN.toString(), totalHaiBalance.toString())
                if (buyAmountBN.gt(totalHaiBalance) || valueBN.gt(haiBalanceBN)) {
                    setError(`Insufficient HAI balance.`)
                    return false
                }
                if (valueBN.gt(maxAmountBN)) {
                    setError(`You cannot bid more than the max`)
                    return false
                }
                const collateralAmountBN = parseWadAmount(collateralAmount)
                // Collateral Error when there is not enough collateral left to buy
                if (collateralAmountBN.gt((auction as any).remainingCollateral)) {
                    setError(`Insufficient ${auction.tokenSymbol} to buy.`)
                    return false
                }
                break
            }
        }

        return true
    }, [
        auction,
        maxBid,
        amount,
        maxAmount,
        collateralAmount,
        bidIncrease,
        bidDecrease,
        haiBalance,
        kiteBalance,
        internalBalance,
        protInternalBalance,
    ])

    const hasAllowance = useCallback(() => {
        const haiAllowanceBN = parseWadAmount(haiAllowance)
        const kiteAllowanceBN = parseWadAmount(kiteAllowance)

        switch (auction.englishAuctionType) {
            case 'COLLATERAL': {
                return haiAllowanceBN.gte(parseWadAmount(amount))
            }
            case 'DEBT': {
                return haiAllowanceBN.gte(parseWadAmount(auction.buyAmount))
            }
            case 'SURPLUS': {
                return kiteAllowanceBN.gte(parseWadAmount(amount))
            }
        }
    }, [haiAllowance, kiteAllowance, amount, amount, auction])

    const handleSubmit = useCallback(() => {
        if (action.includes('buy') || action.includes('bid')) {
            if (!passesChecks()) return
            const shouldSkipAllowanceCheck = hasAllowance()
            nextStep(shouldSkipAllowanceCheck)
            return
        }
        if (auction.englishAuctionType !== 'DEBT') {
            auctionActions.setAmount(protInternalBalance)
        }
        nextStep(true)
    }, [action, auctionActions, nextStep, passesChecks, hasAllowance])

    const claimValues = useMemo(() => {
        return Number(protInternalBalance) > Number(internalBalance)
            ? {
                  amount: Number(protInternalBalance),
                  symbol: 'KITE',
              }
            : {
                  amount: Number(internalBalance),
                  symbol: 'HAI',
              }
    }, [internalBalance, protInternalBalance])

    const upperInput = useMemo(() => {
        switch (auction.englishAuctionType) {
            case 'DEBT': {
                return {
                    value: auction.buyInitialAmount,
                    label: `${buyToken} to Bid`,
                }
            }
            case 'SURPLUS': {
                return {
                    value: auction.sellInitialAmount,
                    label: `${sellToken} to Receive`,
                }
            }
            case 'COLLATERAL': {
                return {
                    value: collateralAmount,
                    label: `${sellToken} to Receive`,
                    subLabel: `Max: ${maxCollateral.formatted} ${sellToken}`,
                }
            }
        }
    }, [auction, buyToken, sellToken, collateralAmount, maxCollateral.formatted])

    const lowerInput = useMemo(() => {
        switch (auction.englishAuctionType) {
            case 'DEBT':
                return {
                    value: amount,
                    label: `${sellToken} to Receive`,
                    subLabel: `Max: ${maxAmount} ${sellToken}`,
                }
            case 'SURPLUS':
                return {
                    value: amount,
                    label: `${buyToken} to Bid`,
                    subLabel: `Min: ${maxAmount} ${buyToken}`,
                }
            case 'COLLATERAL':
                return {
                    value: amount,
                    label: `${buyToken} to Bid`,
                    subLabel: `Max: ${formatNumberWithStyle(maxAmount, { maxDecimals: 4 })} ${buyToken}`,
                }
        }
    }, [auction, buyToken, sellToken, amount, maxAmount])

    return (
        <>
            <ModalBody>
                {!action.includes('settle') && !action.includes('claim') ? (
                    <>
                        <NumberInput
                            disabled={auction.englishAuctionType !== 'COLLATERAL'}
                            label={upperInput.label}
                            subLabel={upperInput.subLabel || ''}
                            placeholder="0.00"
                            value={upperInput.value}
                            onChange={handleCollateralAmountChange}
                            onMax={() => {
                                if (collateralPrice.raw.isZero()) return
                                handleCollateralAmountChange(maxCollateral.raw)
                            }}
                        />
                        <NumberInput
                            label={lowerInput.label}
                            subLabel={lowerInput.subLabel}
                            placeholder="0.00"
                            value={lowerInput.value}
                            onChange={handleAmountChange}
                            onMax={() => handleAmountChange(maxAmount)}
                        />
                    </>
                ) : (
                    <NumberInput
                        disabled
                        label={`Claimable ${action.includes('claim') ? claimValues.symbol : sellToken}`}
                        subLabel=""
                        placeholder="0.00"
                        value={action.includes('claim') ? claimValues.amount.toLocaleString() : auction.sellAmount}
                        onChange={() => undefined}
                    />
                )}
                {error && <Error>{error}</Error>}
                <TransactionSummary
                    heading="Summary"
                    items={[
                        {
                            label: 'Auction #',
                            value: {
                                after: auction.auctionId,
                            },
                        },
                        {
                            label: upperInput.label,
                            value: {
                                after: upperInput.value || '0',
                            },
                        },
                        {
                            label: lowerInput.label,
                            value: {
                                after:
                                    !action.includes('settle') && !action.includes('claim')
                                        ? lowerInput.value || '0'
                                        : action.includes('claim')
                                        ? claimValues.amount.toLocaleString()
                                        : auction.buyAmount,
                            },
                        },
                    ]}
                />
            </ModalBody>
            <ModalFooter>
                <Flex $width="100%" $justify="flex-end" $align="center">
                    <HaiButton $variant="yellowish" onClick={handleSubmit}>
                        {t('review_transaction')}
                    </HaiButton>
                </Flex>
            </ModalFooter>
        </>
    )
}

const Error = styled(Text)`
    width: 100%;
    color: ${({ theme }) => theme.colors.dangerColor};
    font-size: ${({ theme }) => theme.font.small};
`
