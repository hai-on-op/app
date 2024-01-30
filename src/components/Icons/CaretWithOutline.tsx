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

export function CaretWithOutline({ size = 20, direction = 'down', ...props }: DirectionalIconProps) {
    return (
        <svg viewBox="0 0 20 20" width={size} height={size} fill="black" stroke="black" strokeWidth="2" {...props}>
            <path d="M 4,8 10,14 16,8 14,6 10,10 6,6 Z" transform={transforms[direction]} />
        </svg>
    )
}
