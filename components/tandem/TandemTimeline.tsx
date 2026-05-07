import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { TandemStatus } from "@/types/tandem";

type TimelineStep = {
  label: string;
  sublabel: string | null;
  status: "validated" | "active" | "scheduled" | "future";
};

export function TandemTimeline({
  status,
  datePremiereJournee,
  datePremierRdv,
  datesRdvInter,
  dateDernierRdv,
  nbValidatedInter,
}: {
  status: TandemStatus;
  datePremiereJournee: string | null;
  datePremierRdv: string | null;
  datesRdvInter: string[];
  dateDernierRdv: string | null;
  nbValidatedInter: number;
}) {
  const steps: TimelineStep[] = [];

  steps.push({
    label: "1ère journée",
    sublabel: formatDate(datePremiereJournee),
    status: datePremiereJournee ? "scheduled" : "future",
  });

  steps.push({
    label: "RDV initial",
    sublabel: formatDate(datePremierRdv),
    status: rdvInitialStatus(status),
  });

  datesRdvInter.forEach((date, i) => {
    steps.push({
      label: `Inter N°${i + 1}`,
      sublabel: formatDate(date),
      status: rdvInterStatus(status, i + 1, nbValidatedInter),
    });
  });

  steps.push({
    label: "RDV final",
    sublabel: formatDate(dateDernierRdv),
    status: rdvFinalStatus(status),
  });

  return (
    <div className="flex items-start gap-1 overflow-x-auto pb-1 pt-1">
      {steps.map((step, i) => (
        <Fragment key={i}>
          <StepDot step={step} />
          {i < steps.length - 1 ? (
            <div
              className={cn(
                "mt-2.5 h-0.5 flex-1 min-w-[16px] rounded",
                step.status === "validated"
                  ? "bg-coral/70"
                  : "bg-muted-foreground/20"
              )}
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

function StepDot({ step }: { step: TimelineStep }) {
  return (
    <div className="flex min-w-[78px] flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2",
          step.status === "validated"
            ? "border-coral bg-coral text-white"
            : step.status === "active"
              ? "border-coral bg-coral/15 animate-pulse"
              : step.status === "scheduled"
                ? "border-navy/50 bg-card"
                : "border-muted-foreground/30 bg-muted/40"
        )}
      >
        {step.status === "validated" ? (
          <Check className="h-3 w-3 stroke-[3]" />
        ) : null}
      </div>
      <p
        className={cn(
          "text-center text-[10px] font-semibold leading-tight",
          step.status === "future"
            ? "text-muted-foreground"
            : "text-foreground"
        )}
      >
        {step.label}
      </p>
      <p className="text-center text-[9px] text-muted-foreground">
        {step.sublabel ?? "—"}
      </p>
    </div>
  );
}

function rdvInitialStatus(status: TandemStatus): TimelineStep["status"] {
  if (
    status === "validated_1" ||
    status === "in_progress_rdv_inter" ||
    status === "validated_inter" ||
    status === "in_progress_rdv_final" ||
    status === "completed"
  ) {
    return "validated";
  }
  if (status === "in_progress_rdv_initial" || status === "not_started") {
    return "active";
  }
  return "scheduled";
}

function rdvInterStatus(
  status: TandemStatus,
  interIndex: number,
  nbValidatedInter: number
): TimelineStep["status"] {
  if (interIndex <= nbValidatedInter) return "validated";
  const isOpenInter = interIndex === nbValidatedInter + 1;
  if (
    isOpenInter &&
    (status === "in_progress_rdv_inter" || status === "validated_inter" || status === "validated_1")
  ) {
    return "active";
  }
  return "future";
}

function rdvFinalStatus(status: TandemStatus): TimelineStep["status"] {
  if (status === "completed") return "validated";
  if (status === "in_progress_rdv_final") return "active";
  return "future";
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
