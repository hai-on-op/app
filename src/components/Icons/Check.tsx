import type { IconProps } from '~/types'

export function Check({ size = 20, ...props }: IconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            viewBox="0 0 20 20"
            width={size}
            height={size}
            fill="none"
            stroke="black"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="m 4,10 4,4 8,-8" />
        </svg>
    )
}
