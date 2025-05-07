import type { TokenKey } from '~/types'
import { Status } from '~/utils'
import { useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, type DashedContainerProps, DashedContainerStyle, Flex, Text } from '~/styles'
import { StatusLabel } from '~/components/StatusLabel'
import { TokenArray } from '~/components/TokenArray'
import { Tooltip } from '~/components/Tooltip'
import { ProgressIndicator, ProgressIndicatorProps } from '~/components/ProgressIndicator'
import { ComingSoon } from '~/components/ComingSoon'
import { Loader } from '~/components/Loader'
type OverviewStatProps = {
    token?: TokenKey
    simulatedToken?: string
    value: string | number
    tokenLabel?: string
    isComingSoon?: boolean
    label: string
    labelOnTop?: boolean
    tooltip?: string
    convertedValue?: string | number
    alert?: {
        value?: string
        status: Status
    }
    simulatedValue?: string
    fullWidth?: boolean
    simulationMode?: boolean
    loading?: boolean
}
export function OverviewStat({
    token,
    simulatedToken,
    tokenLabel,
    isComingSoon = false,
    value,
    label,
    labelOnTop = false,
    tooltip,
    convertedValue,
    alert,
    simulatedValue,
    simulationMode = false,
    fullWidth = false,
    loading = false,
}: OverviewStatProps) {
    return (
        <StatContainer $fullWidth={fullWidth}>
            {isComingSoon ? (
                <>
                    <div style={{ width: '100%', marginTop: '20px' }}>
                        <ComingSoon active={true} width="100%" />
                    </div>
                    <div style={{ width: '100%', marginTop: '20px' }}>
                        <Flex $justify="flex-start" $align="center" $gap={4}>
                            <Text $fontSize="0.8em" $whiteSpace="nowrap">
                                {label}
                            </Text>
                            {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                        </Flex>
                    </div>
                </>
            ) : (
                <>
                    {labelOnTop && (
                        <Flex $justify="flex-start" $align="center" $gap={4}>
                            <Text $fontSize="0.8em" $whiteSpace="nowrap">
                                {label}
                            </Text>
                            {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                        </Flex>
                    )}
                    <Flex $align="center" $gap={12}>
                        {!!token && <TokenArray size={48} tokens={[token]} hideLabel />}
                        <Flex $column $justify="center" $align="flex-start" $gap={4}>
                            <ValueContainer>
                                {loading ? (
                                    <Loader size={32} hideSpinner={false} color="#FFD641"></Loader>
                                ) : (
                                    <>
                                        <Text $fontSize="1.5em" $fontWeight={700}>
                                            {value || '--'} {tokenLabel}
                                        </Text>
                                        <Text $fontSize="1.2em" $color="rgba(0,0,0,0.6)">
                                            {convertedValue}
                                        </Text>
                                    </>
                                )}
                            </ValueContainer>
                        </Flex>
                    </Flex>
                    {!labelOnTop && (
                        <Flex $justify="flex-start" $align="center" $gap={4}>
                            <Text $fontSize="0.8em" $whiteSpace="nowrap">
                                {label}
                            </Text>
                            {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                        </Flex>
                    )}
                    <StatusContainer hidden={!simulatedValue && !alert}>
                        {!!alert && (
                            <StatusLabel status={alert.status} size={0.8}>
                                {alert.value || alert.status}
                            </StatusLabel>
                        )}
                        {!!simulatedValue && !loading && (
                            <StatusLabel status={Status.CUSTOM} background="gradient" size={0.8}>
                                <Text $fontSize="0.67rem" $fontWeight={700}>
                                    {simulatedValue || '--'} {simulatedToken ? simulatedToken : token}
                                </Text>
                                <Text $fontSize="0.67rem" $fontWeight={400} $whiteSpace="nowrap">
                                    After Tx
                                </Text>
                            </StatusLabel>
                        )}
                        {/* {simulationMode && (
                            <StatusLabel status={Status.CUSTOM} background="gradient" size={0.8}>
                                <Text $fontSize="0.67rem" $fontWeight={700}>
                                    {simulatedValue || '--'} {token}
                                </Text>
                                <Text $fontSize="0.67rem" $fontWeight={400} $whiteSpace="nowrap">
                                    After Tx
                                </Text>
                            </StatusLabel>
                        )} */}
                    </StatusContainer>
                </>
            )}
        </StatContainer>
    )
}

type OverviewProgressStatProps = OverviewStatProps & ProgressIndicatorProps
export function OverviewProgressStat({
    value,
    label,
    tooltip,
    isComingSoon = false,
    alert,
    simulatedValue,
    fullWidth = false,
    loading = false,
    progress: progressProp,
    simulatedProgress: simulatedProgressProp,
    colorLimits,
    labels,
    ...otherProps
}: OverviewProgressStatProps) {
    const isUpToSmall = useMediaQuery('upToSmall')

    // Ensure value is a number between 1 and 2
    const clampedValue = Math.min(Math.max(Number(value) || 1, 1), 2)

    // Format the value display with 'x' suffix
    const formattedValue = `${clampedValue.toFixed(2)}x`

    // Format simulatedValue with 'x' suffix if it exists
    const formattedSimulatedValue = simulatedValue
        ? typeof simulatedValue === 'number'
            ? `${Math.min(Math.max(simulatedValue, 1), 2).toFixed(2)}x`
            : simulatedValue.endsWith('x')
                ? simulatedValue
                : `${simulatedValue}x`
        : undefined

    // Create progress object if not provided
    const progressObj = progressProp || { 
        progress: clampedValue - 1, 
        label: formattedValue 
    }

    // Create simulated progress object if not provided but simulatedValue exists
    const simulatedProgressObj = simulatedProgressProp || (
        formattedSimulatedValue
            ? {
                progress: Number(formattedSimulatedValue.replace('x', '')) - 1,
                label: formattedSimulatedValue,
            }
            : undefined
    )

    // Default colorLimits and labels if not provided
    const defaultColorLimits = [0.25, 0.5, 0.75]
    const defaultLabels = [
        { progress: 0, label: '1x' },
        { progress: 0.25, label: '1.25x' },
        { progress: 0.5, label: '1.5x' },
        { progress: 0.75, label: '1.75x' },
        { progress: 1, label: '2x' },
    ]

    return (
        <ProgressStatContainer $fullWidth={fullWidth}>
            <Flex $width="100%" $justify="space-between" $align="center">
                <CenteredFlex $gap={4}>
                    <Text>{label}</Text>
                    {!isComingSoon && !loading && (
                        <Text $fontWeight={700} $fontSize="1.25em">
                            {formattedValue}
                        </Text>
                    )}
                    {!isComingSoon && loading && (
                        <Loader size={24} hideSpinner={false} color="#FFD641" />
                    )}

                    {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                </CenteredFlex>
                {isComingSoon && <ComingSoon active={true} width="100%" />}
                <StatusContainer hidden={!(formattedSimulatedValue && !isUpToSmall) && !alert}>
                    {!isComingSoon && !!alert && (
                        <StatusLabel status={alert.status} size={0.8}>
                            {alert.value || alert.status}
                        </StatusLabel>
                    )}

                    {!isComingSoon && formattedSimulatedValue && !isUpToSmall && !loading && (
                        <StatusLabel status={Status.CUSTOM} background="gradient" size={0.8}>
                            <Text $fontSize="0.67rem" $fontWeight={700}>
                                {formattedSimulatedValue}
                            </Text>
                            <Text $fontSize="0.67rem" $fontWeight={400}>
                                After Tx
                            </Text>
                        </StatusLabel>
                    )}
                </StatusContainer>
            </Flex>
            {!loading ? (
                <ProgressIndicator
                    progress={progressObj}
                    simulatedProgress={simulatedProgressObj}
                    colorLimits={colorLimits || defaultColorLimits}
                    labels={labels || defaultLabels}
                    {...otherProps}
                />
            ) : (
                <Flex $width="100%" $justify="center" $align="center" $padding="12px 0">
                    <Loader size={32} hideSpinner={false} color="#FFD641" />
                </Flex>
            )}
            {formattedSimulatedValue && isUpToSmall && !loading && (
                <Flex $width="100%" $justify="flex-end" $align="center">
                    <StatusLabel status={Status.CUSTOM} background="gradient" size={0.8}>
                        <Text $fontSize="0.67rem" $fontWeight={700}>
                            {formattedSimulatedValue}
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
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 4,
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
        font-size: 0.8rem;
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
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 0,
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
