import { SupplierProfile } from "../schema/supplier";
import { SaleRecord, SellerSummaryCard } from "../schema/sellerSummary";

function categoryLabel(category: string): string {
  const parts = category.split(">").map((p) => p.trim());
  return parts[parts.length - 1] ?? category;
}

function rank<T extends string>(values: T[]): { value: T; count: number; share: number }[] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const total = values.length || 1;
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

function buildSpecialtyLine(
  topCategories: { label: string; share: number }[],
  topBrands: { brand: string; share: number }[],
  priceRange: { min: number; max: number },
): string {
  const catPart =
    topCategories.length > 0
      ? topCategories
          .slice(0, 2)
          .map((c) => c.label)
          .join(" & ")
      : "vintage apparel";

  const brandPart =
    topBrands.length > 0
      ? topBrands
          .slice(0, topBrands.length >= 3 ? 3 : 2)
          .map((b) => b.brand)
          .join(", ")
      : "a rotating mix of brands";

  return `Specializes in ${catPart} — mostly ${brandPart}, typically £${priceRange.min}–£${priceRange.max}`;
}

export function runSellerSummaryAgent(
  supplier: SupplierProfile,
  sales: SaleRecord[],
): SellerSummaryCard {
  const sellerSales = sales.filter((s) => s.seller_id === supplier.supplier_id);

  const categoryRank = rank(sellerSales.map((s) => s.category));
  const brandRank = rank(sellerSales.map((s) => s.brand));
  const countryRank = rank(sellerSales.map((s) => s.buyer_country));

  const top_categories = categoryRank.slice(0, 3).map((c) => ({
    category: c.value,
    label: categoryLabel(c.value),
    count: c.count,
    share: Math.round(c.share * 100) / 100,
  }));

  const top_brands = brandRank.slice(0, 5).map((b) => ({
    brand: b.value,
    count: b.count,
    share: Math.round(b.share * 100) / 100,
  }));

  const ships_to = countryRank.map((c) => ({
    country: c.value,
    count: c.count,
    share: Math.round(c.share * 100) / 100,
  }));

  const prices = sellerSales.map((s) => s.price_gbp);
  const price_range = prices.length
    ? {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      }
    : { min: 0, max: 0, avg: 0 };

  const ratings = sellerSales.map((s) => s.buyer_rating);
  const avg_rating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  const recent_sales = [...sellerSales]
    .sort((a, b) => (a.sold_at < b.sold_at ? 1 : -1))
    .slice(0, 5);

  const specialty_line = buildSpecialtyLine(top_categories, top_brands, price_range);

  return {
    seller_id: supplier.supplier_id,
    name: supplier.name,
    location: supplier.location,
    avatar_url: supplier.avatar_url,
    member_since: supplier.member_since,
    trust_score: supplier.overall_trust_score,
    avg_rating,
    total_sales: sellerSales.length,
    specialty_line,
    top_categories,
    top_brands,
    price_range,
    ships_to,
    badges: supplier.badges,
    recent_sales,
    generated_at: new Date().toISOString(),
  };
}
