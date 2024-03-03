import { LINK_TO_DISCORD, LINK_TO_DOCS, LINK_TO_MEDIUM, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Grid } from '~/styles'
import { LearnCard } from './LearnCard'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Discord } from '~/components/Icons/Discord'
import { Link } from '~/components/Link'

export function Learn() {
    return (
        <Container>
            <CenteredFlex>
                <LearnCard
                    title="HAI DOCS"
                    description="Documentation on all aspects of the HAI Protocol"
                    link={`${LINK_TO_DOCS}detailed/intro/hai.html`}
                />
            </CenteredFlex>
            <CenteredFlex>
                <LearnCard
                    title="ELI5 VIDEOS"
                    titleColorOffset={1}
                    description="Quick, informative videos designed to educate the viewer on the main concepts of the HAI Protocol"
                    // TODO: update link
                    link={'https://youtube.com'}
                    comingSoon
                />
            </CenteredFlex>
            <CenteredFlex>
                <LearnCard
                    title="HAI MEDIUM"
                    titleColorOffset={2}
                    description="Blog posts on various topics written by the HAI team and contributors"
                    link={LINK_TO_MEDIUM}
                />
            </CenteredFlex>
            <CenteredFlex>
                <LearnCard
                    title="HAI SOCIALS"
                    titleColorOffset={3}
                    description="Links to the official HAI Twitter, Telegram & Discord"
                    link={
                        <SocialGrid>
                            <Link href={LINK_TO_TWITTER}>
                                <Twitter fill="black" stroke="none" />
                            </Link>
                            <Link href={LINK_TO_TELEGRAM}>
                                <Telegram fill="black" stroke="none" />
                            </Link>
                            <Link href={LINK_TO_DISCORD}>
                                <Discord fill="black" stroke="none" />
                            </Link>
                        </SocialGrid>
                    }
                />
            </CenteredFlex>
        </Container>
    )
}

const Container = styled(Grid).attrs((props) => ({
    $width: '100%',
    $columns: 'repeat(auto-fit, minmax(336px, 1fr))',
    $gap: 48,
    ...props,
}))``

const SocialGrid = styled(Grid).attrs((props) => ({
    $width: '100%',
    $columns: '1fr 1fr 1fr',
    $justify: 'center',
    $align: 'center',
    $gap: 12,
    ...props,
}))``
