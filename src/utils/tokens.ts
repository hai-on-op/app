import opImg from '../assets/op-img.svg'
import wbtcImg from '../assets/wbtc-img.svg'
import ttmImg from '../assets/ttm-img.png'
import ethImg from '../assets/eth-img.svg'
import haiImg from '../assets/hai-logo.svg'
import stnImg from '../assets/stn-img.png'
import wstethImg from '../assets/wsteth.svg'
import snxImg from '../assets/snx-img.png'

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
    OP: opImg,
    WBTC: wbtcImg,
    TTM: ttmImg,
    WETH: ethImg,
    HAI: haiImg,
    STN: stnImg,
    WSTETH: wstethImg,
    SNX: snxImg,
}
