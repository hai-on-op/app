import type { DirectionalIconProps } from '~/types'

const transforms = {
    up: `rotate(180 10 10)`,
    down: undefined,
    left: `rotate(90 10 10)`,
    right: `rotate(-90 10 10)`,
    upRight: `rotate(-135 10 10)`,
    upLeft: `rotate(135 10 10)`,
    downRight: `rotate(-45 10 10)`,
    downLeft: `rotate(45 10 10)`,
}

type HaiArrowIconProps = DirectionalIconProps & {
    slim?: boolean
}
export function HaiArrow({ size = 20, direction = 'down', slim, ...props }: HaiArrowIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            viewBox="0 0 20 20"
            width={size}
            height={size}
            fill="none"
            stroke="#000000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <g transform={transforms[direction]}>
                <line x1="10" y1="2.25" x2="10" y2="17.75" />
                <polyline points="3,11 10,17.75 17,11" visibility={slim ? 'hidden' : 'visible'} />
                <polyline points="5,11 10,17.75 15,11" visibility={!slim ? 'hidden' : 'visible'} />
            </g>
        </svg>
    )
}
