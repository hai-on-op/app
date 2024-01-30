import type { IconProps } from '~/types'

export function X({ size, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 20 20"
            width={size}
            height={size}
            fill="none"
            stroke="black"
            strokeWidth={2.5}
            strokeLinecap="round"
            {...props}
        >
            <path d="M 1,1 19,19" />
            <path d="M 19,1 1,19" />
        </svg>
    )
}
