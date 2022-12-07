import { PublicKey } from '@solana/web3.js';

import { RateAccount } from './plugins/rate/RateAccount';
import { PayoffAccount } from './plugins/redeemLogic/PayoffAccount';

export abstract class AbsOtcState {
	/**
	 * Current Contract public key
	 */
	publickey: PublicKey;

	/**
	 * VyperCore account pubkey
	 */
	vyperCoreTrancheConfig: PublicKey;

	/**
	 * Collateral mint info
	 */
	collateralMint: PublicKey;

	/**
	 * Creation timestamp in ms
	 */
	createdAt: number;

	/**
	 * Deposit available from timestamp in ms
	 */
	depositAvailableFrom: number;

	/**
	 * Deposit expiration timestamp in ms
	 */
	depositExpirationAt: number;

	/**
	 * Settlement available from timestamp in ms
	 */
	settleAvailableFromAt: number;

	/**
	 * Amount of tokens the buyer needs to deposit
	 */
	buyerDepositAmount: number;

	/**
	 * Amount of tokens the seller needs to deposit
	 */
	sellerDepositAmount: number;

	/**
	 * Redeem logic account
	 */
	redeemLogicAccount: PayoffAccount;

	/**
	 * Rate account
	 */
	rateAccount: RateAccount;
}
