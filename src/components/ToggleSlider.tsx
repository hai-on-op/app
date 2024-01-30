import { type ReactNode } from 'react'

import styled from 'styled-components'
import { CenteredFlex, Grid } from '~/styles'

type ToggleSliderProps = {
    selectedIndex: number
    setSelectedIndex: (index: number) => void
    children: ReactNode[]
}

export function ToggleSlider({ selectedIndex, setSelectedIndex, children }: ToggleSliderProps) {
    return (
        <Container $columns={`repeat(${children.length}, 1fr)`}>
            <Indicator
                $width={`${(100 / children.length).toFixed(2)}%`}
                $left={`${((100 * selectedIndex) / children.length).toFixed(2)}%`}
            />
            {children.map((child, i) => (
                <Wrapper key={i} onClick={() => setSelectedIndex(i)}>
                    {child}
                </Wrapper>
            ))}
        </Container>
    )
}

const Container = styled(Grid)`
    position: relative;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.gradientCool};
    flex-shrink: 0;
`

const Wrapper = styled(CenteredFlex)`
    flex-shrink: 0;
    min-width: 48px;
    padding: 0 6px;
    border-radius: 999px;
    cursor: pointer;
    z-index: 1;
`

const Indicator = styled.div<{ $width: string; $left: string }>`
    position: absolute;
    z-index: 0;
    top: 0px;
    bottom: 0px;
    left: ${({ $left }) => $left};
    width: ${({ $width }) => $width};
    padding: 0 4px;
    border: ${({ theme }) => theme.border.medium};
    background-color: white;
    border-radius: 999px;
    transition: left 0.5s ease;
`
