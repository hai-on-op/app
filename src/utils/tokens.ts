import haiImg from '~/assets/hai-logo.svg'
import kiteImg from '~/assets/kite-img.svg'
import opImg from '~/assets/op-img.svg'
import snxImg from '~/assets/snx-img.png'
import stnImg from '~/assets/stn-img.png'
import ttmImg from '~/assets/ttm-img.png'
import wbtcImg from '~/assets/wbtc-img.svg'
import wethImg from '~/assets/eth-img.svg'
import wstethImg from '~/assets/wsteth-img.png'

export type Tokens = {
    [key: string]: {
        name: string
        icon: string
        gebName: string
        balance: string
        address: string
    }
}

export const TOKEN_LOGOS = {
    HAI: haiImg,
    KITE: kiteImg,
    OP: opImg,
    SNX: snxImg,
    STN: stnImg,
    TTM: ttmImg,
    WBTC: wbtcImg,
    WETH: wethImg,
    WSTETH: wstethImg,
}
