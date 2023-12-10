import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'

import { isNumeric, DEFAULT_SAFE_STATE } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useIsOwner, useEthersSigner } from '~/hooks'

import styled from 'styled-components'
import AlertLabel from '~/components/AlertLabel'
import SafeStats from '~/components/SafeStats'
import ModifySafe from './ModifySafe'
import SafeHeader from './SafeHeader'

const SafeDetails = ({ ...props }) => {
    const { t } = useTranslation()
    const { address: account } = useAccount()
    const signer = useEthersSigner()

    const {
        liquidationData,
        list,
        singleSafe,
    } = useStoreState(({ safeModel }) => safeModel)
    const safeActions = useStoreActions(({ safeModel }) => safeModel)

    const safeId = props.match.params.id as string

    const isDeposit = useMemo(() => {
        return !!props.location?.pathname.includes('deposit')
    }, [props.location])

    const isWithdraw = useMemo(() => {
        return !!props.location?.pathname.includes('withdraw')
    }, [props.location])

    const isOwner = useIsOwner(safeId)

    const safe = list.find((safe) => safe.id === safeId)

    useEffect(() => {
        if (safe) {
            safeActions.setSingleSafe(safe)
            safeActions.setSafeData(DEFAULT_SAFE_STATE)
        }
        return () => {
            safeActions.setSingleSafe(undefined)
        }
    }, [safe, safeActions])

    useEffect(() => {
        if (!account || !signer) return
        if (!isNumeric(safeId)) {
            props.history.push('/safes')
        }
    }, [account, signer, props.history, safeId])

    const isLoading = !(liquidationData && singleSafe?.collateralName)

    return (
        <Container>
            {!isOwner && (
                <LabelContainer>
                    <AlertLabel
                        isBlock={false}
                        text={t('managed_safe_warning')}
                        type="warning"
                    />
                </LabelContainer>
            )}
            <SafeHeader
                safeId={safeId}
                isDeposit={isDeposit}
            />

            {!isLoading && (
                <SafeStats
                    isModifying={isDeposit || isWithdraw}
                    isDeposit={isDeposit}
                />
            )}

            {(isDeposit || isWithdraw) && !isLoading && (
                <ModifySafe
                    isDeposit={isDeposit}
                    isOwner={isOwner}
                />
            )}
        </Container>
    )
}

export default SafeDetails

const Container = styled.div`
    max-width: 880px;
    margin: 80px auto;
    padding: 0 15px;
    @media (max-width: 767px) {
        margin: 50px auto;
    }
`

const LabelContainer = styled.div`
    max-width: ${(props) => props.theme.global.gridMaxWidth};
    margin: 0 auto 20px auto;
`
