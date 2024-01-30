import type { IconProps } from '~/types'

export function Hamburger({ size = 10, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 10 8"
            width={size}
            height={0.8 * size}
            fill="none"
            stroke="black"
            strokeWidth="1.5"
            strokeLinecap="round"
            {...props}
        >
            <line x1="1" y1="1" x2="9" y2="1" />
            <line x1="1" y1="4" x2="9" y2="4" />
            <line x1="1" y1="7" x2="9" y2="7" />
        </svg>
    )
}
