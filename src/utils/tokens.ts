import opImg from '~/assets/op-img.svg'
import wbtcImg from '~/assets/wbtc-img.svg'
import ttmImg from '~/assets/ttm-img.png'
import ethImg from '~/assets/eth-img.svg'
import kiteImg from '~/assets/kite-img.svg'
import wstethImg from '~/assets/wsteth-img.png'
import haiImg from '~/assets/hai-logo.svg'
import stnImg from '~/assets/stn-img.png'
import snxImg from '~/assets/snx-img.png'

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
    OP: opImg,
    WBTC: wbtcImg,
    TTM: ttmImg,
    WETH: ethImg,
    KITE: kiteImg,
    WSTETH: wstethImg,
    HAI: haiImg,
    STN: stnImg,
    SNX: snxImg,
}
