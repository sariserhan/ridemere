import { PRODUCT } from "@/lib/product";

/**
 * The product wordmark. Typographic, not a logo, and deliberately text in a component
 * rather than an image: the name is a working title and must stay trivially
 * replaceable until it is cleared.
 */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-base" : "text-2xl";
  return (
    <span className={`${scale} font-semibold tracking-tight select-none`}>
      <span style={{ color: "var(--rm-accent)" }}>R</span>
      <span>{PRODUCT.name.slice(1)}</span>
    </span>
  );
}
