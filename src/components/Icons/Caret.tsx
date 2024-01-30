import type { DirectionalIconProps } from '~/types'

const transforms = {
    up: `rotate(-90 10 10)`,
    down: `rotate(90 10 10)`,
    left: `rotate(180 10 10)`,
    right: undefined,
    upRight: `rotate(-45 10 10)`,
    upLeft: `rotate(-135 10 10)`,
    downRight: `rotate(45 10 10)`,
    downLeft: `rotate(135 10 10)`,
}

export function Caret({ size = 14, direction = 'right', ...props }: DirectionalIconProps) {
    return (
        <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="black" strokeWidth="2.5" {...props}>
            <polyline points="7,2 15,10 7,18" transform={transforms[direction]} />
        </svg>
    )
}
