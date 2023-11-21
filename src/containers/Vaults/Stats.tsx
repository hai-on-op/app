import { HaiButton } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'
import { Status, StatusLabel } from '~/components/StatusLabel'

const dummyStats: StatProps[] = [
    {
        header: '$45,600',
        label: 'My Locked Collateral',
        tooltip: 'Hello World'
    },
    {
        header: '$45,600',
        label: 'My Total Debt',
        tooltip: 'Hello World'
    },
    {
        header: '7.8%',
        label: 'My Net APY',
        tooltip: 'Hello World'
    },
    // {
    //     header: '65%',
    //     headerStatus: (
    //         <StatusLabel
    //             status={Status.SAFE}
    //             size={0.8}
    //         />
    //     ),
    //     label: 'My Net CR',
    //     tooltip: 'Hello World'
    // },
    {
        header: '$7,000',
        headerStatus: (
            <RewardsTokenPair
                tokens={['OP', 'KITE']}
                hideLabel
            />
        ),
        label: 'My Vault Rewards',
        tooltip: 'Hello World',
        button: <HaiButton $variant="yellowish">Claim</HaiButton>
    }
]

export function BorrowStats() {
    // TODO: dynamically calculate stats
    return (
        <Stats
            stats={dummyStats}
            columns="repeat(3, 1fr) 1.6fr"
        />
    )
}