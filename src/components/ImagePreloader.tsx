import darkArrow from '~/assets/dark-arrow.svg'
import caretUp from '~/assets/caret-up.svg'
import arrowUp from '~/assets/arrow-up.svg'
import logoIcon from '~/assets/LogoIcon.png'
import arrow from '~/assets/arrow.svg'
import popout from '~/assets/popout.svg'
import border from '~/assets/border-image.png'
import uniswapIcon from '~/assets/uniswap-icon.svg'
import velodromeIcon from '~/assets/velodrome-img.svg'
import haiLogo from '~/assets/logo.png'
import logo192 from '~/assets/logo192.png'

const INITIAL_STATE = [
    darkArrow,
    caretUp,
    arrowUp,
    logoIcon,
    arrow,
    popout,
    border,
    uniswapIcon,
    velodromeIcon,
    haiLogo,
    logo192,
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
