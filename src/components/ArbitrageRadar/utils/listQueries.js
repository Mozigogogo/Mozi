/** @param {{ key: string|null, dir: 'asc'|'desc' }} sortState */
export function buildFundingQuery(sortState) {
  if (sortState.key === 'funding') {
    return { fundingSort: sortState.dir };
  }
  if (sortState.key === 'ann') {
    return { annSort: sortState.dir || 'desc' };
  }
  return {};
}

export function buildSpreadQuery(sortState) {
  if (sortState.key === 'spreadAbs') {
    return { spreadAbsSort: sortState.dir };
  }
  if (sortState.key === 'spreadPct') {
    return { spreadPctSort: sortState.dir };
  }
  if (sortState.key === 'quoteVolume') {
    return { quoteVolumeSort: sortState.dir };
  }
  return {};
}

export function buildBasisQuery(sortState) {
  if (sortState.key === 'basisAbs') {
    return { basisAbsSort: sortState.dir };
  }
  if (sortState.key === 'basisPct') {
    return { basisPctSort: sortState.dir };
  }
  return {};
}

export function buildOiQuery(sortState) {
  if (sortState.key === 'changePct') {
    return { changePctSort: sortState.dir };
  }
  return {};
}

export function buildListQuery(tab, sortState) {
  const builders = {
    funding: buildFundingQuery,
    spread: buildSpreadQuery,
    basis: buildBasisQuery,
    oi: buildOiQuery,
  };
  return (builders[tab] || buildFundingQuery)(sortState);
}
