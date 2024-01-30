import { useMemo } from 'react'
import ReactPaginate from 'react-paginate'

import styled from 'styled-components'
import { Caret } from './Icons/Caret'

interface Props {
    totalItems: number
    perPage: number
    handlePagingMargin: (offset: number) => void
}

export function Pagination({ totalItems, handlePagingMargin, perPage = 5 }: Props) {
    const total = useMemo(() => {
        if (!totalItems) return 1

        return Math.ceil(totalItems / perPage)
    }, [totalItems, perPage])

    if (totalItems <= perPage) return null

    return (
        <PaginationContainer>
            <ReactPaginate
                previousLabel={<Caret direction="left" />}
                nextLabel={<Caret direction="right" />}
                pageCount={total}
                marginPagesDisplayed={2}
                pageRangeDisplayed={4}
                onPageChange={({ selected }) => {
                    handlePagingMargin(selected)
                }}
                breakLabel="..."
                breakClassName="break-me"
                containerClassName="pagination"
                activeClassName="active"
            />
        </PaginationContainer>
    )
}

const PaginationContainer = styled.div`
    text-align: right;

    .pagination {
        padding: 0;
        list-style: none;
        display: inline-block;

        li {
            display: inline-block;
            vertical-align: middle;
            cursor: pointer;
            text-align: center;
            outline: none;
            box-shadow: none;
            margin: 0 2px;
            font-size: 0.67rem;
            font-weight: 700;
            a {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: ${({ theme }) => theme.border.medium};
                border-color: rgba(0, 0, 0, 0.1);
            }
            &.active,
            &:active,
            &:hover {
                &:not(.disabled) {
                    a {
                        border-color: black;
                    }
                }
            }

            &:first-child.disabled,
            &:last-child.disabled {
                & svg {
                    opacity: 0.1;
                }
            }
            &:first-child {
                margin-right: 10px;
            }
            &:last-child {
                margin-left: 10px;
            }
        }
    }
`
