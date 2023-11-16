import type { IconProps } from '~/types'

export function DarkArrow({ size = 15.6, ...props }: IconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={9.168 * size / 15.6}
            viewBox="0 0 15.641 9.168"
            fill="#a4abb7"
            {...props}>
            <path
                d="M83.035,11.129l4.584-4.584L83.035,1.962,82.011,2.976,84.84,5.8H71.979V7.286H84.84l-2.829,2.819Z"
                transform="translate(87.619 11.129) rotate(180)"
            />
        </svg>
    )
}
