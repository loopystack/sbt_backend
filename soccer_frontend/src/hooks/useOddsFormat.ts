import { usePreferences, OddsFormat } from '../contexts/PreferencesContext';
import { OddsConverter } from '../utils/oddsConverter';

export function useOddsFormat() {
  const { oddsFormat, setOddsFormat } = usePreferences();

  const formatOdds = (odds: number, format?: OddsFormat): string => {
    return OddsConverter.formatOdds(odds, format || oddsFormat);
  };

  const convertOdds = (value: number, fromFormat: OddsFormat, toFormat?: OddsFormat): number => {
    return OddsConverter.convertOdds(value, fromFormat, toFormat || oddsFormat);
  };

  const getOddsInFormat = (decimalOdds: number): string => {
    return formatOdds(decimalOdds);
  };

  return {
    oddsFormat,
    setOddsFormat,
    formatOdds,
    convertOdds,
    getOddsInFormat
  };
}
