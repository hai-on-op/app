import styled from 'styled-components'

export function BlockedAddress() {
    return (
        <Container>
            <Box>Sorry, you cannot use the app!</Box>
        </Container>
    )
}

const Box = styled.div`
    background: ${({ theme }) => theme.colors.colorSecondary};
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    margin-top: 100px;
`

const Container = styled.div`
    max-width: 880px;
    margin: 80px auto;
    padding: 0 15px;
    @media (max-width: 767px) {
        margin: 50px auto;
    }
`
