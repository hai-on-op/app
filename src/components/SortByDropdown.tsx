import type { SetState, SortableHeader, Sorting } from '~/types'

import { CenteredFlex, Text } from '~/styles'
import { BrandedDropdown, DropdownOption } from './BrandedDropdown'
import { HaiArrow } from './Icons/HaiArrow'

type SortByProps = {
    headers: SortableHeader[]
    sorting: Sorting
    setSorting: SetState<Sorting>
}
export function SortByDropdown({ headers, sorting, setSorting }: SortByProps) {
    return (
        <BrandedDropdown
            $width="100%"
            $justify="space-between"
            label={
                <CenteredFlex $gap={8}>
                    <Text $fontWeight={400} $textAlign="left">
                        Sort By: <strong>{sorting.key}</strong>
                    </Text>
                    <HaiArrow size={12} strokeWidth={3} direction={sorting.dir === 'asc' ? 'up' : 'down'} />
                </CenteredFlex>
            }
        >
            {headers.map(({ label, unsortable }) =>
                !unsortable ? (
                    <DropdownOption
                        key={label}
                        $active={sorting.key === label}
                        onClick={() =>
                            setSorting((s) => ({
                                key: label,
                                dir: s.key === label && s.dir === 'desc' ? 'asc' : 'desc',
                            }))
                        }
                    >
                        {label}
                    </DropdownOption>
                ) : null
            )}
        </BrandedDropdown>
    )
}
