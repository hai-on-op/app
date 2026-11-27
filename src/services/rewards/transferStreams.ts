export const OP_HAI = '0x10398abc267496e49106b07dd6be13364d10dc71'
export const REWARD_DISTRIBUTOR = '0xfed2eb6325432f0bf7110dce2ccc5ff811ac3d4d'
export const REWARD_DEPOSITERS = {
    haiVelo: '0x7f4735237c41f7f8578a9c7d10a11e3bcfa3d4a3',
    haiAero: '0xf66ff754a563fd1c9dafa5928d8a02f38ac54241',
} as const

export type RewardStream = keyof typeof REWARD_DEPOSITERS

export function getRewardStream(token: string, sender: string, recipient: string): RewardStream | undefined {
    if (token?.toLowerCase() !== OP_HAI || recipient?.toLowerCase() !== REWARD_DISTRIBUTOR) return
    const address = sender?.toLowerCase()
    if (address === REWARD_DEPOSITERS.haiVelo) return 'haiVelo'
    if (address === REWARD_DEPOSITERS.haiAero) return 'haiAero'
}
