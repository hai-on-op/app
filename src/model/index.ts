import { type SettingsModel, settingsModel } from './settingsModel'
import { type PopupsModel, popupsModel } from './popupsModel'
import { type ConnectWalletModel, connectWalletModel } from './connectWalletModel'
import { type VaultModel, vaultModel } from './vaultModel'
import { type TransactionsModel, transactionsModel } from './transactionsModel'
import { type AuctionModel, auctionModel } from './auctionModel'
import { type StakingModel, stakingModel } from './stakingModel'

export interface StoreModel {
    auctionModel: AuctionModel
    connectWalletModel: ConnectWalletModel
    popupsModel: PopupsModel
    settingsModel: SettingsModel
    transactionsModel: TransactionsModel
    vaultModel: VaultModel
    stakingModel: StakingModel
    // lpDataModel removed
}

export const model: StoreModel = {
    auctionModel,
    connectWalletModel,
    popupsModel,
    settingsModel,
    transactionsModel,
    vaultModel,
    stakingModel,
}
