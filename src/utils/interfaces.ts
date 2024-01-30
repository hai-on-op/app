// export interface AssetData {
//     img: string
//     token: string
//     name: string
//     amount: number
//     price: number
//     value: number
//     diff: number
//     diffPercentage: number
// }
// export interface IIncentiveAssets {
//     eth: AssetData
//     hai: AssetData
//     flx: AssetData
//     uni: AssetData
// }

// export interface Distribution {
//     distributionIndex: number
//     distributorAddress: string
//     isClaimed: boolean
//     description: string
//     index: number
//     amount: string
//     proof: string[]
//     createdAt: number
// }

// export interface Distro {
//     from: string
//     until: string
//     amount: string
//     name: string
//     description: string
//     link: string
//     optional: { [key: string]: string | undefined }
//     image: string
//     apy_description: string
//     apy: string
//     apy_title: string
// }

// export interface Round {
//     number: number
//     name: string
//     distros: Distro[]
//     snapshotDate: string
//     distributionDate: string
//     starMessage?: string
// }

// export interface IncentivesDocument {
//     rounds: Round[]
// }

// export interface Slot0 {
//     sqrtPriceX96: BigNumber
//     tick: number
//     observationIndex: number
//     observationCardinality: number
//     observationCardinalityNext: number
//     feeProtocol: number
//     unlocked: boolean
// }
// export interface Position {
//     id: string
//     lowerTick: number
//     upperTick: number
//     uniLiquidity: BigNumber
//     threshold: BigNumber
// }

// export interface PositionsAndThreshold {
//     slot0: Slot0
//     p1: Position
//     p2: Position
//     t1: Tranche
//     t2: Tranche
// }

// export interface Tranche {
//     lowerTick: number
//     upperTick: number
// }

// export interface ILiquidityData {
//     haiAmount: string
//     ethAmount: string
//     totalLiquidity: string
// }

// export interface IStakingData {
//     stFlxAmount: string
//     stakingAmount: string
// }
