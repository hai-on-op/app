import { Modal, type ModalProps } from '~/components/Modal'
import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'

export function MigrateHaiVeloV2Modal(props: ModalProps) {
    return (
        <Modal
            {...props}
            heading={'MIGRATE TO haiVELO v2'}
            maxWidth="820px"
            footerContent={
                <Footer>
                    <HaiButton $variant="yellowish" onClick={props.onClose}>
                        Start the migration process
                    </HaiButton>
                </Footer>
            }
        >
            <Description>
                Convert haiVELO v1 into haiVELO v2 in order to continue earning maximum rewards. While haiVELO v1 will
                continue to earn proportional veVELO rewards, HAI minting incentives will progressively shift toward
                haiVELO v2.
            </Description>

            <Steps>
                <StepCard>
                    <Text $fontSize="16px"><strong>Step 01:</strong> Payback HAI debt</Text>
                </StepCard>
                <StepCard>
                    <Text $fontSize="16px"><strong>Step 02:</strong> Withdraw haiVELO v1 collateral</Text>
                </StepCard>
                <StepCard>
                    <Text $fontSize="16px"><strong>Step 03:</strong> Convert haiVELO v1 to haiVELO v2 in the new user interface</Text>
                </StepCard>
                <StepCard>
                    <Text $fontSize="16px"><strong>Step 04:</strong> Deposit haiVELO v2 as collateral and mint HAI</Text>
                </StepCard>
            </Steps>
        </Modal>
    )
}

const Description = styled(Text)`
    font-size: 18px;
    line-height: 24px;
    color: #000000;
    max-width: 732px;
`

const Steps = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $gap: 12,
    ...props,
}))``

const StepCard = styled(Flex).attrs((props) => ({
    $width: '100%',
    $align: 'center',
    ...props,
}))`
    width: 100%;
    height: 71px;
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    padding: 0 15px;
`

const Footer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-end',
    $align: 'center',
    ...props,
}))``


