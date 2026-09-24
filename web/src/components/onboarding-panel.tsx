"use client";

/**
 * The one instruction a new player is being given.
 *
 * Deliberately small and deliberately singular. A tutorial that shows a checklist
 * invites a player to read ahead and then to ignore all of it; one card with one
 * thing to do is the whole design.
 *
 * It sits on the left, opposite the alert panel, because the two say different kinds
 * of thing: the alert says what is wrong with the park, and this says what to learn
 * next. They are allowed to be about the same subject at the same time — the needs
 * steps are deliberately triggered by the alerts — but this adds the how, never a
 * second copy of the what.
 */
import type { OnboardingStep } from "@/lib/game/onboarding";

export function OnboardingPanel({
  step,
  done,
  total,
  onDismiss,
}: {
  step: OnboardingStep;
  done: number;
  total: number;
  onDismiss: () => void;
}) {
  return (
    <div
      className="pointer-events-auto w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md text-sm shadow-lg"
      data-testid="onboarding"
      data-step={step.id}
      style={{ background: "rgba(30,40,54,0.96)", border: "1px solid var(--rm-line)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--rm-line)" }}>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: "var(--rm-accent)" }}
          aria-hidden
        />
        <span className="flex-1 font-semibold" style={{ color: "var(--rm-text)" }} data-testid="onboarding-title">
          {step.title}
        </span>
        <span className="text-xs" style={{ color: "var(--rm-text-quiet)" }} data-testid="onboarding-progress">
          {done}/{total}
        </span>
      </div>
      <p className="px-3 py-2 text-xs leading-relaxed" style={{ color: "var(--rm-text-quiet)" }}>
        {step.body}
      </p>
      <div className="px-3 pb-2">
        <button
          className="text-xs underline"
          style={{ color: "var(--rm-disabled)" }}
          onClick={onDismiss}
          data-testid="onboarding-dismiss"
        >
          Hide tips
        </button>
      </div>
    </div>
  );
}
