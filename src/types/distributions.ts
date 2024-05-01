export type Distributions = Distribution[]

export type Distribution = {
    distributionIndex: number
    distributorAddress: string
    isClaimed: boolean
    description: string
    index: number
    amount: string
    proof: string[]
    createdAt: number
}
