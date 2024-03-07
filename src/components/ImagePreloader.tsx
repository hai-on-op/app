import logoIcon from '~/assets/LogoIcon.png'
import popout from '~/assets/popout.svg'
import border from '~/assets/border-image.png'
import uniswapIcon from '~/assets/uniswap-icon.svg'
import velodromeIcon from '~/assets/velodrome-img.svg'
import haiLogo from '~/assets/logo.png'
import logo192 from '~/assets/logo192.png'

const INITIAL_STATE = [logoIcon, popout, border, uniswapIcon, velodromeIcon, haiLogo, logo192]

export function ImagePreloader() {
    return (
        <div style={{ display: 'none' }}>
            {INITIAL_STATE.map((img: string, i: number) => (
                <img src={img} alt="" key={img + i.toString()} />
            ))}
        </div>
    )
}
