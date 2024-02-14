import { useAccount } from 'wagmi'

// import { useStoreActions } from '~/store'

import { HaiButton } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'

export function EarnStats() {
    const { address } = useAccount()

    // const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    // TODO: dynamically calculate stats
    const dummyStats: StatProps[] = [
        {
            header: '$45,600',
            label: 'My Farm TVL',
            tooltip: 'Hello World',
        },
        {
            header: '7.8%',
            label: 'My Net Farm Rewards APY',
            tooltip: 'Hello World',
        },
        {
            header: '$--',
            headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
            label: 'My Farm Rewards',
            tooltip: 'Rewards currently voted upon and distributed by DAO approximately once per month.',
            button: (
                <HaiButton title="Claim window is closed" $variant="yellowish" disabled>
                    Claim
                </HaiButton>
            ),
        },
        // {
        //     header: '$7,000',
        //     headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
        //     label: 'My Farm Rewards',
        //     tooltip: 'Hello World',
        //     button: (
        //         <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
        //             Claim
        //         </HaiButton>
        //     ),
        // },
    ]

    if (!address) return null

    return <Stats stats={dummyStats} />
}
