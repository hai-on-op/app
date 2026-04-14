import { lazy, Suspense } from 'react'

import { HaiButton, type FlexProps } from '~/styles'

const ConnectButton = lazy(async () => ({
    default: (await import('./ConnectButton')).ConnectButton,
}))

type ConnectButtonProps = FlexProps & {
    showBalance?: 'horizontal' | 'vertical'
}

export function LazyConnectButton(props: ConnectButtonProps) {
    return (
        <Suspense fallback={<FallbackButton {...props}>Wallet</FallbackButton>}>
            <ConnectButton {...props} />
        </Suspense>
    )
}

const FallbackButton = HaiButton
