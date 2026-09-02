import { parseLogoUrl } from '../arbitrageTabs';

function parseFundingPct(raw) {
  const n = parseFloat(String(raw ?? '').replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function parsePeriodLabel(raw) {
  const s = String(raw ?? '').trim();
  return s || '8h';
}

function mapValidSpotFields(item) {
  const rawList = item?.validSpotExchanges ?? item?.valid_spot_exchanges;
  const validSpotExchanges = Array.isArray(rawList)
    ? rawList.map((ex) => String(ex || '').trim()).filter(Boolean)
    : [];
  const countRaw = Number(item?.validSpotCount ?? item?.valid_spot_count);
  const validSpotCount =
    Number.isFinite(countRaw) && countRaw >= 0
      ? Math.floor(countRaw)
      : validSpotExchanges.length;
  const topRaw = item?.topSpotByQv ?? item?.top_spot_by_qv;
  const topSpotByQv =
    topRaw == null || String(topRaw).trim() === '' ? null : String(topRaw).trim();
  return { validSpotCount, validSpotExchanges, topSpotByQv };
}

export function mapFundingItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const periodLabel = parsePeriodLabel(item.currentFundingPeriod ?? item.period);
  const periodMatch = periodLabel.match(/(\d+)/);
  const avg30Raw = item.mean30dPct;
  const avg30 =
    avg30Raw == null || avg30Raw === ''
      ? null
      : Number.isFinite(Number(avg30Raw))
        ? Number(avg30Raw)
        : null;
  const perp = Number(item.perpPrice ?? item.perp_price ?? item.perp);
  const spot = Number(item.spotPrice ?? item.spot_price ?? item.spot);
  const basisRaw = Number(item.basisPct ?? item.basis_pct ?? item.basis);
  const basis =
    Number.isFinite(basisRaw)
      ? basisRaw
      : Number.isFinite(perp) && Number.isFinite(spot) && spot !== 0
        ? ((perp - spot) / spot) * 100
        : null;
  const oiUsd = Number(
    item.oiUsd ?? item.oi_usd ?? item.openInterestUsd ?? item.currentOiUsd ?? item.current_oi_usd,
  );
  const oiContracts = Number(item.oi ?? item.openInterest ?? item.open_interest);
  const oi24h = Number(item.oiChange24hPct ?? item.oi_change_24h_pct ?? item.oi24h);
  const oi7d = Number(item.oiChange7dPct ?? item.oi_change_7d_pct ?? item.oi7d);
  const takerFeeRate = Number(item.takerFeeRate ?? item.taker_fee_rate);
  const makerFeeRate = Number(item.makerFeeRate ?? item.maker_fee_rate);
  const openFeeRate = Number(item.openFeeRate ?? item.open_fee_rate);
  const closeFeeRate = Number(item.closeFeeRate ?? item.close_fee_rate);
  const settlementsPerDay = Number(
    item.fundingSettlementsPerDay ?? item.funding_settlements_per_day,
  );
  const marginBufferRatio = Number(item.marginBufferRatio ?? item.margin_buffer_ratio);
  const spotFields = mapValidSpotFields(item);
  return {
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    exchange: String(item.exchange || '').trim() || '—',
    funding: parseFundingPct(item.currentFunding ?? item.funding),
    period: periodMatch ? Number(periodMatch[1]) : 8,
    periodLabel,
    ann: Number.isFinite(Number(item.annualizedPct)) ? Number(item.annualizedPct) : 0,
    avg30,
    days: Number.isFinite(Number(item.continuousDays)) ? Number(item.continuousDays) : 0,
    rating: Math.max(1, Math.min(5, Math.floor(Number(item.rating) || 0) || 1)),
    warn: String(item.riskTag || '') === 'warning_extreme',
    riskTooltip: item.riskTooltip != null ? String(item.riskTooltip) : null,
    quoteVolume24h: item.quoteVolume24h != null ? String(item.quoteVolume24h) : null,
    nextFundingTs: Number(item.nextFundingTs) || 0,
    dataTs: Number(item.dataTs) || 0,
    oiUsd: Number.isFinite(oiUsd) ? oiUsd : null,
    oiContracts: Number.isFinite(oiContracts) ? oiContracts : null,
    oi: Number.isFinite(oiUsd) ? oiUsd : Number.isFinite(oiContracts) ? oiContracts : null,
    oi24h: Number.isFinite(oi24h) ? oi24h : null,
    oi7d: Number.isFinite(oi7d) ? oi7d : null,
    basis: Number.isFinite(basis) ? basis : null,
    perp: Number.isFinite(perp) ? perp : null,
    spot: Number.isFinite(spot) ? spot : null,
    takerFeeRate: Number.isFinite(takerFeeRate) ? takerFeeRate : null,
    makerFeeRate: Number.isFinite(makerFeeRate) ? makerFeeRate : null,
    openFeeRate: Number.isFinite(openFeeRate) ? openFeeRate : null,
    closeFeeRate: Number.isFinite(closeFeeRate) ? closeFeeRate : null,
    fundingSettlementsPerDay:
      Number.isFinite(settlementsPerDay) && settlementsPerDay > 0 ? settlementsPerDay : null,
    marginBufferRatio:
      Number.isFinite(marginBufferRatio) && marginBufferRatio > 0 ? marginBufferRatio : null,
    ...spotFields,
    logoUrl: parseLogoUrl(item),
  };
}
