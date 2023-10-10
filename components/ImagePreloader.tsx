const INITIAL_STATE = [
    '/assets/brand-white.svg',
    '/assets/dark-arrow.svg',
    '/assets/connectors/walletConnectIcon.svg',
    '/assets/connectors/coinbaseWalletIcon.svg',
    '/assets/cookie.svg',
    '/assets/caret.png',
    '/assets/caret-up.svg',
    '/assets/arrow-up.svg',
    '/assets/LogoIcon.png',
    '/assets/arrow.svg',
    '/assets/uniswap-icon.svg',
    '/assets/logo192.png',
    '/assets/connectors/metamask.png',
    '/assets/account-img.png',
    '/assets/wallet-img.png',
    '/assets/safe-img.png',
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
