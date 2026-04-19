const fcfa = new Intl.NumberFormat("fr-TG", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const numberFr = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

export function useFormat() {
  return {
    fcfa: (v: number | null | undefined) => (v == null ? "—" : fcfa.format(v)),
    percent: (v: number | null | undefined) => (v == null ? "—" : percent.format(v)),
    number: (v: number | null | undefined) => (v == null ? "—" : numberFr.format(v)),
  };
}
