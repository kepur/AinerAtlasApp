import { orderedVariantKeys, variantLabel } from "../api";

type Props = {
  variants: Record<string, string>;
  active: string;
  onChange: (key: string) => void;
};

export default function VariantTabs({ variants, active, onChange }: Props) {
  const keys = orderedVariantKeys(variants);
  const current = keys.includes(active) ? active : keys[0] ?? "";

  return (
    <div className="variant-tabs">
      {keys.map((key) => (
        <button
          key={key}
          className={`variant-tab ${current === key ? "active" : ""}`}
          onClick={() => onChange(key)}
        >
          {variantLabel(key)}
        </button>
      ))}
    </div>
  );
}
