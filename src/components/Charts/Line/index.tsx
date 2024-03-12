import dayjs from 'dayjs'
import { type LineProps, ResponsiveLine } from '@nivo/line'

import { Timeframe } from '~/utils'

import { PointWithPopout } from './PointWithPopout'
import { BorderedLine } from './BorderedLine'

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

    return (
        <ResponsiveLine
            data={data}
            colors={(d) => d.color}
            xScale={{
                type: 'time',
                ...xScale,
            }}
            axisTop={null}
            axisBottom={{
                tickSize: 0,
                tickValues,
                format: (value) => {
                    const time = new Date(value).getTime() / 1000
                    return dayjs.unix(time).format(format)
                },
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
            // enableSlices="x"
            // enableCrosshair
            // crosshairType="bottom-right"
            {...props}
            layers={[
                // 'markers',
                // 'areas',
                'axes',
                // 'lines',
                BorderedLine,
                // 'slices',
                // 'crosshair',
                // 'points',
                ({ points }) => {
                    return points.map((point) => (
                        <PointWithPopout
                            key={point.id}
                            {...point}
                            formatX={(value: string | number) => {
                                const time = new Date(value).getTime() / 1000
                                return dayjs.unix(time).format(format)
                            }}
                            formatY={(formatY || axisRight?.format) as any}
                        />
                    ))
                },
                'legends',
            ]}
        />
    )
}
