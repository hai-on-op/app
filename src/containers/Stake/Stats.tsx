import { useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useEarnStrategies } from '~/hooks'

import { HaiButton, Text } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { Link } from '~/components/Link'
import { Loader } from '~/components/Loader'
import { RefreshCw } from 'react-feather'
import { useStakingData } from '~/hooks/useStakeData'

export function StakeStats() {
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const stakingData = useStakingData()

    const stats: StatProps[] = useMemo(() => {
        return [
            {
                header: stakingData.stats.tvl,
                label: 'Staking TVL',
                tooltip: (
                    <span>
                        <span style={{ fontWeight: 'bold' }}>Various collateral is required to mint/borrow HAI.</span>{' '}
                        Collateral is locked in a vault, and HAI is minted/borrowed from that vault.
                    </span>
                ),
            },
            {
                header: stakingData.stats.stakedKite,
                label: 'My KITE Staked',
                tooltip: (
                    <span>
                        <span style={{ fontWeight: 'bold' }}>Various collateral is required to mint/borrow HAI.</span>{' '}
                        Collateral is locked in a vault, and HAI is minted/borrowed from that vault.
                    </span>
                ),
            },
            {
                header: stakingData.stats.stakedKiteShare,
                label: 'My stKITE Share',
                tooltip: (
                    <span>
                        <span style={{ fontWeight: 'bold' }}>Various collateral is required to mint/borrow HAI.</span>{' '}
                        Collateral is locked in a vault, and HAI is minted/borrowed from that vault.
                    </span>
                ),
            },
            {
                header: stakingData.stats.haiBoost,
                label: 'My New HAI Boost',
                tooltip: (
                    <Text>
                        Rewards derived from all campaign activities. Check out the <Link href="/earn">earn page</Link>{' '}
                        for more information.
                    </Text>
                ),
            },
            {
                // header: '$0',
                header: <Loader speed={0.5} icon={<RefreshCw />} />,
                headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
                label: 'My Staking Rewards',
                tooltip: 'Rewards currently voted upon and distributed by DAO approximately once per month.',
                button: (
                    <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                        Claim
                    </HaiButton>
                    // <HaiButton title="Claim window is closed" $variant="yellowish" disabled>
                    //     Claim
                    // </HaiButton>
                ),
            },
        ]
    }, [stakingData, popupsActions])

    return <Stats stats={stats} columns="repeat(4, 1fr) 1.6fr" fun />
}
