import { useMemo, useState } from 'react'

import type { UserDailyEntry } from './index'

import styled from 'styled-components'
import { Flex, Text } from '~/styles'
import { Section, SectionHeader } from './index'
import { DailyDetailCard } from './DailyDetailCard'

type Props = {
    userDailyData: UserDailyEntry[]
}

export function DailyDetailList({ userDailyData }: Props) {
    const [newestFirst, setNewestFirst] = useState(true)

    const sortedData = useMemo(() => {
        const copy = [...userDailyData]
        if (newestFirst) copy.reverse()
        return copy
    }, [userDailyData, newestFirst])

    if (sortedData.length === 0) return null

    return (
        <Section>
            <Flex $width="100%" $justify="space-between" $align="center">
                <SectionHeader>DAILY DETAILS</SectionHeader>
                <SortToggle onClick={() => setNewestFirst((v) => !v)}>
                    {newestFirst ? 'Newest First' : 'Oldest First'}
                </SortToggle>
            </Flex>
            <CardList>
                {sortedData.map(({ dayReport, userData }) => (
                    <DailyDetailCard key={dayReport.date} dayReport={dayReport} userData={userData} />
                ))}
            </CardList>
        </Section>
    )
}

const CardList = styled(Flex).attrs({
    $width: '100%',
    $column: true,
    $gap: 16,
})``

const SortToggle = styled(Text).attrs({
    $fontSize: '0.85rem',
    $fontWeight: 600,
})`
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.06);
    user-select: none;

    &:hover {
        background: rgba(0, 0, 0, 0.1);
    }
`
