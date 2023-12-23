import { LINK_TO_DOCS } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Grid } from '~/styles'
import { LearnCard } from './LearnCard'

export function Learn() {
    return (
        <Container>
            <CenteredFlex>
                <LearnCard
                    title="HAI DOCS"
                    description="Exhaustive documentation on all aspects of the HAI Protocol"
                    link={LINK_TO_DOCS}
                />
            </CenteredFlex>
            <CenteredFlex>
                <LearnCard
                    title="ELI5 VIDEOS"
                    titleColorOffset={1}
                    description="Quick, informative videos designed to educate the viewer on the main concepts of the HAI Protocol"
                    link={LINK_TO_DOCS}
                />
            </CenteredFlex>
            <CenteredFlex>
                <LearnCard
                    title="HAI MEDIUM"
                    titleColorOffset={2}
                    description="Blog posts on various topics written by the HAI team"
                    link={LINK_TO_DOCS}
                />
            </CenteredFlex>
            <CenteredFlex>
                <LearnCard
                    title="HAI SOCIALS"
                    titleColorOffset={3}
                    description="Links to the HAI Twitter and Telegram group"
                    link={LINK_TO_DOCS}
                />
            </CenteredFlex>
        </Container>
    )
}

const Container = styled(Grid).attrs(props => ({
    $width: '100%',
    $columns: 'repeat(auto-fit, minmax(336px, 1fr))',
    $gap: 48,
    ...props,
}))``
