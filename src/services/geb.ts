import { BasicActions, Geb, type TokenData } from '@hai-on-op/sdk'
import { getReviewedAdditionalCollaterals } from './aeroMigration/collateralRegistry'

type GebArguments = ConstructorParameters<typeof Geb>

function matchesToken(actual: TokenData | undefined, expected: TokenData) {
    if (!actual) return false
    return (
        actual.address.toLowerCase() === expected.address.toLowerCase() &&
        actual.collateralJoin.toLowerCase() === expected.collateralJoin.toLowerCase() &&
        actual.collateralAuctionHouse.toLowerCase() === expected.collateralAuctionHouse.toLowerCase() &&
        actual.bytes32String.toLowerCase() === expected.bytes32String.toLowerCase() &&
        actual.symbol === expected.symbol &&
        actual.decimals === expected.decimals &&
        actual.isCollateral === expected.isCollateral &&
        actual.hasRewards === expected.hasRewards
    )
}

/** Central SDK construction. An empty registry retains the pinned SDK's existing two-argument behavior. */
export function createGeb(network: GebArguments[0], signerOrProvider: GebArguments[1]): Geb {
    const additionalCollaterals = getReviewedAdditionalCollaterals(network)
    if (additionalCollaterals.length === 0) return new Geb(network, signerOrProvider)

    if (
        Reflect.get(Geb, 'collateralConfigurationVersion') !== 1 ||
        Reflect.get(BasicActions, 'collateralConfigurationVersion') !== 1
    )
        throw new Error('This SDK does not support the reviewed additional collateral configuration. Update the SDK.')

    // SDK 1.2.33 remains pinned until a reviewed release. Never silently pass configuration to that older constructor.
    const geb: Geb = Reflect.construct(Geb, [network, signerOrProvider, { additionalCollaterals }])
    for (const token of additionalCollaterals) {
        if (
            !matchesToken(geb.tokenList[token.symbol], token) ||
            !matchesToken(geb.liquidations.tokenList[token.symbol], token) ||
            geb.contracts.tokenCollateralJoin?.[token.symbol]?.address.toLowerCase() !==
                token.collateralJoin.toLowerCase() ||
            geb.contracts.tokenCollateralAuctionHouse?.[token.symbol]?.address.toLowerCase() !==
                token.collateralAuctionHouse.toLowerCase()
        )
            throw new Error('SDK collateral APIs did not accept the reviewed configuration.')
    }

    const getProxyAction = geb.getProxyAction.bind(geb)
    geb.getProxyAction = async (ownerAddress: string) => {
        const proxy = await getProxyAction(ownerAddress)
        const getCollateralToken = Reflect.get(proxy, 'getCollateralToken')
        if (
            typeof getCollateralToken !== 'function' ||
            additionalCollaterals.some(
                (token) => !matchesToken(Reflect.apply(getCollateralToken, proxy, [token.symbol]), token)
            )
        )
            throw new Error('SDK proxy actions did not accept the reviewed collateral configuration.')
        return proxy
    }
    return geb
}
