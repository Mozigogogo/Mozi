/** @param {HTMLTableElement|null} headTable */
export function getPresetColWidths(headTable) {
  if (!headTable) return [];
  return [...headTable.querySelectorAll('thead th')].map((th) => {
    if (th.classList.contains('col-num')) return 48;
    if (th.classList.contains('col-sym')) return 132;
    if (th.classList.contains('col-ex')) return 110;
    if (th.classList.contains('col-funding')) return 200;
    if (th.classList.contains('col-ann')) return 120;
    if (th.classList.contains('col-avg')) return 100;
    if (th.classList.contains('col-days')) return 72;
    if (th.classList.contains('col-stars') || th.classList.contains('col-rating')) return 100;
    if (th.classList.contains('col-flow')) return 280;
    if (th.classList.contains('col-prices')) return 180;
    if (th.classList.contains('col-spread-abs') || th.classList.contains('col-basis-abs')) return 150;
    if (th.classList.contains('col-spread') || th.classList.contains('col-basis')) return 150;
    if (th.classList.contains('col-vol')) return 160;
    if (th.classList.contains('col-oi')) return 160;
    if (th.classList.contains('col-oi-chg')) return 120;
    if (th.classList.contains('col-price-chg')) return 100;
    if (th.classList.contains('col-signal')) return 120;
    if (th.classList.contains('col-dir')) return 120;
    if (th.classList.contains('col-funding-ann')) return 120;
    return 100;
  });
}
