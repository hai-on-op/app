export type Tokens = {
    [key: string]: {
        name: string
        icon: string
        gebName: string
        balance: string
        address: string
    }
}

export const TOKEN_LOGOS: { [key: string]: string } = {
    OP: '/assets/op-img.svg',
    WBTC: '/assets/wbtc-img.svg',
    TTM: '/assets/ttm-img.png',
    WETH: '/assets/eth-img.svg',
    HAI: '/assets/hai-logo.svg',
    STN: '/assets/stn-img.png',
    SNX: '/assets/snx-img.png',
}
