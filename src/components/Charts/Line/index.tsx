import dayjs from 'dayjs'
import { useMemo } from 'react'
import { type LineProps, ResponsiveLine, type SliceTooltipProps } from '@nivo/line'
import styled from 'styled-components'

import { Timeframe } from '~/utils'
import { Text } from '~/styles'

import { BorderedLine } from './BorderedLine'
import { downsampleSeriesPoints } from './downsample'

const formatMap: Record<Timeframe, { format: string; tickValues: number }> = {
    [Timeframe.ONE_DAY]: {
        format: `M/D HH:mm`,
        tickValues: 4,
    },
    [Timeframe.ONE_WEEK]: {
        format: `M/D`,
        tickValues: 7,
    },
    [Timeframe.ONE_MONTH]: {
        format: `M/D`,
        tickValues: 4,
    },
    [Timeframe.ONE_YEAR]: {
        format: `'YY/M/D`,
        tickValues: 4,
    },
}

type LineChartProps = LineProps & {
    timeframe: Timeframe
    formatY?: (value: string | number) => string
}
export function LineChart({
    data,
    timeframe,
    formatY,
    axisBottom,
    xScale,
    axisRight,
    yScale,
    ...props
}: LineChartProps) {
    const { format, tickValues } = formatMap[timeframe]
    const chartData = useMemo(
        () =>
            data.map((serie) => ({
                ...serie,
                data: downsampleSeriesPoints(serie.data),
            })),
        [data]
    )
    const hasChartData = chartData.some((serie) => Array.isArray(serie.data) && serie.data.length > 0)

    const formatXValue = (value: string | number | Date) => {
        const time = new Date(value).getTime() / 1000
        return dayjs.unix(time).format(format)
    }

    const formatYValue = (value: string | number) => {
        if (formatY) return formatY(value)
        if (axisRight?.format) return String(axisRight.format(value))
        return String(value)
    }

    return (
        <ResponsiveLine
            data={chartData}
            colors={(d) => d.color}
            xScale={{
                type: 'time',
                ...xScale,
            }}
            axisTop={null}
            axisBottom={{
                tickSize: 0,
                tickValues,
                format: formatXValue,
                ...axisBottom,
            }}
            yScale={{
                type: 'linear',
                ...yScale,
            }}
            axisLeft={{
                tickSize: 0,
                tickValues: 0,
                tickPadding: -50,
            }}
            axisRight={{
                tickSize: 0,
                tickValues: 5,
                tickPadding: -50,
                ...axisRight,
            }}
            margin={{
                top: 32,
                left: 0,
                right: 0,
                bottom: 32,
            }}
            lineWidth={10}
            enablePoints={false}
            enableGridX={false}
            enableGridY={false}
            enableSlices={hasChartData ? 'x' : false}
            enableCrosshair={hasChartData}
            sliceTooltip={({ slice }: SliceTooltipProps) => (
                <LineSliceTooltip slice={slice} formatX={formatXValue} formatY={formatYValue} />
            )}
            {...props}
            layers={['axes', BorderedLine, 'crosshair', 'slices', 'legends']}
        />
    )
}

type LineSliceTooltipComponentProps = {
    slice: SliceTooltipProps['slice']
    formatX: (value: string | number | Date) => string
    formatY: (value: string | number) => string
}

function LineSliceTooltip({ slice, formatX, formatY }: LineSliceTooltipComponentProps) {
    const firstPoint = slice.points[0]
    const label = firstPoint ? formatX(firstPoint.data.x as string | number | Date) : ''

    return (
        <TooltipCard data-chart-tooltip="line-slice">
            {!!label && <TooltipLabel>{label}</TooltipLabel>}
            {slice.points.map((point) => (
                <TooltipRow key={String(point.id)}>
                    <TooltipSeries>
                        <TooltipSwatch $color={point.serieColor} />
                        <Text $fontSize="0.85em" $fontWeight={700} $color={point.serieColor}>
                            {point.serieId}
                        </Text>
                    </TooltipSeries>
                    <Text $fontSize="0.95em" $fontWeight={700}>
                        {formatY(point.data.yFormatted)}
                    </Text>
                </TooltipRow>
            ))}
        </TooltipCard>
    )
}

const TooltipCard = styled.div`
    min-width: 180px;
    padding: 12px 16px;
    background-color: ${({ theme }) => theme.colors.background};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 20px;
    box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.12);
`

const TooltipLabel = styled(Text).attrs((props) => ({
    $fontSize: '0.8em',
    $fontWeight: 700,
    ...props,
}))`
    display: block;
    margin-bottom: 8px;
`

const TooltipRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    & + & {
        margin-top: 8px;
    }
`

const TooltipSeries = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`

const TooltipSwatch = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border: 2px solid black;
    border-radius: 999px;
    background-color: ${({ $color }) => $color};
    flex-shrink: 0;
`
