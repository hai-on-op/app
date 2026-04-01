import styled from 'styled-components'
import { Flex, type FlexProps, FlexStyle, Text, DashedContainerStyle, type DashedContainerProps } from '~/styles'

export const Section = styled.section.attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    ...props,
}))<FlexProps>`
    ${FlexStyle}
`

export const SectionHeader = styled(Text).attrs((props) => ({
    $fontSize: '1.4rem',
    $fontWeight: 700,
    ...props,
}))``

export const DataTable = styled.table<DashedContainerProps>`
    ${DashedContainerStyle}
    width: 100%;
    border-collapse: collapse;
    padding: 0;

    &::after {
        opacity: 0.2;
    }
`

export const Th = styled.th<{ $align?: string }>`
    text-align: ${({ $align }) => $align || 'left'};
    padding: 12px 16px;
    font-size: 0.8rem;
    font-weight: 700;
    opacity: 0.6;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`

export const Td = styled.td<{ $align?: string; $color?: string }>`
    text-align: ${({ $align }) => $align || 'left'};
    padding: 12px 16px;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    color: ${({ $color }) => $color || 'inherit'};
`

export const Badge = styled.span<{ $color?: string }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    background: ${({ $color }) => ($color ? `${$color}22` : 'rgba(255,255,255,0.08)')};
    color: ${({ $color }) => $color || 'inherit'};
`

export const BoostBar = styled.div<{ $progress: number; $color: string }>`
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${({ $progress }) => Math.min(Math.max($progress, 0), 100)}%;
        background: ${({ $color }) => $color};
        border-radius: 4px;
        transition: width 0.3s ease;
    }
`
