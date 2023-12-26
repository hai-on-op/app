import { useTranslation } from 'react-i18next'

import styled from 'styled-components'
import { FeatherIconWrapper, type IconName } from './FeatherIconWrapper'
import { AddressLink } from './AddressLink'

interface Props {
    icon: IconName
    iconColor: string
    iconSize?: number
    text: string
    textColor?: string
    payload?: {
        type: 'address' | 'transaction'
        value: string
        chainId: number
    }
}
export function ToastPayload({ icon, iconColor, text, textColor, iconSize, payload }: Props) {
    const { t } = useTranslation()
    return (
        <Container>
            <FeatherIconWrapper
                name={icon}
                color={iconColor}
                size={iconSize || 20}
            />
            <div>
                <Text color={textColor}>{text}</Text>
                {!!payload && (
                    <AddressLink
                        chainId={payload.chainId}
                        address={payload.value}
                        type={payload.type}>
                        {t('view_etherscan')}
                    </AddressLink>
                )}
            </div>
        </Container>
    )
}

const Container = styled.div`
    display: flex;
    align-items: center;
    svg {
        margin-right: 15px;
    }
`

const Text = styled.div<{ color?: string }>`
    font-size: ${({ theme }) => theme.font.small};
    color: ${({ theme, color }) => (color || theme.colors.neutral)};
`
