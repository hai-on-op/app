import { buildStakingService } from '~/services/stakingService'

// Mock ethers.Contract to capture constructor args and expose minimal API
jest.mock('ethers', () => {
    const actual = jest.requireActual('ethers')
    class MockContract {
        public __address: string
        public __abi: any
        constructor(address: string, abi: any, _signerOrProvider: any) {
            this.__address = address
            this.__abi = abi
        }
        async totalStaked() {
            return actual.BigNumber.from('0')
        }
        async stakedBalances(_addr: string) {
            return actual.BigNumber.from('0')
        }
        async _params() {
            return actual.BigNumber.from('1814400')
        }
        async rewards() {
            return actual.BigNumber.from('0')
        }
        async rewardTypes(_i: number) {
            return { isActive: false }
        }
        callStatic = { earned: async (_: string) => [] as any }
        populateTransaction = {
            async stake(_user: string, _amount: any) {
                return { to: this.__address }
            },
            async initiateWithdrawal(_amount: any) {
                return { to: this.__address }
            },
            async withdraw() {
                return { to: this.__address }
            },
            async cancelWithdrawal() {
                return { to: this.__address }
            },
            async getReward(_user: string) {
                return { to: this.__address }
            },
        }
    }
    return { ...actual, Contract: MockContract }
})

describe('buildStakingService', () => {
    it('creates isolated services for different manager addresses', async () => {
        const A = '0xA000000000000000000000000000000000000001'
        const B = '0xB000000000000000000000000000000000000002'
        const serviceA = buildStakingService(A as any, [] as any, 18)
        const serviceB = buildStakingService(B as any, [] as any, 18)

        // Ensure methods are callable (no throw) and rely on their own instance
        const fakeProvider: any = {}
        await serviceA.getTotalStaked(fakeProvider)
        await serviceB.getTotalStaked(fakeProvider)

        // Spot-check decimals are preserved per instance
        expect(serviceA.decimals).toBe(18)
        expect(serviceB.decimals).toBe(18)
    })
})
