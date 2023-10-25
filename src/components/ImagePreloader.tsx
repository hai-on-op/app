import brandWhite from '~/assets/brand-white.svg'
import darkArrow from '~/assets/dark-arrow.svg'
import walletConnectIcon from '~/assets/connectors/walletConnectIcon.svg'
import coinbaseWalletIcon from '~/assets/connectors/coinbaseWalletIcon.svg'
import cookie from '~/assets/cookie.svg'
import caret from '~/assets/caret.png'
import caretUp from '~/assets/caret-up.svg'
import arrowUp from '~/assets/arrow-up.svg'
import logoIcon from '~/assets/LogoIcon.png'
import arrow from '~/assets/arrow.svg'
import uniswapIcon from '~/assets/uniswap-icon.svg'
import logo192 from '~/assets/logo192.png'
import metamask from '~/assets/connectors/metamask.png'
import accountImg from '~/assets/account-img.png'
import walletImg from '~/assets/wallet-img.png'
import safeImg from '~/assets/safe-img.png'

const INITIAL_STATE = [
    brandWhite,
    darkArrow,
    walletConnectIcon,
    coinbaseWalletIcon,
    cookie,
    caret,
    caretUp,
    arrowUp,
    logoIcon,
    arrow,
    uniswapIcon,
    logo192,
    metamask,
    accountImg,
    walletImg,
    safeImg,
]

const ImagePreloader = () => {
    return (
        <div style={{ display: 'none' }}>
            {INITIAL_STATE.map((img: string, i: number) => (
                <img src={img} alt="" key={img + i.toString()} />
            ))}
        </div>
    )
}

export default ImagePreloader
