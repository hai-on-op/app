import { BigNumber, Contract, utils } from 'ethers'
import { type Geb, getAddressList, utils as gebUtils } from '@hai-on-op/sdk'
import multicallAbi from '~/abis/multicall.json'
import { VaultInfoError } from '~/utils/vaults'

export type VaultDebtLimits = {
    rateRay: BigNumber
    safetyPriceRay: BigNumber
    globalDebtRad: BigNumber
    globalCeilingRad: BigNumber
    collateralDebtWad: BigNumber
    collateralCeilingRad: BigNumber
    debtFloorRad: BigNumber
    safeDebtWad: BigNumber
    lockedCollateralWad?: BigNumber
    safeCeilingWad: BigNumber
    creditRad: BigNumber
    proxyCreditRad?: BigNumber
}

export async function fetchVaultDebtLimits(
    geb: Geb,
    collateralType: string,
    safeHandler?: string,
    proxyAddress?: string
): Promise<VaultDebtLimits> {
    const { safeEngine, taxCollector } = geb.contracts
    const engine: utils.Interface = safeEngine.interface
    const read = (name: string, args: string[] = []) => ({
        target: safeEngine.address,
        callData: engine.encodeFunctionData(name, args),
    })

    // BasicActions collects this collateral's fee before borrowing or repaying. Simulate it in the same eth_call
    // as the reads so the rate and all three limits describe the same block. Nothing is written to chain.
    const multicall = new Contract(getAddressList(geb.network).MULTICALL, multicallAbi, geb.provider)
    const { returnData } = await multicall.callStatic.aggregate([
        {
            target: taxCollector.address,
            callData: taxCollector.interface.encodeFunctionData('taxSingle', [collateralType]),
        },
        read('globalDebt'),
        read('params'),
        read('cData', [collateralType]),
        read('cParams', [collateralType]),
        ...(safeHandler ? [read('safes', [collateralType, safeHandler]), read('coinBalance', [safeHandler])] : []),
        ...(safeHandler && proxyAddress ? [read('coinBalance', [proxyAddress])] : []),
    ])
    const [, globalDebt, params, cData, cParams, safe, credit, proxyCredit] = returnData as string[]
    const [limits] = engine.decodeFunctionResult('params', params)
    const [collateral] = engine.decodeFunctionResult('cData', cData)
    const [collateralParams] = engine.decodeFunctionResult('cParams', cParams)
    const vault = safe ? engine.decodeFunctionResult('safes', safe)[0] : undefined
    if (collateral.accumulatedRate.isZero()) throw new Error('Collateral has no initialized debt rate.')
    return {
        rateRay: collateral.accumulatedRate,
        safetyPriceRay: collateral.safetyPrice,
        globalDebtRad: engine.decodeFunctionResult('globalDebt', globalDebt)[0],
        globalCeilingRad: limits.globalDebtCeiling,
        collateralDebtWad: collateral.debtAmount,
        collateralCeilingRad: collateralParams.debtCeiling,
        debtFloorRad: collateralParams.debtFloor,
        safeDebtWad: vault?.generatedDebt ?? BigNumber.from(0),
        lockedCollateralWad: vault?.lockedCollateral,
        safeCeilingWad: limits.safeDebtCeiling,
        creditRad: credit ? engine.decodeFunctionResult('coinBalance', credit)[0] : BigNumber.from(0),
        proxyCreditRad: proxyCredit ? engine.decodeFunctionResult('coinBalance', proxyCredit)[0] : undefined,
    }
}

export function getGeneratedDebtWad(borrowWad: BigNumber, limits: VaultDebtLimits): BigNumber {
    const requestedRad = borrowWad.mul(gebUtils.RAY)
    if (limits.creditRad.gte(requestedRad)) return BigNumber.from(0)

    // BasicActions compares the rounded result against the full request, including any existing credit.
    const generatedWad = requestedRad.sub(limits.creditRad).div(limits.rateRay)
    return generatedWad.mul(limits.rateRay).lt(requestedRad) ? generatedWad.add(1) : generatedWad
}

export function getMaxBorrowWad(lockedAfterWad: BigNumber, limits: VaultDebtLimits): BigNumber {
    const headroom = [
        limits.globalCeilingRad.sub(limits.globalDebtRad).div(limits.rateRay),
        limits.collateralCeilingRad.div(limits.rateRay).sub(limits.collateralDebtWad),
        limits.safeCeilingWad.sub(limits.safeDebtWad),
        lockedAfterWad.mul(limits.safetyPriceRay).div(limits.rateRay).sub(limits.safeDebtWad),
    ]
    const availableWad = headroom.reduce((min, amount) => (min.lt(amount) ? min : amount))
    if (availableWad.lte(0)) return limits.creditRad.div(gebUtils.RAY)

    // Invert the proxy's round-up rule: with existing credit, the last RAD of headroom is exclusive.
    const availableRad = availableWad.mul(limits.rateRay).add(limits.creditRad)
    return (limits.creditRad.isZero() ? availableRad : availableRad.sub(1)).div(gebUtils.RAY)
}

export function getBorrowLimitError(borrowWad: BigNumber, limits: VaultDebtLimits): VaultInfoError | undefined {
    const generatedWad = getGeneratedDebtWad(borrowWad, limits)
    if (generatedWad.isZero()) return undefined
    if (limits.globalDebtRad.add(generatedWad.mul(limits.rateRay)).gt(limits.globalCeilingRad)) {
        return VaultInfoError.GLOBAL_DEBT_CEILING
    }
    if (limits.collateralDebtWad.add(generatedWad).mul(limits.rateRay).gt(limits.collateralCeilingRad)) {
        return VaultInfoError.COLLATERAL_DEBT_CEILING
    }
    if (limits.safeDebtWad.add(generatedWad).gt(limits.safeCeilingWad)) {
        return VaultInfoError.INDIVIDUAL_DEBT_CEILING
    }
}
