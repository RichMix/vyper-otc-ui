import { SetStateAction, useState } from 'react';

import LoadingButton from '@mui/lab/LoadingButton';
import { Box, Stepper, Step, StepLabel, StepContent, Button, Switch, FormGroup, FormControlLabel, Typography, Stack, Alert } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import CollateralPicker from 'components/CollateralPicker';
import { ExpiryPicker } from 'components/ExpiryPicker';
import { OraclesPicker } from 'components/OraclesPicker';
import ParamsPicker from 'components/ParamsPicker';
import PayoffPicker from 'components/PayoffPicker';
import PreviewModal from 'components/PreviewModal';
import { getCurrentCluster } from 'components/providers/OtcConnectionProvider';
import { validateInitParams, getPriceForStrike, OtcInitializationParams } from 'controllers/createContract/OtcInitializationParams';
import produce from 'immer';
import _ from 'lodash';
import { getPayoffFromAlias } from 'models/common';

type StepElement = {
	title: string;
	description: string;
	content: JSX.Element;
	error: boolean;
};

type CreateContractFlowInput = {
	// contract init params state
	contractInitParams: OtcInitializationParams;

	// on contract init params state change
	onContractInitParamsChange: (value: SetStateAction<OtcInitializationParams>) => void;

	// loading during contract creation
	isLoading: boolean;

	// on-chain contract create callback
	onCreateContractButtonClick: (fundSide?: 'long' | 'short') => Promise<void>;

	initialStep?: number;
};

