import { type TextProps, Title, Text } from '~/styles'

const colors = ['greenish', 'pinkish', 'yellowish']

type BrandedTitleProps = TextProps & {
    textContent: string
}
export function BrandedTitle({ textContent, ...props }: BrandedTitleProps) {
    return (
        <Title {...props}>
            {textContent.split(' ')
                .reduce((arr, str, i, contentArr) => {
                    // split into 3 (mostly) even sections
                    const roundedIndex = Math.floor(i / (contentArr.length / 3))
                    arr[roundedIndex] += ' ' + str
                    return arr
                }, ['', '', ''])
                .map((str, i) => (
                    <Text
                        key={i}
                        as="span"
                        $color={colors[i]}>
                        {str}
                    </Text>
                ))
            }
        </Title>
    )
}