import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import RightArrow from '~/components/Icons/RightArrow'
import { ExternalLink } from '~/components/ExternalLink'

const Container = styled(Flex).attrs(props => ({
	$column: true,
	$justify: 'space-between',
	$align: 'flex-start',
	$shrink: 0,
	...props
}))`
	position: relative;
	width: min(calc(100vw - 48px), 400px);
	height: 500px;
	border: ${({ theme }) => theme.border.medium};
	border-radius: 24px;
	/* background-color: #f1f1fb77; */
	/* backdrop-filter: blur(13px); */
	background-color: rgba(255,255,255,0.4);
	padding: 48px;
	transition: all 0.5s ease;

	& svg {
			width: auto;
			height: 1rem;
	}

	${({ theme }) => theme.mediaWidth.upToExtraSmall`
			padding: 36px;
			height: max(400px, min(420px, 65vh));
	`}
`

type LearnCardProps = {
	title: string,
	content: string,
	link: string
}
export function LearnCard({ title, content, link }: LearnCardProps) {
	const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')

	return (
			<Container>
					<Flex
							$column
							$gap={24}>
							<Text
								$fontSize={isLargerThanExtraSmall ? '2.5rem': '2rem'}
								$lineHeight="1.25"
								$fontWeight={400}>
								{title}
							</Text>
							<BrandedTitle
								textContent={content.toUpperCase()}
								$fontSize={isLargerThanExtraSmall ? '2.5rem': '2rem'}
								$lineHeight="1.25"
							/>
					</Flex>
					<ExternalLink
						href={link}
						$textDecoration="none">
						<CenteredFlex $gap={12}>
								<Text
										$fontSize={isLargerThanExtraSmall ? '1.2rem': '1rem'}
										$fontWeight={700}
										$letterSpacing="0.35rem">
										LEARN MORE
								</Text>
								<RightArrow/>
						</CenteredFlex>
					</ExternalLink>
			</Container>
	)
}