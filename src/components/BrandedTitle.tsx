import { type TextProps, Title, Text } from '~/styles'

const colors = ['pinkish', 'greenish', 'blueish', 'orangeish']

type BrandedTitleProps = TextProps & {
    textContent: string
}
export function BrandedTitle({ textContent, ...props }: BrandedTitleProps) {
    return (
        <Title {...props}>
            {textContent.split(' ').map((str, i) => (
                <Text
                    key={i}
                    as="span"
                    $color={colors[i % colors.length]}>
                    {str + " "}
                </Text>
            ))}
        </Title>
    )
}