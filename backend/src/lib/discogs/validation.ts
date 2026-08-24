export interface UnitForValidation {
  sku?: string | null;
  price?: number | null;
  currency?: string | null;
  mediaCondition?: string | null;
  sleeveCondition?: string | null;
  saleStatus?: string | null;
  quantity?: number | null;
}

export interface ProductForValidation {
  title?: string | null;
  artist?: string | null;
  discogsReleaseId?: string | null;
}

export interface CompletenessResult {
  complete: boolean;
  missing: string[];
  errors: string[];
}

// Regles minimales pour qu'une annonce Discogs soit publiable :
// une release associee, un grading media/pochette et un prix valide.
export function validateListingPayload(
  unit: UnitForValidation,
  product: ProductForValidation | null | undefined
): CompletenessResult {
  const missing: string[] = [];
  const errors: string[] = [];

  if (!product) {
    errors.push('Unit is not linked to a product');
  } else {
    if (!product.title) missing.push('product.title');
    if (!product.artist) missing.push('product.artist');
    if (!product.discogsReleaseId) missing.push('product.discogsReleaseId');
  }

  if (!unit.mediaCondition) missing.push('mediaCondition');
  if (!unit.sleeveCondition) missing.push('sleeveCondition');

  if (unit.price === null || unit.price === undefined) {
    missing.push('price');
  } else if (unit.price <= 0) {
    errors.push('price must be greater than 0');
  }

  if (!unit.currency) missing.push('currency');

  if (unit.saleStatus !== 'available') {
    errors.push(`unit is not available for sale (status: ${unit.saleStatus ?? 'unknown'})`);
  }

  if ((unit.quantity ?? 0) < 1) {
    errors.push('quantity must be at least 1');
  }

  return {
    complete: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}
