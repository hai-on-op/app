import { Fragment } from 'react'
import { type CustomLayer } from '@nivo/line'

export const BorderedLine: CustomLayer = ({ series, lineGenerator, xScale, yScale }) => {
    return series.map(({ id, data, color }) => {
        const line =
            lineGenerator(
                data.map((d) => ({
                    x: (xScale as any)(d.data.x),
                    y: (yScale as any)(d.data.y),
                }))
            ) ?? undefined

        return (
            <Fragment key={id}>
                <path
                    d={line}
                    fill="none"
                    stroke="black"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d={line}
                    fill="none"
                    stroke={color}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Fragment>
        )
    })
}
