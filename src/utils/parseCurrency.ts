export function parseCurrencyToNumber(value: string) {
  const normalizedValue = value
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsedValue = Number(normalizedValue);

  if (Number.isNaN(parsedValue)) {
    return 0;
  }

  return parsedValue;
}