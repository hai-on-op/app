import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { CenteredFlex, FlexProps } from '~/styles'

type Props = {
    loading: boolean,
    loadingContent?: ReactChildren,
    error?: string,
    errorContent?: ReactChildren,
    isEmpty?: boolean,
    emptyContent?: ReactChildren,
    children: ReactChildren,
}
export function ContentWithStatus({
    loading,
    loadingContent,
    error,
    errorContent,
    isEmpty,
    emptyContent,
    children,
}: Props) {
    if (loading) return (
        <Message>
            {loadingContent || 'Loading...'}
        </Message>
    )
    if (error) return (
        <Message>
            {errorContent || 'An error occurred'}
        </Message>
    )
    if (isEmpty) return (
        <Message>
            {emptyContent || 'No items matched your search'}
        </Message>
    )

    return (<>{children}</>)
}

const Message = styled(CenteredFlex).attrs((props: FlexProps) => ({
    $width: '100%',
    $column: true,
    $gap: 24,
    $padding: '24px',
    ...props,
}))``
