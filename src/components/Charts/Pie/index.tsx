import { ResponsivePie, type PieSvgProps } from '@nivo/pie'

import { Label } from './Label'
import { ChartTooltip } from '../ChartTooltip'

export type PieChartDatum = {
    id: string
    label?: string
    value: number
    color: string
}
type PieChartProps = Omit<PieSvgProps<PieChartDatum>, 'width' | 'height'>
export function PieChart({ data, valueFormat, ...props }: PieChartProps) {
    return (
        <ResponsivePie
            data={data}
            colors={data.map((d) => d.color)}
            borderColor="black"
            borderWidth={2}
            margin={{
                top: 12,
                left: 24,
                right: 24,
                bottom: 12,
            }}
            innerRadius={0.5}
            arcLabelsComponent={(labelProps) => (
                <Label {...labelProps} total={data.reduce((total, { value }) => total + value, 0)} />
            )}
            enableArcLinkLabels={false}
            tooltip={({ datum }) => (
                <ChartTooltip
                    heading={
                        valueFormat && typeof valueFormat !== 'string'
                            ? valueFormat(datum.value)
                            : datum.value.toString()
                    }
                    subHeading={datum.id.toString()}
                    color={datum.color}
                    active
                />
            )}
            valueFormat={valueFormat}
            {...props}
        />
    )
}
