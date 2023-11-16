import type { IconProps } from '~/types'

type CaretIconProps = IconProps & {
    direction?: 'up' | 'down' | 'left' | 'right'
}
export function CaretWithOutline({ size = 20, direction = 'right', ...props }: CaretIconProps) {
    return (
        <svg
            viewBox="0 0 20 20"
            width={size}
            height={size}
            fill="black"
            stroke="black"
            strokeWidth="2"
            {...props}>
            <path d="M 4,8 10,14 16,8 14,6 10,10 6,6 Z"/>
        </svg>
    )
}
