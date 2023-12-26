import type { TokenKey } from '~/types'
import { Status } from '~/utils'

import styled, { css } from 'styled-components'
import { CenteredFlex, type DashedContainerProps, DashedContainerStyle, Flex, Text } from '~/styles'
import { StatusLabel } from '~/components/StatusLabel'
import { TokenPair } from '~/components/TokenPair'
import { Tooltip } from '~/components/Tooltip'
import { ProgressBar, ProgressBarProps } from '~/components/ProgressBar'

type OverviewStatProps = {
    token?: TokenKey,
    value: string | number,
    label: string,
    tooltip?: string,
    convertedValue?: string | number,
    alert?: {
        value?: string,
        status: Status
    },
    simulatedValue?: string,
    fullWidth?: boolean,
    borderedRight?: boolean,
    borderedBottom?: boolean,
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
    borderedRight = false,
    borderedBottom = false,
}: OverviewStatProps) {
    return (
        <StatContainer
            $fullWidth={fullWidth}
            $borderedRight={borderedRight}
            $borderedBottom={borderedBottom}>
            <Flex
                $align="center"
                $gap={12}>
                {!!token && (
                    <TokenPair
                        size={96}
                        tokens={[token]}
                        hideLabel
                    />
                )}
                <Flex
                    $column
                    $justify="center"
                    $align="flex-start"
                    $gap={4}>
                    <Flex
                        $justify="flex-start"
                        $align="center"
                        $gap={8}>
                        <Text
                            $fontSize="1.25em"
                            $fontWeight={700}>
                            {value || '--'} {token}
                        </Text>
                        <Text
                            $fontSize="0.8em"
                            $color="rgba(0,0,0,0.6)">
                            {convertedValue}
                        </Text>
                    </Flex>
                    <Flex
                        $justify="flex-start"
                        $align="center"
                        $gap={4}>
                        <Text $fontSize="0.8em">{label}</Text>
                        {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                    </Flex>
                </Flex>
            </Flex>
            <CenteredFlex $gap={12}>
                {!!simulatedValue && (
                    <StatusLabel
                        status={Status.CUSTOM}
                        background="gradient"
                        size={0.8}>
                        <Text
                            $fontSize="0.67rem"
                            $fontWeight={700}>
                            {simulatedValue || '--'} {token}
                        </Text>
                        <Text
                            $fontSize="0.67rem"
                            $fontWeight={400}>
                            After Tx
                        </Text>
                    </StatusLabel>
                )}
                {!!alert && (
                    <StatusLabel
                        status={alert.status}
                        size={0.8}>
                        {alert.value || alert.status}
                    </StatusLabel>
                )}
            </CenteredFlex>
        </StatContainer>
    )
}

type OverviewProgressStatProps = OverviewStatProps & ProgressBarProps
export function OverviewProgressStat({
    value,
    label,
    tooltip,
    alert,
    simulatedValue,
    progress,
    simulatedProgress,
    colorLimits,
    labels,
    fullWidth = false,
    borderedRight = false,
    borderedBottom = false,
}: OverviewProgressStatProps) {
    return (
        <StatContainer
            $fullWidth={fullWidth}
            $borderedRight={borderedRight}
            $borderedBottom={borderedBottom}>
            <Flex
                $width="100%"
                $column
                $gap={12}>
                <Flex
                    $width="100%"
                    $justify="space-between"
                    $align="center">
                    <CenteredFlex $gap={4}>
                        <Text>{label}</Text>
                        <Text
                            $fontWeight={700}
                            $fontSize="1.25em">
                            {value}
                        </Text>
                        {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                    </CenteredFlex>
                    <CenteredFlex $gap={8}>
                        {simulatedValue && (
                            <StatusLabel
                                status={Status.CUSTOM}
                                background="gradient"
                                size={0.8}>
                                <Text
                                    $fontSize="0.67rem"
                                    $fontWeight={700}>
                                    {simulatedValue}
                                </Text>
                                <Text
                                    $fontSize="0.67rem"
                                    $fontWeight={400}>
                                    After Tx
                                </Text>
                            </StatusLabel>
                        )}
                        {!!alert && (
                            <StatusLabel
                                status={alert.status}
                                size={0.8}>
                                {alert.value || alert.status}
                            </StatusLabel>
                        )}
                    </CenteredFlex>
                </Flex>
                <ProgressBar
                    progress={progress}
                    simulatedProgress={simulatedProgress}
                    colorLimits={colorLimits}
                    labels={labels}
                />
            </Flex>
        </StatContainer>
    )
}

const StatContainer = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    $borderOpacity: 0.2,
    ...props,
}))<DashedContainerProps & {
    $fullWidth?: boolean,
    $borderedBottom?: boolean,
    $borderedRight?: boolean
}>`
    ${DashedContainerStyle}
    height: 100px;
    ${({ $fullWidth }) => $fullWidth && css`grid-column: 1 / -1;`}
    ${({ $borderedBottom, $borderedRight }) => css`
        border-bottom: ${$borderedBottom ? '2px solid transparent': 'none'};
        border-right: ${$borderedRight ? '2px solid transparent': 'none'};
    `}
    &::after {
        border-top: none;
        border-left: none;
        ${({ $borderedBottom }) => !$borderedBottom && css`border-bottom: none;`}
        ${({ $borderedRight }) => !$borderedRight && css`border-right: none;`}
    }
`
