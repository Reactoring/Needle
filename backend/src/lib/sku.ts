const SKU_PREFIX = 'VIN';
const SKU_PADDING = 6;

const SKU_PATTERN = /^VIN-(\d+)$/;

export function parseSkuNumber(sku: string | null | undefined): number {
  if (!sku) return 0;
  const match = sku.match(SKU_PATTERN);
  return match ? parseInt(match[1], 10) : 0;
}

export function nextSku(lastSku: string | null | undefined): string {
  const next = parseSkuNumber(lastSku) + 1;
  return `${SKU_PREFIX}-${String(next).padStart(SKU_PADDING, '0')}`;
}
