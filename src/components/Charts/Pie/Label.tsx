import { animated } from '@react-spring/web'

type LabelProps = {
    datum: {
        value: number
    }
    style: any
    total: number
}
export const Label = ({ datum, style, total }: LabelProps) => (
    <animated.g transform={style.transform} style={{ pointerEvents: 'none' }}>
        <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={style.textColor}
            style={{
                fontSize: 14,
                fontWeight: 800,
            }}
        >
            {parseFloat(((100 * datum.value) / total).toFixed(1))}%
        </text>
    </animated.g>
)
