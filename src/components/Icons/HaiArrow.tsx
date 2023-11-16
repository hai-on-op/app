import type { DirectionalIconProps } from '~/types'

const transforms = {
    up: `rotate(180 10 10)`,
    down: undefined,
    left: `rotate(90 10 10)`,
    right: `rotate(-90 10 10)`,
    upRight: `rotate(-135 10 10)`,
    upLeft: `rotate(135 10 10)`,
    downRight: `rotate(-45 10 10)`,
    downLeft: `rotate(45 10 10)`
}

export function HaiArrow({ size = 20, direction = 'down', ...props }: DirectionalIconProps) {
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
            {...props}>
            <g transform={transforms[direction]}>
                <path d="m 10,2.25 v 15.5"/>
                <path d="m 3.35,10.75 6.65,7 6.65,-7"/>
            </g>
        </svg>
    )
}