import { isMobile } from 'react-device-detect'
import Lottie from 'react-lottie-player'

import LottieRegister from '~/utils/Lotties/register.json'
import LottieSafe from '~/utils/Lotties/vault.json'
import LottieWallet from '~/utils/Lotties/wallet.json'
import { useStoreState } from '~/store'

import styled from 'styled-components'
import Steps from '~/components/Steps'

import accountImg from '~/assets/account-img.png'
import safeImg from '~/assets/safe-img.png'
import walletImg from '~/assets/wallet-img.png'

const lotties = Object.values({
    register: {
        mobileImg: accountImg,
        animation: LottieRegister,
        size: 400,
    },
    safe: {
        mobileImg: safeImg,
        animation: LottieSafe,
        size: 400,
    },
    wallet: {
        mobileImg: walletImg,
        animation: LottieWallet,
        size: 350,
    },
})

const Accounts = () => {
    const { connectWalletModel: connectWalletState } = useStoreState((state) => state)

    const { step } = connectWalletState

    const returnLottie = () => {
        if (!lotties[step]) return null

        const { mobileImg, animation, size } = lotties[step]

        if (isMobile) return (
            <img
                src={mobileImg}
                alt=""
            />
        )
        return (
            <Lottie
                loop
                play
                animationData={animation}
                style={{
                    width: size,
                    height: size,
                }}
            />
        )
    }
    return (
        <Container>
            <Content>
                <LottieContainer>
                    {returnLottie()}
                </LottieContainer>
                <Steps />
            </Content>
        </Container>
    )
}

export default Accounts

const Container = styled.div`
    padding: 30px 20px;
`

const Content = styled.div`
    max-width: 1024px;
    margin: 0 auto;
`

const LottieContainer = styled.div`
    @media (max-width: 767px) {
        text-align: center;
    }
    & img {
        border-radius: 20px;
        max-width: 250px;
        margin: 0 auto;
    }
    & > div {
        margin: 0 auto;
    }
`
