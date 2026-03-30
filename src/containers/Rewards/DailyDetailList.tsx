import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import type { UserDailyEntry } from './index'

import styled from 'styled-components'
import { Flex, Text } from '~/styles'
import { Section, SectionHeader } from './index'
import { DailyDetailCard } from './DailyDetailCard'
import { Pagination } from '~/components/Pagination'

const PER_PAGE = 7

type Props = {
    userDailyData: UserDailyEntry[]
    selectedDate: string | null
    onClearSelectedDate: () => void
}

export function DailyDetailList({ userDailyData, selectedDate, onClearSelectedDate }: Props) {
    const [newestFirst, setNewestFirst] = useState(true)
    const [page, setPage] = useState(0)
    const [expandedDate, setExpandedDate] = useState<string | null>(null)

    const sortedData = useMemo(() => {
        const copy = [...userDailyData]
        if (newestFirst) copy.reverse()
        return copy
    }, [userDailyData, newestFirst])

    // When selectedDate changes (from chart click), jump to that page and expand the card
    useEffect(() => {
        if (!selectedDate || sortedData.length === 0) return

        const index = sortedData.findIndex((d) => d.dayReport.date === selectedDate)
        if (index >= 0) {
            setPage(Math.floor(index / PER_PAGE))
            setExpandedDate(selectedDate)
        }
    }, [selectedDate, sortedData])

    const paginatedData = useMemo(() => {
        return sortedData.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
    }, [sortedData, page])

    // Date range label for current page
    const dateRangeLabel = useMemo(() => {
        if (paginatedData.length === 0) return ''
        const first = paginatedData[0].dayReport.date
        const last = paginatedData[paginatedData.length - 1].dayReport.date
        if (first === last) return dayjs(first).format('MMM D')
        return `${dayjs(first).format('MMM D')} – ${dayjs(last).format('MMM D')}`
    }, [paginatedData])

    // Available dates for the jump dropdown
    const dateOptions = useMemo(() => {
        return sortedData.map((d) => d.dayReport.date)
    }, [sortedData])

    const handleDateJump = useCallback(
        (date: string) => {
            const index = sortedData.findIndex((d) => d.dayReport.date === date)
            if (index >= 0) {
                setPage(Math.floor(index / PER_PAGE))
                setExpandedDate(date)
                onClearSelectedDate()
            }
        },
        [sortedData, onClearSelectedDate]
    )

    const handleSortToggle = useCallback(() => {
        setNewestFirst((v) => !v)
        setPage(0)
    }, [])

    const handlePageChange = useCallback((offset: number) => {
        setPage(offset)
        setExpandedDate(null)
    }, [])

    const handleToggleCard = useCallback(
        (date: string) => {
            setExpandedDate((prev) => (prev === date ? null : date))
            if (selectedDate) onClearSelectedDate()
        },
        [selectedDate, onClearSelectedDate]
    )

    if (sortedData.length === 0) return null

    return (
        <Section>
            {/* Controls row */}
            <ControlsRow>
                <Flex $gap={12} $align="center" $flexWrap>
                    <SectionHeader>DAILY DETAILS</SectionHeader>
                    <Text $fontSize="0.85rem" style={{ opacity: 0.5 }}>
                        {dateRangeLabel}
                    </Text>
                </Flex>
                <Flex $gap={8} $align="center" $flexWrap>
                    <DateSelect
                        value=""
                        onChange={(e) => {
                            if (e.target.value) handleDateJump(e.target.value)
                        }}
                    >
                        <option value="">Jump to date...</option>
                        {dateOptions.map((date) => (
                            <option key={date} value={date}>
                                {dayjs(date).format('MMM D, YYYY')}
                            </option>
                        ))}
                    </DateSelect>
                    <SortToggle onClick={handleSortToggle}>
                        {newestFirst ? 'Newest First' : 'Oldest First'}
                    </SortToggle>
                </Flex>
            </ControlsRow>

            {/* Cards */}
            <CardList>
                {paginatedData.map(({ dayReport, userData }) => (
                    <DailyDetailCard
                        key={dayReport.date}
                        dayReport={dayReport}
                        userData={userData}
                        expanded={expandedDate === dayReport.date}
                        onToggle={() => handleToggleCard(dayReport.date)}
                    />
                ))}
            </CardList>

            {/* Pagination */}
            <Pagination totalItems={sortedData.length} perPage={PER_PAGE} handlePagingMargin={handlePageChange} />
        </Section>
    )
}

const ControlsRow = styled(Flex).attrs({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
})`
    flex-wrap: wrap;
`

const CardList = styled(Flex).attrs({
    $width: '100%',
    $column: true,
    $gap: 8,
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
    white-space: nowrap;

    &:hover {
        background: rgba(0, 0, 0, 0.1);
    }
`

const DateSelect = styled.select`
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.3);
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    outline: none;

    &:hover {
        border-color: rgba(0, 0, 0, 0.3);
    }
`
