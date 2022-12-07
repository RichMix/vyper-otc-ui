/* eslint-disable no-console */
import { Cluster } from '@solana/web3.js';
import { OtcInitializationParams } from 'controllers/createContract/OtcInitializationParams';
import { ChainOtcState } from 'models/ChainOtcState';
import { PayoffTypeIds } from 'models/common';
import { OracleDetail } from 'models/OracleDetail';
import moment from 'moment';
import { getMintByPubkey } from 'utils/mintDatasetHelper';
import { getOracleByPubkey } from 'utils/oracleDatasetHelper';
import { abbreviateAddress } from 'utils/stringHelpers';

import { SNS_PUBLISHER_RPC_NAME, supabase } from './client';

// TODO: improve access
const buildBody = (
	redeemLogicPluginType: PayoffTypeIds,
	buyerDepositAmount: number,
	sellerDepositAmount: number,
	reserveMint: string,
	oracleInfo: OracleDetail,
	strike?: number,
	notional?: number,
	isCall?: boolean
): string => {
	const mintInfo = getMintByPubkey(reserveMint);

	// TODO: move this part to payoff classes
	// TODO: improve access to redeemLogicOption
	switch (redeemLogicPluginType as PayoffTypeIds) {
		case 'forward':
			return `\n\nStrike:\t${strike.toPrecision(4)}\nSize:\t${notional} ${oracleInfo.baseCurrency ?? ''}\n\nCollateral:\t${
				mintInfo?.title ?? reserveMint
			}\nLong:\t${buyerDepositAmount} ${mintInfo?.title ?? ''}\nShort:\t${sellerDepositAmount} ${mintInfo?.title ?? ''}`;
		case 'vanilla_option':
			return `\n\nStrike:\t${strike.toPrecision(4)}\nSize:\t${notional} ${oracleInfo.baseCurrency ?? ''}\nType:\t${isCall ? 'Call' : 'Put'}\n\nCollateral:\t${
				mintInfo?.title ?? reserveMint
			}\nOption premium:\t${buyerDepositAmount} ${mintInfo?.title ?? ''}\nOption collateral:\t${sellerDepositAmount} ${mintInfo?.title ?? ''}`;
		case 'digital':
			return `\n\nStrike: ${strike.toPrecision(4)}\nType:\t${isCall ? 'Call' : 'Put'}\n\nCollateral:\t${
				mintInfo?.title ?? reserveMint
			}\nOption premium:\t${buyerDepositAmount} ${mintInfo?.title ?? ''}\nMax payout:\t${sellerDepositAmount} ${mintInfo?.title ?? ''}`;
		default:
			console.warn('Unsupported redeem logic');
			return;
	}
};

export const buildCreateContractMessage = (
	{ redeemLogicOption, rateOption, reserveMint, settleStart, seniorDepositAmount, juniorDepositAmount }: OtcInitializationParams,
	cluster: Cluster,
	url: string
): string => {
	const oracleInfo = getOracleByPubkey(rateOption.rateAccounts[0]);

	const header = `New ${redeemLogicOption.redeemLogicPluginType.toUpperCase()} contract created! ${cluster === 'devnet' ? '[DEVNET]' : ''}\n\nUnderlying:\t${
		oracleInfo.title
	}`;

	const body = buildBody(
		redeemLogicOption.redeemLogicPluginType,
		seniorDepositAmount,
		juniorDepositAmount,
		reserveMint,
		oracleInfo,
		redeemLogicOption.strike,
		redeemLogicOption.notional,
		redeemLogicOption.isCall
	);

	return header + body + `\n\nExpiry:\t${moment(settleStart).utc().format('DD MMM YYYY - hh:mm A [UTC]')}\n\nTrade now👇\n${url}`;
};

export const buildContractFundedMessage = (
	{ redeemLogicAccount, rateAccount, publickey, depositExpirationAt, reserveMint, buyerDepositAmount, sellerDepositAmount }: ChainOtcState,
	isBuyer: boolean,
	isSecondSide: boolean,
	cluster: Cluster,
	url: string
): string => {
	const oracleInfo = getOracleByPubkey(rateAccount.state.accountsRequiredForRefresh[0]);

	const header = `Contract ${abbreviateAddress(publickey.toBase58())} has been funded by the ${isBuyer ? 'LONG' : 'SHORT'} side${
		isSecondSide ? ' and is now live' : ''
	}! ${cluster === 'devnet' ? '[DEVNET]' : ''}\n\nUnderlying:\t${oracleInfo.title}`;

	// TODO: improve access with param types
	console.log(redeemLogicAccount.state.pluginDetails);
	const strike = redeemLogicAccount.state.pluginDetails.find(({ label }) => label.toLowerCase() === 'strike')?.value;
	const notional = redeemLogicAccount.state.pluginDetails.find(({ label }) => label.toLowerCase() === 'size')?.value;
	const isCall = redeemLogicAccount.state.pluginDetails.find(({ label }) => label.toLowerCase() === 'isCall')?.value;

	const body = buildBody(
		redeemLogicAccount.state.payoffId,
		buyerDepositAmount,
		sellerDepositAmount,
		reserveMint.toBase58(),
		oracleInfo,
		strike as number,
		notional as number,
		isCall as boolean
	);

	return (
		header +
		body +
		`\n\nExpiry:\t${moment(depositExpirationAt).utc().format('DD MMM YYYY - hh:mm A [UTC]')}\n\n${
			isSecondSide ? 'May the odds be in your favor' : isBuyer ? 'SHORT here' : 'LONG here'
		}👇\n${url}`
	);
};

export const buildContractSettledMessage = (
	{ publickey, reserveMint }: ChainOtcState,
	pnlLong: number,
	pnlShort: number,
	cluster: Cluster,
	url: string
): string => {
	const mintInfo = getMintByPubkey(reserveMint);

	const header = `Contract ${abbreviateAddress(publickey.toBase58())} has settled! ${cluster === 'devnet' ? '[DEVNET]' : ''}`;

	const pnlEmoji = (pnl: number) => {
		return pnl > 0 ? '🤑' : pnl < 0 ? '😭' : '😐';
	};

	const formatWithSign = (v: number) => {
		return (v > 0 ? '+' : '') + v.toFixed(2);
	};

	const formatPnl = (pnl: number) => {
		return `${formatWithSign(pnl)} ${mintInfo?.title ?? ''} ${pnlEmoji(pnl)}`;
	};

	const body = `\n\nPnL:\nLong:\t${formatPnl(pnlLong)}\nShort:\t${formatPnl(pnlShort)}`;

	return header + body + `\n\nFull details👇\n${url}`;
};

export const sendSnsPublisherNotification = async (cluster: Cluster, content: string) => {
	console.log('sending: ', content);

	const { error } = await supabase.functions.invoke(SNS_PUBLISHER_RPC_NAME, {
		body: JSON.stringify({ cluster, content })
	});

	if (error) console.error(error);
};
