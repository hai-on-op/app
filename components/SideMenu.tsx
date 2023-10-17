import React, { useEffect, useState } from 'react'
import { CSSTransition } from 'react-transition-group'
import styled from 'styled-components'

import { useStoreActions, useStoreState } from '@/store'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import NavLinks from './NavLinks'

const SideMenu = () => {
    const nodeRef = React.useRef(null)
    
    const [isOpen, setIsOpen] = useState(false)
    const { popupsModel: popupsActions } = useStoreActions((state) => state)
    const { popupsModel: popupsState } = useStoreState((state) => state)

    useEffect(() => {
        setIsOpen(popupsState.showSideMenu)
    }, [popupsState.showSideMenu])

    return isOpen ? (
        <CSSTransition
            in={isOpen}
            timeout={300}
            appear={isOpen}
            nodeRef={nodeRef}
            classNames="fade"
            unmountOnExit
            mountOnEnter
        >
            <Container ref={nodeRef}>
                <Inner>
                    <Overlay onClick={() => popupsActions.setShowSideMenu(false)} />

                    <InnerContainer>
                        <AccountBalance>
                            <ConnectButton showBalance={false} accountStatus="address" />
                        </AccountBalance>
                        <NavLinks />
                    </InnerContainer>
                </Inner>
            </Container>
        </CSSTransition>
    ) : null
}

export default SideMenu

const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 997;
    overflow-y: auto;

    &.fade-appear {
        opacity: 0;
    }
    &.fade-appear-active {
        opacity: 1;
        transition: all 300ms;
    }
`

const Inner = styled.div`
    position: relative;
`

const Overlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100vh;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
`

const InnerContainer = styled.div`
    min-height: 100vh;
    width: calc(100% - 50px);
    background: ${(props) => props.theme.colors.background};
    padding-bottom: 1rem;
    position: relative;
    z-index: 2;
    margin-left: auto;
`

const AccountBalance = styled.div`
    padding: 30px 20px 20px 25px;
    margin-bottom: 15px;
`
