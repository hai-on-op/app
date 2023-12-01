import styled from 'styled-components'
import { useNetwork } from 'wagmi'

import {
    Container,
    Content,
    Head,
    Header,
    Heads,
    HeadsContainer,
    LeftAucInfo,
    List,
    ListItem,
    ListItemLabel,
    SectionContent,
} from './DataTable'
import { AddressLink } from '~/components/AddressLink'

interface ContractsTableProps {
    title: string
    colums: string[]
    rows: string[][]
}

export const ContractsTable = ({ title, colums, rows }: ContractsTableProps) => {
    const { chain } = useNetwork()
    const chainId = chain?.id

    return (
        <Container>
            <Header>
                <LeftAucInfo>
                    {/* Temporary title style */}
                    {/* <img src={Icon} alt="auction" /> */}
                    <h1 className="text-egg font-semibold font-poppins text-3xl"> {title}</h1>
                </LeftAucInfo>
            </Header>
            <Content>
                <SectionContent>
                    <SHeads>
                        {colums?.map((colName, index) => (
                            <SHeadsContainer key={title + '-column-' + index}>
                                <SHead>{colName}</SHead>
                            </SHeadsContainer>
                        ))}
                    </SHeads>

                    {rows?.map((item, index) => (
                        <SList key={'row-' + index}>
                            {item?.map((value, valueIndex) => (
                                <HeadsContainer key={'row-item-' + valueIndex}>
                                    <SListItem>
                                        <ListItemLabel>{colums[valueIndex]}</ListItemLabel>
                                        {valueIndex === 1 && <AddressLink address={value} chainId={chainId || 420} />}
                                        {valueIndex !== 1 && <>{value}</>}
                                    </SListItem>
                                </HeadsContainer>
                            ))}
                        </SList>
                    ))}
                </SectionContent>
            </Content>
        </Container>
    )
}

// Contract Name column width variable
const contractNamecolumnWidth = 244
// Description column width variable
const descriptionColumnWidth = 554

const SHeads = styled(Heads)`
    div:first-child {
        width: ${contractNamecolumnWidth}px;
    }
    div:last-child {
        width: ${descriptionColumnWidth}px;
    }

    @media (max-width: 768px) {
        div:last-child {
            width: 80vw;
        }
    }
`
const SList = styled(List)`
    align-items: center;
    div:first-child div {
        width: ${contractNamecolumnWidth}px;
    }
    div:last-child div {
        width: ${descriptionColumnWidth}px;
    }

    @media (max-width: 768px) {
        div:last-child div {
            width: 80vw;
        }
    }
`

const SHeadsContainer = styled(HeadsContainer)`
    text-align: start;
`
const SListItem = styled(ListItem)`
    text-align: start;
    text-overflow: ellipsis;
`
const SHead = styled(Head)``
