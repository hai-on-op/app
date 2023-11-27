import { TOKEN_LOGOS, type ISafe, formatDataNumber } from '~/utils'

import styled, { css } from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Swirl } from '~/components/Icons/Swirl'
import { Tooltip } from '~/components/Tooltip'
import { Status, StatusLabel } from '~/components/StatusLabel'
import { TokenPair } from '~/components/TokenPair'

type OverviewProps = {
    vault: ISafe,
    simulation?: Partial<ISafe>
}
export function Overview({ vault, simulation }: OverviewProps) {
    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>Vault Overview #{vault.id}</Text>
                {!!simulation && (
                    <StatusLabel
                        status={Status.CUSTOM}
                        background="gradient">
                        <CenteredFlex $gap={8}>
                            <Swirl size={14}/>
                            <Text
                                $fontSize="0.67rem"
                                $fontWeight={700}>
                                Simulation
                            </Text>
                        </CenteredFlex>
                    </StatusLabel>
                )}
            </Header>
            <Inner $borderOpacity={0.2}>
                <OverviewStat
                    value={vault.collateral ? formatDataNumber(vault.collateral): ''}
                    token={vault.collateralName.toUpperCase() as any}
                    label="Collateral Asset"
                    simulatedValue={simulation?.collateral ? formatDataNumber(simulation.collateral): ''}
                    alert={{
                        value: '7.2% APY',
                        status: Status.POSITIVE
                    }}
                    fullWidth
                    borderedBottom
                />
                <OverviewStat
                    value={vault.debt ? formatDataNumber(vault.debt): ''}
                    token="HAI"
                    label="Debt Asset"
                    simulatedValue={simulation?.debt ? formatDataNumber(simulation.debt): ''}
                    alert={{
                        value: '-7.2% APY',
                        status: Status.NEGATIVE
                    }}
                    fullWidth
                    borderedBottom
                />
                <OverviewStat
                    value={vault.collateralRatio}
                    label="CF"
                    tooltip="Hello world"
                    borderedBottom
                    borderedRight
                />
                <OverviewStat
                    value={parseFloat((100 * parseFloat(vault.totalAnnualizedStabilityFee)).toFixed(2)) + '%'}
                    label="Stability Fee APY"
                    tooltip="Hello world"
                    borderedBottom
                />
                <OverviewStat
                    value={vault.liquidationPrice}
                    label="Liq. Price"
                    tooltip="Hello world"
                    borderedRight
                />
                <OverviewStat
                    value={parseFloat((100 * parseFloat(vault.totalAnnualizedStabilityFee)).toFixed(2)) + '%'}
                    label="Rewards APY"
                    tooltip="Hello world"
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
    $gap: 12,
    ...props
}))`
    height: 60px;
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

type OverviewStatProps = {
    token?: keyof typeof TOKEN_LOGOS,
    value: string,
    label: string,
    tooltip?: string,
    alert?: {
        value: string,
        status: Status
    },
    simulatedValue?: string,
    fullWidth?: boolean,
    borderedRight?: boolean,
    borderedBottom?: boolean
}

function OverviewStat({
    token,
    value,
    label,
    tooltip,
    alert,
    simulatedValue,
    fullWidth = false,
    borderedRight = false,
    borderedBottom = false
}: OverviewStatProps) {
    return (
        <StatContainer
            $fullWidth={fullWidth}
            $borderedRight={borderedRight}
            $borderedBottom={borderedBottom}>
            <Flex
                $align="center"
                $gap={12}>
                {!!token && (
                    <TokenPair
                        size={96}
                        tokens={[token]}
                        hideLabel
                    />
                )}
                <Flex
                    $column
                    $justify="center"
                    $align="flex-start"
                    $gap={4}>
                    <Text
                        $fontSize="1.25em"
                        $fontWeight={700}>
                        {value || '--'} {token}
                    </Text>
                    <Flex
                        $justify="flex-start"
                        $align="center"
                        $gap={4}>
                        <Text $fontSize="0.8em">{label}</Text>
                        {!!tooltip && <Tooltip>{tooltip}</Tooltip>}
                    </Flex>
                </Flex>
            </Flex>
            <CenteredFlex $gap={12}>
                {!!simulatedValue && (
                    <StatusLabel
                        status={Status.CUSTOM}
                        background="gradient">
                        <Text
                            $fontSize="0.67rem"
                            $fontWeight={700}>
                            {simulatedValue || '--'} {token}
                        </Text>
                        <Text
                            $fontSize="0.67rem"
                            $fontWeight={400}>
                            After Tx
                        </Text>
                    </StatusLabel>
                )}
                {!!alert && (
                    <StatusLabel status={alert.status}>
                        {alert.value}
                    </StatusLabel>
                )}
            </CenteredFlex>
        </StatContainer>
    )
}

const StatContainer = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    $borderOpacity: 0.2,
    ...props
}))<DashedContainerProps & {
    $fullWidth?: boolean,
    $borderedBottom?: boolean,
    $borderedRight?: boolean
}>`
    ${DashedContainerStyle}
    ${({ $fullWidth }) => $fullWidth && css`grid-column: 1 / -1;`}
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
