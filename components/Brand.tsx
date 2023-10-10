import styled from 'styled-components'

const Brand = () => {
    return (
        <Container>
            <a href={'/'}>
                <img src="/assets/hai-logo.png" alt="HAI" />
            </a>
        </Container>
    )
}

export default Brand

const Container = styled.div`
    a {
        color: inherit;
        text-decoration: none;
        img {
            width: 75px;
            &.small {
                width: 50px;
                height: 50px;
            }
            ${({ theme }) => theme.mediaWidth.upToSmall`
            width: 50px;
            height: 50px;
            `}
        }
    }
`
