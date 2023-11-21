import { type Dispatch, type SetStateAction, useState } from 'react'

import { LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'
import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { HaiButton, Popout, Title } from '~/styles'
import { ExternalLink } from '~/components/ExternalLink'
import { Hamburger } from '~/components/Icons/Hamburger'

type MobileMenuProps = {
    active: boolean,
    setActive: Dispatch<SetStateAction<boolean>>
}
export function MobileMenu({ active, setActive }: MobileMenuProps) {
    const [button, setButton] = useState<HTMLElement>()
    useOutsideClick(button, () => setActive(false))

    return (
        <DropdownButton
            as="div"
            $variant="yellowish"
            ref={setButton as any}
            onClick={() => setActive(a => !a)}>
            <Hamburger size={20}/>
            {active && (
                <Dropdown
                    $float="left"
                    $margin="20px"
                    onClick={(e: any) => e.stopPropagation()}>
                    {/* TODO: replace links */}
                    <ExternalLink
                        href={LINK_TO_DOCS}
                        $textDecoration="none">
                        <HeaderLink>Learn</HeaderLink>
                    </ExternalLink>
                    <ExternalLink
                        href={LINK_TO_DOCS}
                        $textDecoration="none">
                        <HeaderLink>Docs</HeaderLink>
                    </ExternalLink>
                    <ExternalLink
                        href={LINK_TO_DOCS}
                        $textDecoration="none">
                        <HeaderLink>Community</HeaderLink>
                    </ExternalLink>

                    {/* TODO: add actual connect button */}
                    <HeaderLink>Connect</HeaderLink>

                    <ExternalLink
                        href={LINK_TO_TWITTER}
                        $textDecoration="none">
                        <HeaderLink>Twitter</HeaderLink>
                    </ExternalLink>
                    <ExternalLink
                        href={LINK_TO_TELEGRAM}
                        $textDecoration="none">
                        <HeaderLink>Telegram</HeaderLink>
                    </ExternalLink>
                </Dropdown>
            )}
        </DropdownButton>
    )
}

const DropdownButton = styled(HaiButton)`
    position: relative;
    width: 48px;
    min-width: unset;
    height: 48px;
    padding: 0px;
    justify-content: center;
`
const Dropdown = styled(Popout)`
    width: 280px;
    padding: 12px;
    margin-right: -19px;
    gap: 4px;
    cursor: default;
    
    & > * {
        width: 100%;
        height: 36px;
        & * {
            line-height: 36px;
        }
        border-radius: 12px;
        border: 1px solid rgba(0,0,0,0.1);
    }
`
const HeaderLink = styled(Title).attrs(props => ({
    $fontSize: '1.6em',
    $letterSpacing: '0.2rem',
    $textTransform: 'uppercase',
    ...props
}))<{ $active?: boolean }>`
    text-shadow: none;
    -webkit-text-stroke: 0px;
    font-weight: ${({ $active = false }) => $active ? 700: 400};
`