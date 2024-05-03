import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { Flex, type FlexProps } from '~/styles'
import { Copy } from 'react-feather'

type CopyableProps = FlexProps & {
    text: string
    children: ReactChildren
    limitClickToIcon?: boolean
}
export function Copyable({ text, children, limitClickToIcon = false, ...props }: CopyableProps) {
    const onCopy = () => navigator.clipboard.writeText(text)
    return (
        <Container
            $width="fit-content"
            $justify="flex-start"
            $align="center"
            $gap={8}
            onClick={!limitClickToIcon ? onCopy : undefined}
            {...props}
        >
            {children}
            <Copy onClick={!limitClickToIcon ? undefined : onCopy} />
        </Container>
    )
}

const Container = styled(Flex)`
    ${({ onClick }) =>
        !!onClick &&
        css`
            cursor: pointer;
            &:active {
                opacity: 0.5;
            }
        `}

    & > svg {
        width: auto;
        height: 16px;
        ${({ onClick }) =>
            !onClick &&
            css`
                cursor: pointer;
                &:active {
                    opacity: 0.5;
                }
            `}
    }
`
