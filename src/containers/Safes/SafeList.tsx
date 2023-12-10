import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'react-feather'
import { isAddressEqual } from 'viem'
import { useAccount } from 'wagmi'

import { returnState, type ISafe } from '~/utils'
import { useStoreState } from '~/store'

import styled from 'styled-components'
import LinkButton from '~/components/LinkButton'
import SafeBlock from '~/components/SafeBlock'
import CheckBox from '~/components/CheckBox'

const SafeList = ({ address }: { address?: string }) => {
    const [showEmpty, setShowEmpty] = useState(true)

    const { address: account } = useAccount()

    const { t } = useTranslation()

    const {
        connectWalletModel: connectWalletState,
        safeModel: {
            list,
            safeCreated,
        },
    } = useStoreState(state => state)

    const safes = useMemo(() => (showEmpty
        ? list
        : list.filter(safe => returnState(safe.riskState) !== '')
    ), [list, showEmpty])

    const isOwner = useMemo(() => {
        if (address && account) return isAddressEqual(account, address as `0x${string}`)
        
        return true
    }, [account, address])

    if (!list.length) return null
    
    return (
        <Container>
            <Header>
                <Col>
                    <Title>{'Accounts'}</Title>
                </Col>
                <Col>
                    {/* <Button
                        data-test-id="topup-btn"
                        disabled={connectWalletState.isWrongNetwork}
                        onClick={() => popupsActions.setIsSafeManagerOpen(true)}
                    >
                        <BtnInner>{t('manage_other_safes')}</BtnInner>
                    </Button> */}
                    {safeCreated && isOwner && (
                        <LinkButton
                            id="create-safe"
                            disabled={connectWalletState.isWrongNetwork}
                            url={'/safes/create'}>
                            <BtnInner>
                                <Plus size={18} />
                                {t('new_safe')}
                            </BtnInner>
                        </LinkButton>
                    )}
                </Col>
            </Header>

            <SafeBlocks>
                <Header className="safesList">
                    <Col>Safes ({list.length})</Col>
                    <Col>Risk</Col>
                </Header>
                {safes.map((safe: ISafe) => (
                    <div key={safe.id}>
                        {safe.collateralName && (
                            <SafeBlock
                                className="safeBlock"
                                {...safe}
                            />
                        )}
                    </div>
                ))}
            </SafeBlocks>
            <CheckboxContainer>
                <CheckBox
                    checked={showEmpty}
                    onChange={setShowEmpty}
                />
                <span>Show empty safes</span>
            </CheckboxContainer>
        </Container>
    )
}

export default SafeList

const Container = styled.div`
    max-width: 880px;
    margin: 80px auto;
    padding: 0 15px;
    @media (max-width: 767px) {
        margin: 50px auto;
    }
`
const SafeBlocks = styled.div`
    padding: 15px;
    border-radius: 15px;
    background: ${(props) => props.theme.colors.colorSecondary};
`

const Title = styled.div`
    font-weight: 600;
    font-size: ${(props) => props.theme.font.large};
`

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30px;
    &.safesList {
        padding: 0 20px;
        margin: 20px 0;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        gap: 20px;
        &.safesList {
            display: none;
        }
    `}
`
const Col = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;

    a {
        min-width: 100px;
        padding: 4px 12px;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
    `}
`

const BtnInner = styled.div`
    display: flex;
    align-items: center;
    svg {
        margin-right: 5px;
    }
`

const CheckboxContainer = styled.div`
    display: flex;
    align-items: center;
    margin-top: 20px;
    justify-content: flex-end;
    span {
        margin-left: 10px;
        position: relative;
        font-size: 13px;
        top: -3px;
    }
`
