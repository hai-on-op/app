import { useMemo } from 'react'
import { useAccount } from 'wagmi'

import { formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { useEarnStrategies } from '~/hooks'

import { HaiButton } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { Loader } from '~/components/Loader'
import { RefreshCw } from 'react-feather'

export function EarnStats() {
    const { address } = useAccount()

    const { rows } = useEarnStrategies()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const { value, apy } = useMemo(() => {
        return rows.reduce(
            (obj, { userPosition = '0', apy }) => {
                const apyToUse = apy ? apy : 0
                obj.value += parseFloat(userPosition)
                obj.apy += parseFloat(userPosition) * apyToUse
                return obj
            },
            { value: 0, apy: 0 }
        )
    }, [rows])

    const dummyStats: StatProps[] = [
        {
            header: formatNumberWithStyle(value, {
                maxDecimals: 1,
                suffixed: true,
                style: 'currency',
            }),
            label: 'Value Participating',
            tooltip: 'Total eligible value participating in DAO rewards campaign activities',
        },
        {
            header: formatNumberWithStyle(value ? apy / value : 0, {
                maxDecimals: 1,
                scalingFactor: 100,
                suffixed: true,
                style: 'percent',
            }),
            label: 'My Est. Rewards APY',
            tooltip:
                'Current estimated APY of campaign rewards based on current value participating and value of rewards tokens',
        },
        {
            // header: '$0',
            header: <Loader speed={0.5} icon={<RefreshCw />} />,
            headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
            label: 'My Campaign Rewards',
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

    return <Stats stats={dummyStats} fun />
}
