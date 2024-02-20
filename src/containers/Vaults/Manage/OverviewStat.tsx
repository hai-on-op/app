import type { TokenKey } from '~/types'
import { Status } from '~/utils'
import { useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, type DashedContainerProps, DashedContainerStyle, Flex, Text } from '~/styles'
import { StatusLabel } from '~/components/StatusLabel'
import { TokenArray } from '~/components/TokenArray'
import { Tooltip } from '~/components/Tooltip'
import { ProgressIndicator, ProgressIndicatorProps } from '~/components/ProgressIndicator'

type OverviewStatProps = {
    token?: TokenKey
    value: string | number
    label: string
    tooltip?: string
    convertedValue?: string | number
    alert?: {
        value?: string
        status: Status
    }
    simulatedValue?: string
    fullWidth?: boolean
}
export function OverviewStat({
    token,
    value,
    label,
    tooltip,
    convertedValue,
    alert,
    simulatedValue,
    fullWidth = false,
}: OverviewStatProps) {
    return (
        <StatContainer $fullWidth={fullWidth}>
            <Flex $align="center" $gap={12}>
                {!!token && <TokenArray size={48} tokens={[token]} hideLabel />}
                <Flex $column $justify="center" $align="flex-start" $gap={4}>
                    <ValueContainer>
                        <Text $fontSize="1.25em" $fontWeight={700}>
                            {value || '--'} {token}
                        </Text>
                        <Text $fontSize="0.8em" $color="rgba(0,0,0,0.6)">
                            {convertedValue}
                        </Text>
                    </ValueContainer>
                    <Flex $justify="flex-start" $align="center" $gap={4}>
                        <Text $fontSize="0.8em" $whiteSpace="nowrap">
                            {label}
                        </Text>
                        {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                    </Flex>
                </Flex>
            </Flex>
            <StatusContainer hidden={!simulatedValue && !alert}>
                {!!alert && (
                    <StatusLabel status={alert.status} size={0.8}>
                        {alert.value || alert.status}
                    </StatusLabel>
                )}
                {!!simulatedValue && (
                    <StatusLabel status={Status.CUSTOM} background="gradientCooler" size={0.8}>
                        <Text $fontSize="0.67rem" $fontWeight={700}>
                            {simulatedValue || '--'} {token}
                        </Text>
                        <Text $fontSize="0.67rem" $fontWeight={400} $whiteSpace="nowrap">
                            After Tx
                        </Text>
                    </StatusLabel>
                )}
            </StatusContainer>
        </StatContainer>
    )
}

type OverviewProgressStatProps = OverviewStatProps & ProgressIndicatorProps
export function OverviewProgressStat({
    value,
    label,
    tooltip,
    alert,
    simulatedValue,
    fullWidth = false,
    ...props
}: OverviewProgressStatProps) {
    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <ProgressStatContainer $fullWidth={fullWidth}>
            <Flex $width="100%" $justify="space-between" $align="center">
                <CenteredFlex $gap={4}>
                    <Text>{label}</Text>
                    <Text $fontWeight={700} $fontSize="1.25em">
                        {value}
                    </Text>
                    {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                </CenteredFlex>
                <StatusContainer hidden={!(simulatedValue && isLargerThanSmall) && !alert}>
                    {!!alert && (
                        <StatusLabel status={alert.status} size={0.8}>
                            {alert.value || alert.status}
                        </StatusLabel>
                    )}
                    {simulatedValue && isLargerThanSmall && (
                        <StatusLabel status={Status.CUSTOM} background="gradientCooler" size={0.8}>
                            <Text $fontSize="0.67rem" $fontWeight={700}>
                                {simulatedValue}
                            </Text>
                            <Text $fontSize="0.67rem" $fontWeight={400}>
                                After Tx
                            </Text>
                        </StatusLabel>
                    )}
                </StatusContainer>
            </Flex>
            <ProgressIndicator {...props} />
            {simulatedValue && !isLargerThanSmall && (
                <Flex $width="100%" $justify="flex-end" $align="center">
                    <StatusLabel status={Status.CUSTOM} background="gradientCooler" size={0.8}>
                        <Text $fontSize="0.67rem" $fontWeight={700}>
                            {simulatedValue}
                        </Text>
                        <Text $fontSize="0.67rem" $fontWeight={400}>
                            After Tx
                        </Text>
                    </StatusLabel>
                </Flex>
            )}
        </ProgressStatContainer>
    )
}

const StatContainer = styled(Flex).attrs((props) => ({
    $justify: 'space-between',
    $align: 'flex-start',
    $borderOpacity: 0.2,
    ...props,
}))<DashedContainerProps & { $fullWidth?: boolean }>`
    ${DashedContainerStyle}
    ${({ $fullWidth }) =>
        $fullWidth &&
        css`
            grid-column: 1 / -1;
        `}

    &::after {
        border-bottom: none;
        border-left: none;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 12px;
    `}
`
const ProgressStatContainer = styled(StatContainer)`
    width: 100%;
    flex-direction: column;
    gap: 12px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        & > *:nth-child(2) {
            margin-bottom: 8px;
        }
    `}
`

const ValueContainer = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 8,
    ...props,
}))`
    /* ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    `} */
`

const StatusContainer = styled(Flex).attrs((props) => ({
    $justify: 'center',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    ${({ hidden }) =>
        hidden &&
        css`
            display: none;
        `}

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 100%;
        flex-direction: column;
        justify-content: center;
        align-items: flex-end;
        // justify-content: flex-end;
        gap: 8px;
    `}
`
