/* eslint-disable camelcase */
// import { AdvancedChart } from 'react-tradingview-embed';
import dynamic from 'next/dynamic';

const DynamicAdvancedChart = dynamic(import('react-tradingview-embed/dist/components/AdvancedChart'), { ssr: false });

interface TradingViewChartProps {
	symbol: string;
}

const TradingViewChart = ({ symbol }: TradingViewChartProps) => {
	return (
		<DynamicAdvancedChart
			widgetProps={{
				symbol: symbol,
				interval: '1m',
				theme: 'dark',
				autosize: true,
				hide_top_toolbar: true,
				hide_side_toolbar: true,
				withdateranges: false,
				save_image: false,
				enable_publishing: false,
				allow_symbol_change: false
			}}
		/>
	);
};

export default TradingViewChart;
