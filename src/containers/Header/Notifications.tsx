import { useState, useMemo } from 'react'
import dayjs from 'dayjs'

import type { SetState } from '~/types'
import { parseRemainingTime } from '~/utils'
import { useOutsideClick } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Popout, Text } from '~/styles'
import { Notification as NotificationIcon } from '~/components/Icons/Notification'
import { Gear } from '~/components/Icons/Gear'

const dummyNotifications = [
    {
        message: 'Vault #423: Health Factor at 12%',
        timestamp: Date.now() / 1000 - 1 * 24 * 60 * 60,
        unread: true,
    },
    {
        message: '7,879 OP available to claim',
        timestamp: Date.now() / 1000 - 2 * 24 * 60 * 60,
        unread: false,
    },
    {
        message: 'WBTC/KITE farm now available',
        timestamp: Date.now() / 1000 - 3 * 24 * 60 * 60,
        unread: false,
    },
]

type NotificationsProps = {
    active: boolean
    setActive: SetState<boolean>
}
export function Notifications({ active, setActive }: NotificationsProps) {
    const [button, setButton] = useState<HTMLElement | null>(null)

    useOutsideClick(button, () => setActive(false))

    return (
        <NotificationButton as="div" ref={setButton} onClick={() => setActive((a) => !a)} $variant="yellowish" $notify>
            <NotificationIcon size={18} />
            {active && (
                <NotificationsDropdown $float="left" $margin="20px" onClick={(e: any) => e.stopPropagation()}>
                    <Flex $width="100%" $justify="space-between" $align="center">
                        <Text>Notifications</Text>
                        <SettingsButton>
                            <Gear size={22} />
                        </SettingsButton>
                    </Flex>
                    <Inner>
                        {dummyNotifications.map((notification, i) => (
                            <Notification key={i} {...notification} />
                        ))}
                    </Inner>
                    <CenteredFlex $width="100%">
                        <Text $fontWeight={700} $textDecoration="underline">
                            View All Notifications
                        </Text>
                    </CenteredFlex>
                </NotificationsDropdown>
            )}
        </NotificationButton>
    )
}

function Notification({ message, timestamp, unread }: any) {
    const [timeLabel, date] = useMemo(() => {
        const date = dayjs.unix(Number(timestamp)).format('MMM D, h:mm A')

        const { days, hours, minutes } = parseRemainingTime(Date.now() - 1000 * parseInt(timestamp))
        if (days > 0) return [`${days} ${days > 1 ? 'days' : 'day'} ago`, date]
        if (hours > 0) return [`${hours} ${hours > 1 ? 'hours' : 'hour'} ago`, date]
        if (minutes > 0) return [`${minutes} ${minutes > 1 ? 'minutes' : 'minute'} ago`, date]
        return ['Seconds ago', date]
    }, [timestamp])

    return (
        <NotificationContainer>
            <Flex $column $align="flex-start" $gap={4}>
                <Text>{message}</Text>
                <Text title={date} $fontSize="0.8em" $fontWeight={400}>
                    {timeLabel}
                </Text>
            </Flex>
            {unread && <Unread />}
        </NotificationContainer>
    )
}

const NotificationButton = styled(HaiButton)<{ $notify?: boolean }>`
    position: relative;
    width: 48px;
    height: 48px;
    padding: 0px;
    justify-content: center;

    ${({ $notify = false }) =>
        $notify &&
        css`
            &::after {
                content: '';
                position: absolute;
                top: -10px;
                right: -10px;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background-color: ${({ theme }) => theme.colors.reddish};
                border: ${({ theme }) => theme.border.medium};
            }
        `}
`
const NotificationsDropdown = styled(Popout)`
    width: min(400px, calc(100vw - 48px));
    padding: 24px;
    margin-right: -21px;
    gap: 24px;
    cursor: default;
`
const Inner = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))``

const NotificationContainer = styled(Grid).attrs((props) => ({
    $width: '100%',
    $columns: '1fr 32px',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    padding: 12px 16px;
    border-radius: 12px;
    border: 2px solid rgba(0, 0, 0, 0.1);
`
const Unread = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.medium};
    background: ${({ theme }) => theme.colors.reddish};
`

const SettingsButton = styled(HaiButton)`
    width: 48px;
    min-width: unset;
    height: 48px;
    padding: 0px;
    justify-content: center;
`
