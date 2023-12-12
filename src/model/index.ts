import settingsModel, { SettingsModel } from './settingsModel'
import popupsModel, { PopupsModel } from './popupsModel'
import connectWalletModel, { ConnectWalletModel } from './connectWalletModel'
import vaultModel, { VaultModel } from './vaultModel'
import transactionsModel, { TransactionsModel } from './transactionsModel'
import auctionModel, { AuctionModel } from './auctionModel'

export interface StoreModel {
    settingsModel: SettingsModel
    popupsModel: PopupsModel
    connectWalletModel: ConnectWalletModel
    vaultModel: VaultModel
    transactionsModel: TransactionsModel
    auctionModel: AuctionModel
}

const model: StoreModel = {
    settingsModel,
    popupsModel,
    connectWalletModel,
    vaultModel,
    transactionsModel,
    auctionModel,
}

export default model
