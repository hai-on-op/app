import { TOKEN_LOGOS, type ISafe } from '~/utils'

import styled, { css } from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Tooltip } from '~/components/Tooltip'
import { Status, StatusLabel } from '~/components/StatusLabel'

type OverviewProps = {
    vault: ISafe
}
export function Overview({ vault }: OverviewProps) {
    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>Vault Overview #{vault.id}</Text>
            </Header>
            <Inner $borderOpacity={0.2}>
                <FullWidthOverviewStat
                    token={vault.collateralName.toUpperCase() as any}
                    label="Collateral Asset"
                    alert={{
                        value: '7.2% APY',
                        status: Status.POSITIVE
                    }}
                />
                <FullWidthOverviewStat
                    token="HAI"
                    label="Debt Asset"
                    alert={{
                        value: '-7.2% APY',
                        status: Status.NEGATIVE
                    }}
                />
                <OverviewStat
                    stat={vault.collateralRatio}
                    label="CF"
                    tooltip="blarn"
                    borderedBottom
                    borderedRight
                />
                <OverviewStat
                    stat={vault.totalAnnualizedStabilityFee}
                    label="Stability Fee APY"
                    tooltip="blarn"
                    borderedBottom
                />
                <OverviewStat
                    stat={vault.liquidationPrice}
                    label="Liq. Price"
                    tooltip="blarn"
                    borderedRight
                />
                <OverviewStat
                    stat={vault.totalAnnualizedStabilityFee}
                    label="Rewards APY"
                    tooltip="blarn"
                />
            </Inner>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    ...props
}))`
    max-width: 560px;
`
const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    ...props
}))`
    padding: 24px 0px;
`

const Inner = styled(Grid).attrs(props => ({
    $width: '100%',
    $columns: '1fr 1fr',
    $align: 'center',
    ...props
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    & > * {
        padding: 24px;
        min-height: 100px;
    }
`

type FullWidthOverviewStatProps = {
    token: keyof typeof TOKEN_LOGOS,
    label: string,
    alert: {
        value: string,
        status: Status
    }
}
function FullWidthOverviewStat({ token, label, alert }: FullWidthOverviewStatProps) {
    return (
        <FullWidthFlex>
            <Flex
                $align="center"
                $gap={12}>
                <IconContainer>
                    <img
                        src={TOKEN_LOGOS[token]}
                        alt={token}
                        width={48}
                        height={48}
                    />
                </IconContainer>
                <Flex
                    $column
                    $justify="center"
                    $align="flex-start"
                    $gap={4}>
                    <Text
                        $fontSize="1.25em"
                        $fontWeight={700}>
                        {token}
                    </Text>
                    <Text $fontSize="0.8em">{label}</Text>
                </Flex>
            </Flex>
            <StatusLabel status={alert.status}>
                {alert.value}
            </StatusLabel>
        </FullWidthFlex>
    )
}

const FullWidthFlex = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    $borderOpacity: 0.2,
    ...props
}))<DashedContainerProps>`
    grid-column: 1 / -1;
    ${DashedContainerStyle}
    border-bottom: 2px solid transparent;
    &::after {
        border-top: none;
        border-left: none;
        border-right: none;
    }
`

const IconContainer = styled(CenteredFlex)`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.thin};
    background-color: ${({ theme }) => theme.colors.greenish};
`

type OverviewStatProps = {
    stat: string,
    label: string,
    tooltip: string,
    borderedRight?: boolean,
    borderedBottom?: boolean
}
function OverviewStat({ stat, label, tooltip, borderedRight, borderedBottom }: OverviewStatProps) {
    return (
        <StatContainer
            $borderedRight={borderedRight}
            $borderedBottom={borderedBottom}>
            <Flex
                $column
                $justify="center"
                $align="flex-start"
                $gap={4}>
                <Text
                    $fontWeight={700}
                    $fontSize="1.1em">
                    {stat}
                </Text>
                <Flex $gap={4}>
                    <Text $fontSize="0.65em">{label}</Text>
                    <Tooltip>{tooltip}</Tooltip>
                </Flex>
            </Flex>
        </StatContainer>
    )
}

const StatContainer = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    $borderOpacity: 0.2,
    ...props
}))<DashedContainerProps & { $borderedBottom?: boolean, $borderedRight?: boolean }>`
    ${DashedContainerStyle}
    ${({ $borderedBottom, $borderedRight }) => css`
        border-bottom: ${$borderedBottom ? '2px solid transparent': 'none'};
        border-right: ${$borderedRight ? '2px solid transparent': 'none'};
    `}
    &::after {
        border-top: none;
        border-left: none;
        ${({ $borderedBottom }) => !$borderedBottom && css`border-bottom: none;`}
        ${({ $borderedRight }) => !$borderedRight && css`border-right: none;`}
    }
`