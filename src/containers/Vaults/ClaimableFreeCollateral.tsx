import styled from 'styled-components'
import { Tooltip } from '~/components/Tooltip'
import { HaiButton } from '~/styles'
import { useStoreActions } from '~/store'
import type { IVault } from '~/types/vaults'
import { useEthersSigner } from '~/hooks'

const ClaimButton = styled(HaiButton)`
    height: 36px;
    padding: 6px 10px;
`

const ClaimTooltip = styled(Tooltip)`
    font-weight: 400;
    font-size: 14px;
`

type ClaimableFreeCollateralProps = {
    vault: IVault
}

export function ClaimableFreeCollateral({ vault }: ClaimableFreeCollateralProps) {
    const signer = useEthersSigner()
    const { vaultModel: vaultActions } = useStoreActions((actions) => actions)

    const handleClaim = async () => {
        await vaultActions.claimFreeCollateral({
            vault,
            signer,
        })
    }

    return (
        <ClaimButton $variant="yellowish" onClick={handleClaim}>
            Claim
            <ClaimTooltip>
                This vault has free collateral from a prior liquidation to claim. <br />
                Requires a refresh after sucessful claim.
            </ClaimTooltip>
        </ClaimButton>
    )
}
