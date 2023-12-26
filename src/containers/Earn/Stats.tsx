import { useStoreActions } from '~/store'

import { HaiButton } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'

export function EarnStats() {
    const { popupsModel: popupsActions } = useStoreActions(actions => actions)
    
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
            header: '$7,000',
            headerStatus: (
                <RewardsTokenPair
                    tokens={['OP', 'KITE']}
                    hideLabel
                />
            ),
            label: 'My Farm Rewards',
            tooltip: 'Hello World',
            button: (
                <HaiButton
                    $variant="yellowish"
                    onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    Claim
                </HaiButton>
            ),
        },
    ]

    return (
        <Stats stats={dummyStats}/>
    )
}
