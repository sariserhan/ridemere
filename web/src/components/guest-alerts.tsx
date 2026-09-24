"use client";

/**
 * What the park is telling the player.
 *
 * The engine decides *whether* something is worth saying; this decides how it looks.
 * That split matters: thresholds, hysteresis and cooldown depend on guest state the
 * bridge does not carry, so putting them here would mean either widening the bridge
 * or guessing.
 *
 * Every alert is a sentence and an instruction. "43 guests are hungry" is a fact;
 * "There is nowhere to eat. Build a food stall beside a path." is the reason the
 * panel exists. A player who reads only the second line can still fix the park.
 *
 * Severity is carried by a glyph as well as a colour, because colour alone fails for
 * a colour-blind player and the design system forbids it.
 */
import type { GuestAlertMessage } from "@/lib/bridge/messages";

const SEVERITY: Record<string, { colour: string; glyph: string; label: string }> = {
  IMPORTANT: { colour: "var(--rm-danger)", glyph: "!", label: "Important" },
  WARNING: { colour: "var(--rm-warning)", glyph: "▲", label: "Warning" },
  INFO: { colour: "var(--rm-secondary)", glyph: "i", label: "For information" },
};

export function GuestAlerts({
  alerts,
  collapsed,
  onToggle,
}: {
  alerts: GuestAlertMessage[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (alerts.length === 0) return null;
  const worst = SEVERITY[alerts[0].severity] ?? SEVERITY.INFO;

  return (
    <div
      className="pointer-events-auto w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md text-sm shadow-lg"
      data-testid="guest-alerts"
      data-alert-count={alerts.length}
      data-worst-severity={alerts[0].severity}
      style={{ background: "rgba(30,40,54,0.96)", border: "1px solid var(--rm-line)" }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={onToggle}
        data-testid="guest-alerts-toggle"
        aria-expanded={!collapsed}
      >
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: worst.colour, color: "var(--rm-sunken)" }}
          aria-hidden
        >
          {worst.glyph}
        </span>
        <span className="flex-1 font-semibold" style={{ color: "var(--rm-text)" }}>
          Park alerts
        </span>
        <span style={{ color: "var(--rm-text-quiet)" }}>
          {alerts.length} {collapsed ? "▴" : "▾"}
        </span>
      </button>

      {!collapsed && (
        <ul className="max-h-72 overflow-y-auto">
          {alerts.map((alert) => {
            const severity = SEVERITY[alert.severity] ?? SEVERITY.INFO;
            return (
              <li
                key={alert.kind}
                className="flex gap-2 px-3 py-2"
                data-testid="guest-alert"
                data-kind={alert.kind}
                data-severity={alert.severity}
                style={{ borderTop: "1px solid var(--rm-line)" }}
              >
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: severity.colour, color: "var(--rm-sunken)" }}
                  title={severity.label}
                >
                  {severity.glyph}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium" style={{ color: "var(--rm-text)" }}>
                    {alert.title}
                  </span>
                  <span className="block text-xs" style={{ color: "var(--rm-text-quiet)" }}>
                    {alert.advice}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
