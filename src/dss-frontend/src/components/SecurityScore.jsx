import { useEffect, useState } from "react";

function ScoreRing({ score, size = 56, stroke = 6, fontSize = 13 }) {
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  let fill = "#E24B4A";
  let track = "#FCEBEB";
  if (clamped >= 80) {
    fill = "#639922";
    track = "#EAF3DE";
  } else if (clamped >= 50) {
    fill = "#BA7517";
    track = "#FAEEDA";
  }

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={fill}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          fontWeight: 500,
        }}
      >
        {Math.round(clamped)}%
      </div>
    </div>
  );
}

function CategoryRow({ name, score, showDivider = true }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 0",
        borderBottom: showDivider ? "0.5px solid #d1d5db" : "none",
      }}
    >
      <ScoreRing score={score} size={56} stroke={6} fontSize={13} />
      <div style={{ fontSize: 14 }}>{name}</div>
    </div>
  );
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const SEVERITY_STYLE = {
  high: { fg: "#791F1F", bg: "#FCEBEB", label: "High" },
  medium: { fg: "#854F0B", bg: "#FAEEDA", label: "Medium" },
  low: { fg: "#27500A", bg: "#EAF3DE", label: "Low" },
};

function RecommendationRow({ category, text, severity = "medium" }) {
  const style = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.medium;
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: style.fg,
          background: style.bg,
          borderRadius: 6,
          padding: "3px 8px",
          height: "fit-content",
          whiteSpace: "nowrap",
        }}
      >
        {style.label}
      </span>
      <div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>{category}</div>
        <div style={{ fontSize: 14 }}>{text}</div>
      </div>
    </div>
  );
}

export default function SecuritySetupScore({
  categories: categoriesProp,
  overallScore: overallScoreProp,
  fetchCategories,
  recommendations = [],
}) {
  const [categories, setCategories] = useState(categoriesProp ?? []);
  const [loading, setLoading] = useState(!categoriesProp && !!fetchCategories);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (categoriesProp) {
      setCategories(categoriesProp);
      return;
    }
    if (!fetchCategories) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCategories()
      .then((data) => {
        if (!cancelled) setCategories(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load scores");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoriesProp, fetchCategories]);

  const overall =
    overallScoreProp ??
    (categories.length
      ? Math.round(categories.reduce((sum, c) => sum + (c.score ?? 0), 0) / categories.length)
      : 0);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "0.5px solid #d1d5db",
        borderRadius: 12,
        padding: "20px 24px",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          paddingBottom: 20,
          borderBottom: "0.5px solid #d1d5db",
        }}
      >
        <ScoreRing score={overall} size={96} stroke={10} fontSize={22} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Score générale de securité</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {loading
              ? "Chargement de catégories…"
              : `Aggregat sur ${categories.length} catégor${categories.length === 1 ? "ie" : "ies"}`}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "14px 0", fontSize: 13, color: "#E24B4A" }}>{error}</div>
      )}

      {!error &&
        categories.map((cat, i) => (
          <CategoryRow
            key={cat.name ?? i}
            name={cat.name}
            score={cat.score}
            showDivider={i < categories.length - 1}
          />
        ))}

      {recommendations.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 16, borderTop: "0.5px solid #d1d5db" }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Recommendations</div>
          {[...recommendations]
            .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 1) - (SEVERITY_ORDER[b.severity] ?? 1))
            .map((rec, i, arr) => (
              <div
                key={i}
                style={{ borderBottom: i < arr.length - 1 ? "0.5px solid #d1d5db" : "none" }}
              >
                <RecommendationRow category={rec.category} text={rec.text} severity={rec.severity} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}