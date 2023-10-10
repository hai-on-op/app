import styled from 'styled-components'
import Jazzicon from 'react-jazzicon'

import { useActiveWeb3React } from '@/hooks'

const StyledIdenticonContainer = styled.div`
    border-radius: 1.125rem;
    background-color: ${({ theme }) => theme.colors.background};
`

export default function Identicon() {

    const { account } = useActiveWeb3React()

    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/30451
    // return <StyledIdenticonContainer ref={ref as any} />
    return (
        <StyledIdenticonContainer>
            {!!account && <Jazzicon diameter={16} seed={parseInt(account.slice(2, 10), 16)}/>}
        </StyledIdenticonContainer>
    )
}
