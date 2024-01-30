import type { IconProps } from '~/types'

type SoundIconProps = IconProps & {
    muted: boolean
}
export function Sound({ muted, size = 20, fill = 'black', ...props }: SoundIconProps) {
    const color = fill || '#000000'

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.0"
            width={size}
            height={size}
            viewBox="0 0 75 75"
            fill="none"
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
            {...props}
        >
            <path
                d="M39.389,13.769 L22.235,28.606 L6,28.606 L6,47.699 L21.989,47.699 L39.389,62.75 L39.389,13.769z"
                fill={color}
                stroke={color}
            />
            <path
                d="M48,27.6a19.5,19.5 0 0 1 0,21.4M55.1,20.5a30,30 0 0 1 0,35.6M61.6,14a38.8,38.8 0 0 1 0,48.6"
                fill="none"
                stroke={color}
                visibility={!muted ? 'visible' : 'hidden'}
            />
            <line x1="50" y1="30" x2="65" y2="45" stroke={color} visibility={!muted ? 'hidden' : 'visible'} />
            <line x1="65" y1="30" x2="50" y2="45" stroke={color} visibility={!muted ? 'hidden' : 'visible'} />
        </svg>
    )
}
