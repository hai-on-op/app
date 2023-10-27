import styled from 'styled-components'

type ProgressBarProps = {
    progress: number
}
export function ProgressBar({ progress }: ProgressBarProps) {
    return (
        <Container>
            <Bar $progress={progress}/>
        </Container>
    )
}

const Container = styled.div`
    position: relative;
    width: 100%;
    height: 16px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    background-color: transparent;
`
const Bar = styled.div<{ $progress: number }>`
    position: absolute;
    top: 0px;
    left: 0px;
    bottom: 0px;
    width: ${({ $progress }) => (Math.min($progress, 1) * 100).toFixed(2)}%;
    border-radius: 999px;
    border: ${({ theme }) => theme.border.medium};
    background-color: ${({ theme }) => theme.colors.greenish};
    margin: -2px;
`