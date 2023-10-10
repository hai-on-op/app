import { useRouter } from 'next/router'

import SafeDetails from '@/containers/Safes/SafeDetails'

export default function SafeDetailsPage() {
    const router = useRouter()

    const isDeposit = Array.isArray(router.query.slug)
        ? router.query.slug?.[0] === 'deposit'
        : router.query.slug === 'deposit'

    const isWithdraw =
        router.query.slug && Array.isArray(router.query.slug)
            ? router.query.slug?.[0] === 'withdraw'
            : router.query.slug === 'withdraw'

    return (
        <SafeDetails
            safeId={typeof router.query.id === 'string' ? router.query.id : ''}
            isDeposit={isDeposit}
            isWithdraw={isWithdraw}
        />
    )
}
