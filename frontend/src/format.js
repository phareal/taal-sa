const fcfaFmt = new Intl.NumberFormat("fr-TG", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});
const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});
const numFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const fmt = {
  fcfa:    (v) => (v == null ? "—" : fcfaFmt.format(v)),
  percent: (v) => (v == null ? "—" : pctFmt.format(v)),
  number:  (v) => (v == null ? "—" : numFmt.format(v)),
  compact: (v) => {
    if (v == null) return "—";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
    return v.toLocaleString("fr-FR");
  },
};

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
