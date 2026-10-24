import styled from 'styled-components'
import { Flex, Text } from '~/styles'
import { Link } from '~/components/Link'
import { AERO_MIGRATION_PATH } from '~/services/aeroMigration/policy'

export function AeroMigrationNotice({ showLink = true }: { showLink?: boolean }) {
    return (
        <Notice role="status">
            <Text $fontWeight={700}>haiVELO and haiAERO are moving to the new AERO</Text>
            <Text>
                New legacy minting is unavailable in this app. Migration to the new haiAERO is not open yet. Keep
                managing your existing vaults and claiming available rewards as usual.
            </Text>
            <Text>
                You can still add collateral, repay HAI and withdraw collateral when your vault is safe. You do not need
                to close a vault before migration instructions are available.
            </Text>
            {showLink && <Link href={AERO_MIGRATION_PATH}>View migration status and next steps</Link>}
        </Notice>
    )
}

const Notice = styled(Flex).attrs({ as: 'section', $column: true, $gap: 16, $width: '100%' })`
    padding: 24px;
    border: 1px solid currentColor;
    border-radius: 12px;
    line-height: 1.5;
`
