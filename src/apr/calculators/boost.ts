/**
 * Re-export boost functions from the existing boost service.
 * These are already pure, stateless functions.
 */
export {
    calculateLPBoost,
    calculateHaiVeloBoost,
    calculateVaultBoost,
    calculateHaiMintingBoost,
    combineBoostValues,
} from '~/services/boostService'

export { calculateHaiVeloBoostMap } from '~/services/haiVeloService'
