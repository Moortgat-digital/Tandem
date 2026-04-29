"use client";

import { useMemo } from "react";
import { CellEditor } from "./CellEditor";
import { PriorityHeaderCell } from "./PriorityHeaderCell";
import { PriorityKpiCell } from "./PriorityKpiCell";
import { editableStages, stageLabel, visibleStages } from "@/lib/tandem-workflow";
import type { TandemStage, TandemStatus } from "@/types/tandem";

type PriorityDto = { position: number; title: string; kpi: string | null };
type EntryDto = {
  priority_pos: number;
  stage: TandemStage;
  inter_index: number;
  content: string | null;
  is_locked: boolean | null;
};

export function TandemGrid({
  pairId,
  status,
  nbPrioritesMax,
  priorities,
  entries,
  interDates,
  nbValidatedInter,
  kpiEditable = true,
}: {
  pairId: string;
  status: TandemStatus;
  nbPrioritesMax: number;
  priorities: PriorityDto[];
  entries: EntryDto[];
  /** Dates des RDV intermédiaires programmés (≤ 3). */
  interDates: string[];
  /** Nombre de RDV intermédiaires déjà validés. L'inter en cours = ce nombre + 1. */
  nbValidatedInter: number;
  /** Le KPI peut rester éditable même quand toute la grille est figée. */
  kpiEditable?: boolean;
}) {
  const editable = useMemo(() => editableStages(status), [status]);
  const visible = useMemo(() => visibleStages(status), [status]);

  const columns = Array.from({ length: nbPrioritesMax }, (_, i) => i + 1);

  const priorityByPos = new Map(priorities.map((p) => [p.position, p]));
  const entryByKey = new Map(
    entries.map((e) => [
      `${e.priority_pos}:${e.stage}:${e.inter_index}`,
      e,
    ])
  );

  const rdvInitialEditable = editableStages(status).includes("rdv_initial");
  const interStageEditable = (editable as readonly TandemStage[]).includes("rdv_inter");
  const openInterIndex = nbValidatedInter + 1;

  return (
    <div className="overflow-auto rounded-lg border bg-card">
      <table className="w-full min-w-[900px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[200px] border-b bg-muted/40 p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Étape
            </th>
            {columns.map((pos) => (
              <th
                key={pos}
                className="w-[260px] border-b border-l bg-muted/40 p-3 text-left align-top"
              >
                <PriorityHeaderCell
                  pairId={pairId}
                  position={pos}
                  initialTitle={priorityByPos.get(pos)?.title ?? ""}
                  editable={rdvInitialEditable}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="sticky left-0 z-10 border-b bg-muted/20 p-3 align-top text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              KPI
              <p className="mt-1 text-[10px] font-normal normal-case text-muted-foreground">
                Comment mesurer l&apos;évolution
              </p>
            </td>
            {columns.map((pos) => {
              const priority = priorityByPos.get(pos);
              const hasTitle = (priority?.title ?? "").trim().length > 0;
              return (
                <td key={pos} className="border-b border-l p-2 align-top">
                  {hasTitle ? (
                    <PriorityKpiCell
                      pairId={pairId}
                      position={pos}
                      initialKpi={priority?.kpi ?? ""}
                      editable={kpiEditable}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed bg-muted/30 p-2 text-xs text-muted-foreground">
                      Colonne non définie
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
          {visible.map((stage) => {
            if (stage === "rdv_inter") {
              // Une ligne par RDV intermédiaire programmé.
              if (interDates.length === 0) {
                return (
                  <tr key="rdv_inter_empty">
                    <td className="sticky left-0 z-10 border-b bg-muted/20 p-3 align-top text-sm font-medium">
                      RDV intermédiaire
                      <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                        Programme une date dans l&apos;en-tête pour ouvrir une
                        ligne d&apos;observations.
                      </p>
                    </td>
                    {columns.map((pos) => (
                      <td
                        key={pos}
                        className="border-b border-l p-2 align-top"
                      >
                        <div className="rounded-md border border-dashed bg-muted/30 p-2 text-xs text-muted-foreground">
                          Aucune date programmée
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              }
              return interDates.map((date, i) => {
                const interIndex = i + 1;
                const isOpen = interIndex === openInterIndex;
                const isPast = interIndex <= nbValidatedInter;
                return (
                  <tr key={`rdv_inter_${interIndex}`}>
                    <td className="sticky left-0 z-10 border-b bg-muted/20 p-3 align-top text-sm font-medium">
                      RDV intermédiaire N°{interIndex}
                      <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                        {formatDate(date)}
                      </p>
                      {isOpen && interStageEditable ? (
                        <p className="mt-1 text-[10px] font-normal text-primary">
                          Saisie en cours
                        </p>
                      ) : isPast ? (
                        <p className="mt-1 text-[10px] font-normal text-emerald-700">
                          Validé
                        </p>
                      ) : null}
                    </td>
                    {columns.map((pos) => {
                      const priority = priorityByPos.get(pos);
                      const title = priority?.title ?? "";
                      const hasTitle = title.trim().length > 0;
                      const entry = entryByKey.get(
                        `${pos}:rdv_inter:${interIndex}`
                      );
                      const isEditable =
                        isOpen &&
                        interStageEditable &&
                        hasTitle &&
                        !entry?.is_locked;
                      const placeholder = isPast
                        ? "—"
                        : isOpen
                          ? "Observations factuelles…"
                          : `Disponible après le RDV N°${interIndex - 1}`;
                      return (
                        <td
                          key={pos}
                          className="border-b border-l p-2 align-top"
                        >
                          {hasTitle ? (
                            <CellEditor
                              pairId={pairId}
                              priorityPos={pos}
                              stage="rdv_inter"
                              interIndex={interIndex}
                              initialValue={entry?.content ?? ""}
                              editable={isEditable}
                              placeholder={placeholder}
                            />
                          ) : (
                            <div className="rounded-md border border-dashed bg-muted/30 p-2 text-xs text-muted-foreground">
                              Colonne non définie
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            }

            return (
              <tr key={stage}>
                <td className="sticky left-0 z-10 border-b bg-muted/20 p-3 align-top text-sm font-medium">
                  {stageLabel(stage)}
                  {(editable as readonly TandemStage[]).includes(stage) ? (
                    <p className="mt-1 text-[10px] font-normal text-primary">
                      Saisie en cours
                    </p>
                  ) : null}
                </td>
                {columns.map((pos) => {
                  const priority = priorityByPos.get(pos);
                  const title = priority?.title ?? "";
                  const hasTitle = title.trim().length > 0;
                  const entry = entryByKey.get(`${pos}:${stage}:0`);
                  const stageEditable = (
                    editable as readonly TandemStage[]
                  ).includes(stage);
                  const isEditable =
                    stageEditable && hasTitle && !entry?.is_locked;
                  const placeholder =
                    stage === "rdv_initial"
                      ? "Décris ce que cette priorité signifie concrètement…"
                      : stage === "plan_action"
                        ? stageEditable
                          ? "Actions concrètes à mettre en place…"
                          : status === "completed"
                            ? undefined
                            : "Disponible au RDV final"
                        : "Observations factuelles…";
                  return (
                    <td
                      key={pos}
                      className="border-b border-l p-2 align-top"
                    >
                      {hasTitle ? (
                        <CellEditor
                          pairId={pairId}
                          priorityPos={pos}
                          stage={stage}
                          interIndex={0}
                          initialValue={entry?.content ?? ""}
                          editable={isEditable}
                          placeholder={placeholder}
                        />
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/30 p-2 text-xs text-muted-foreground">
                          Colonne non définie
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