const CreateContractFlow = ({
	contractInitParams,
	onContractInitParamsChange,
	isLoading,
	onCreateContractButtonClick,
	initialStep
}: CreateContractFlowInput) => {
	const wallet = useWallet();
	const { connection } = useConnection();

	const [activeStep, setActiveStep] = useState(initialStep ?? 0);
	const [openPreview, setOpenPreview] = useState(false);
	const handleOpenPreview = () => setOpenPreview(true);
	const handleClosePreview = () => setOpenPreview(false);

	const [expiryError, setExpiryError] = useState(false);
	const [oracleError, setOracleError] = useState(false);
	const [reserveError, setReserveError] = useState(false);

	const initParamsErrors = validateInitParams(contractInitParams);

	// TODO fill other errors

	const steps: StepElement[] = [
		{
			title: 'payoff',
			description: 'Select the payoff of your contract from the list available',
			content: (
				<PayoffPicker
					aliasId={contractInitParams.aliasId}
					setAliasId={(newAliasId) =>
						onContractInitParamsChange((prevValue) =>
							produce(prevValue, (draft) => {
								const newPayoffId = getPayoffFromAlias(newAliasId);

								draft.aliasId = newAliasId;
								draft.payoffOption.payoffId = newPayoffId;

								if (newPayoffId === 'settled_forward' && draft.rateOption.rateAccounts.length === 1) {
									draft.rateOption.rateAccounts.push(draft.rateOption.rateAccounts[0]);
								}
								if (newPayoffId !== 'settled_forward' && draft.rateOption.rateAccounts.length !== 1) {
									draft.rateOption.rateAccounts.splice(1, draft.rateOption.rateAccounts.length - 1);
								}
							})
						)
					}
				/>
			),
			error: false
		},
		{
			title: 'underlying',
			description: `Select the underlying of the contract${getCurrentCluster() === 'devnet' ? '. You can also input your oracle of choice' : ''}`,
			content: (
				<OraclesPicker
					// oracleRequired={contractInitParams.redeemLogicOption.redeemLogicPluginType === 'settled_forward' ? 'double' : 'single'}
					// ratePluginType={contractInitParams.rateOption.ratePluginType}
					rateAccounts={contractInitParams.rateOption.rateAccounts}
					setRateAccounts={(newRateType, newRateAccounts) => {
						onContractInitParamsChange((prevValue) =>
							produce(prevValue, (draft) => {
								draft.rateOption.ratePluginType = newRateType;
								draft.rateOption.rateAccounts = newRateAccounts;
							})
						);
						getPriceForStrike(newRateType, newRateAccounts, connection, getCurrentCluster()).then((newStrike) => {
							onContractInitParamsChange((prevValue) =>
								produce(prevValue, (draft) => {
									draft.payoffOption.strike = +newStrike.toPrecision(6);
								})
							);
						});
					}}
					oracleError={oracleError}
					setOracleError={setOracleError}
				/>
			),
			error: oracleError
		},
		{
			title: 'contract parameters',
			description: 'Select the parameters of the contract',
			content: (
				<ParamsPicker
					aliasId={contractInitParams.aliasId}
					payoffOptions={contractInitParams.payoffOption}
					setPayoffOptions={(newVal) =>
						onContractInitParamsChange((prevValue) =>
							produce(prevValue, (draft) => {
								draft.payoffOption = newVal;
							})
						)
					}
				/>
			),
			error: false
		},
		{
			title: 'collateral',
			description: `Select the token to be used as collateral for the contract${
				getCurrentCluster() === 'devnet' ? '. You can also input your token of choice' : ''
			}`,
			content: (
				<CollateralPicker
					aliasId={contractInitParams.aliasId}
					longDepositAmount={contractInitParams.longDepositAmount}
					setLongDepositAmount={(newVal) =>
						onContractInitParamsChange((prevVal) =>
							produce(prevVal, (draft) => {
								draft.longDepositAmount = newVal;
							})
						)
					}
					shortDepositAmount={contractInitParams.shortDepositAmount}
					setShortDepositAmount={(newVal) =>
						onContractInitParamsChange((prevVal) =>
							produce(prevVal, (draft) => {
								draft.shortDepositAmount = newVal;
							})
						)
					}
					collateralMint={contractInitParams.collateralMint}
					setCollateralMint={(newVal) =>
						onContractInitParamsChange((prevVal) =>
							produce(prevVal, (draft) => {
								draft.collateralMint = newVal;
							})
						)
					}
					reserveError={reserveError}
					setReserveError={setReserveError}
				/>
			),
			error: reserveError
		},
		{
			title: 'expiry',
			description: 'Select the deposit window and contract expiry',
			content: (
				<ExpiryPicker
					depositEnd={contractInitParams.depositEnd}
					setDepositEnd={(newVal) =>
						onContractInitParamsChange((prevVal) =>
							produce(prevVal, (draft) => {
								draft.depositEnd = newVal;
							})
						)
					}
					settleStart={contractInitParams.settleStart}
					setSettleStart={(newVal) =>
						onContractInitParamsChange((prevVal) =>
							produce(prevVal, (draft) => {
								draft.settleStart = newVal;
							})
						)
					}
					expiryError={expiryError}
					setExpiryError={setExpiryError}
				/>
			),
			error: expiryError
		}
	];

	const handleNext = () => {
		setActiveStep((prevActiveStep) => prevActiveStep + 1);
	};

	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};

	const handleReset = () => {
		setActiveStep(0);
	};

	return (
		<Box sx={{ width: '100vh' }}>
			<Stepper activeStep={activeStep} orientation="vertical" connector={null}>
				{steps.map((step: StepElement, i: number) => (
					<Step key={step.title} sx={{ width: '100%' }}>
						<Stack direction="row">
							<Box sx={{ width: '40%', flexDirection: 'column', justifyContent: 'space-between' }}>
								<div>
									<StepLabel error={step.error}>
										<b>{step.title.toUpperCase()}</b>
									</StepLabel>
									{activeStep >= i && <Typography sx={{ fontWeight: 'light' }}>{step.description}</Typography>}
								</div>
								{i === activeStep && (
									<Box sx={{ display: 'flex' }}>
										<Button disabled={i === 0} onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
											Back
										</Button>
										{i === steps.length - 1 ? (
											initParamsErrors.length === 0 ? (
												<Button
													sx={{ mt: 1, mr: 1 }}
													variant="contained"
													disabled={!wallet.connected || openPreview || steps.some(({ error }) => error)}
													onClick={handleOpenPreview}
												>
													{wallet.connected ? 'Preview' : 'Connect Wallet'}
												</Button>
											) : (
												initParamsErrors.map((err, errIdx) => (
													<Alert key={errIdx} severity="error">
														{_.capitalize(err)}
													</Alert>
												))
											)
										) : (
											<Button variant="contained" onClick={handleNext} sx={{ mt: 1, mr: 1 }} disabled={step.error}>
												Next
											</Button>
										)}
									</Box>
								)}
							</Box>
							<StepContent sx={{ width: '90%', pb: 4, mb: 2 }} TransitionProps={{ in: activeStep >= i }}>
								{step.content}
							</StepContent>
						</Stack>
					</Step>
				))}
			</Stepper>

			{process.env.NODE_ENV === 'development' && (
				<Box>
					<Button onClick={handleReset}>Reset</Button>
					<FormGroup>
						<FormControlLabel
							control={
								<Switch
									checked={contractInitParams.saveOnDatabase}
									onChange={(e) =>
										onContractInitParamsChange({
											...contractInitParams,
											saveOnDatabase: e.target.checked
										})
									}
								/>
							}
							label="Save on database"
						/>
						<FormControlLabel
							control={
								<Switch
									checked={contractInitParams.sendNotification}
									onChange={(e) =>
										onContractInitParamsChange({
											...contractInitParams,
											sendNotification: e.target.checked
										})
									}
								/>
							}
							label="Send notification"
						/>
					</FormGroup>
				</Box>
			)}
			<PreviewModal
				aliasId={contractInitParams.aliasId}
				payoffOption={contractInitParams.payoffOption}
				rateOption={contractInitParams.rateOption}
				depositEnd={contractInitParams.depositEnd}
				settleStart={contractInitParams.settleStart}
				longDepositAmount={contractInitParams.longDepositAmount}
				shortDepositAmount={contractInitParams.shortDepositAmount}
				collateralMint={contractInitParams.collateralMint}
				open={openPreview}
				handleClose={handleClosePreview}
				actionProps={
					<>
						<LoadingButton
							variant="contained"
							loading={isLoading}
							disabled={!wallet.connected || initParamsErrors.length !== 0}
							onClick={() => onCreateContractButtonClick()}
						>
							{wallet.connected ? 'Create 🚀' : 'Connect Wallet'}
						</LoadingButton>

						{/* <LoadingButton variant="contained" loading={isLoading} disabled={!wallet.connected} onClick={() => onCreateContractButtonClick('long')}>
							{wallet.connected ? 'Create and long 🚀' : 'Connect Wallet'}
						</LoadingButton>

						<LoadingButton variant="contained" loading={isLoading} disabled={!wallet.connected} onClick={() => onCreateContractButtonClick('short')}>
							{wallet.connected ? 'Create and short 🚀' : 'Connect Wallet'}
						</LoadingButton> */}
					</>
				}
			/>
		</Box>
	);
};

export default CreateContractFlow;
