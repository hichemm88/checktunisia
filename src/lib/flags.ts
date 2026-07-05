/**
 * Nationality flag utilities.
 *
 * Our database stores ISO 3166-1 alpha-3 codes (e.g. "TUN", "FRA").
 * Emoji flags are built from alpha-2 codes via Unicode Regional Indicator letters.
 *
 * Pipeline: alpha-3 → alpha-2 → emoji flag
 */

/** Convert two-letter alpha-2 to emoji flag string */
const alpha2ToEmoji = (code: string): string =>
  code.toUpperCase().split('').map(c =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join('');

/** ISO 3166-1 alpha-3 → alpha-2 lookup */
const A3_TO_A2: Record<string, string> = {
  AFG:'AF',ALA:'AX',ALB:'AL',DZA:'DZ',ASM:'AS',AND:'AD',AGO:'AO',AIA:'AI',
  ATA:'AQ',ATG:'AG',ARG:'AR',ARM:'AM',ABW:'AW',AUS:'AU',AUT:'AT',AZE:'AZ',
  BHS:'BS',BHR:'BH',BGD:'BD',BRB:'BB',BLR:'BY',BEL:'BE',BLZ:'BZ',BEN:'BJ',
  BMU:'BM',BTN:'BT',BOL:'BO',BIH:'BA',BWA:'BW',BRA:'BR',BRN:'BN',BGR:'BG',
  BFA:'BF',BDI:'BI',CPV:'CV',KHM:'KH',CMR:'CM',CAN:'CA',CAF:'CF',TCD:'TD',
  CHL:'CL',CHN:'CN',COL:'CO',COM:'KM',COG:'CG',COD:'CD',CRI:'CR',CIV:'CI',
  HRV:'HR',CUB:'CU',CYP:'CY',CZE:'CZ',DNK:'DK',DJI:'DJ',DMA:'DM',DOM:'DO',
  ECU:'EC',EGY:'EG',SLV:'SV',GNQ:'GQ',ERI:'ER',EST:'EE',SWZ:'SZ',ETH:'ET',
  FJI:'FJ',FIN:'FI',FRA:'FR',GAB:'GA',GMB:'GM',GEO:'GE',DEU:'DE',GHA:'GH',
  GIB:'GI',GRC:'GR',GRL:'GL',GRD:'GD',GTM:'GT',GIN:'GN',GNB:'GW',GUY:'GY',
  HTI:'HT',VAT:'VA',HND:'HN',HKG:'HK',HUN:'HU',ISL:'IS',IND:'IN',IDN:'ID',
  IRN:'IR',IRQ:'IQ',IRL:'IE',ISR:'IL',ITA:'IT',JAM:'JM',JPN:'JP',JOR:'JO',
  KAZ:'KZ',KEN:'KE',KIR:'KI',PRK:'KP',KOR:'KR',KWT:'KW',KGZ:'KG',LAO:'LA',
  LVA:'LV',LBN:'LB',LSO:'LS',LBR:'LR',LBY:'LY',LIE:'LI',LTU:'LT',LUX:'LU',
  MAC:'MO',MDG:'MG',MWI:'MW',MYS:'MY',MDV:'MV',MLI:'ML',MLT:'MT',MHL:'MH',
  MRT:'MR',MUS:'MU',MEX:'MX',FSM:'FM',MDA:'MD',MCO:'MC',MNG:'MN',MNE:'ME',
  MAR:'MA',MOZ:'MZ',MMR:'MM',NAM:'NA',NRU:'NR',NPL:'NP',NLD:'NL',NZL:'NZ',
  NIC:'NI',NER:'NE',NGA:'NG',MKD:'MK',NOR:'NO',OMN:'OM',PAK:'PK',PLW:'PW',
  PSE:'PS',PAN:'PA',PNG:'PG',PRY:'PY',PER:'PE',PHL:'PH',POL:'PL',PRT:'PT',
  PRI:'PR',QAT:'QA',ROU:'RO',RUS:'RU',RWA:'RW',KNA:'KN',LCA:'LC',VCT:'VC',
  WSM:'WS',SMR:'SM',STP:'ST',SAU:'SA',SEN:'SN',SRB:'RS',SYC:'SC',SLE:'SL',
  SGP:'SG',SVK:'SK',SVN:'SI',SLB:'SB',SOM:'SO',ZAF:'ZA',SSD:'SS',ESP:'ES',
  LKA:'LK',SDN:'SD',SUR:'SR',SWE:'SE',CHE:'CH',SYR:'SY',TWN:'TW',TJK:'TJ',
  TZA:'TZ',THA:'TH',TLS:'TL',TGO:'TG',TON:'TO',TTO:'TT',TUN:'TN',TUR:'TR',
  TKM:'TM',TUV:'TV',UGA:'UG',UKR:'UA',ARE:'AE',GBR:'GB',USA:'US',URY:'UY',
  UZB:'UZ',VUT:'VU',VEN:'VE',VNM:'VN',YEM:'YE',ZMB:'ZM',ZWE:'ZW',
};

/**
 * Returns the emoji flag for an ISO 3166-1 alpha-3 country code.
 * Falls back to the code itself if unmapped.
 *
 * @example getFlag('TUN') → '🇹🇳'
 * @example getFlag('FRA') → '🇫🇷'
 */
export const getFlag = (alpha3?: string | null): string => {
  if (!alpha3) return '';
  const a2 = A3_TO_A2[alpha3.toUpperCase()];
  return a2 ? alpha2ToEmoji(a2) : alpha3;
};
