import * as icons from 'react-feather'

export type IconName = keyof typeof icons

export type IconProps = {
    name: IconName
} & icons.IconProps

export function FeatherIconWrapper({ name, ...rest }: IconProps) {
    const IconComponent = icons[name]
    return <IconComponent {...rest} />
}
