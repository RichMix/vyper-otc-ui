/* eslint-disable css-modules/no-unused-class */
import { Button, CircularProgress } from '@mui/material';
import cn from 'classnames';

import styles from './ButtonPill.module.scss';

type ButtonPillProps = {
	/**
	 * The text content of the button
	 */
	text: string;

	/**
	 * The mode that specifies the color of the button
	 */
	mode: 'success' | 'error' | 'info' | 'disabled';

	/**
	 * Additional props for icon that will be added in the left side of the button
	 */
	icon?: any;

	/**
	 * Shows a spinner to display a loading state when set to true
	 */
	loading?: boolean;
	disabled?: boolean;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

const ButtonPill = ({ text, onClick, mode = 'info', icon, loading }: ButtonPillProps) => {
	return (
		<div className={styles.container}>
			<Button className={cn(styles.button, styles[mode], loading && styles.disabled)} onClick={onClick} startIcon={icon} disabled={loading}>
				{loading ? <CircularProgress className={styles.progress} size={16} /> : null}
				{text}
			</Button>
		</div>
	);
};

export default ButtonPill;
