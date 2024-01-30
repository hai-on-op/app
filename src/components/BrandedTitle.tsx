import { type TextProps, Title, Text } from '~/styles'

const colors = ['pinkish', 'greenish', 'blueish', 'orangeish']

type BrandedTitleProps = TextProps & {
    textContent: string
    colorOffset?: number
}
export function BrandedTitle({ textContent, colorOffset = 0, ...props }: BrandedTitleProps) {
    return (
        <Title {...props}>
            {textContent.split(' ').map((str, i) => (
                <Text key={i} as="span" $color={colors[(i + colorOffset) % colors.length]}>
                    {str + ' '}
                </Text>
            ))}
        </Title>
    )
}
