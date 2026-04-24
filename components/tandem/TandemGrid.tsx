"use client";

import { useMemo } from "react";
import { CellEditor } from "./CellEditor";
import { PriorityHeaderCell } from "./PriorityHeaderCell";
import { editableStages, stageLabel, visibleStages } from "@/lib/tandem-workflow";
import type { TandemStage, TandemStatus } from "@/types/tandem";

type PriorityDto = { position: number; title: string };
type EntryDto = {
  priority_pos: number;
  stage: TandemStage;
  content: string | null;
  is_locked: boolean | null;
};

export function TandemGrid({
  pairId,
  status,
  nbPrioritesMax,
  priorities,
  entries,
}: {
  pairId: string;
  status: TandemStatus;
  nbPrioritesMax: number;
  priorities: PriorityDto[];
  entries: EntryDto[];
}) {
  const editable = useMemo(() => editableStages(status), [status]);
  const visible = useMemo(() => visibleStages(status), [status]);

  const columns = Array.from({ length: nbPrioritesMax }, (_, i) => i + 1);

  const priorityByPos = new Map(priorities.map((p) => [p.position, p.title]));
  const entryByKey = new Map(
    entries.map((e) => [`${e.priority_pos}:${e.stage}`, e])
  );

  const rdvInitialEditable = editableStages(status).includes("rdv_initial");

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
                  initialTitle={priorityByPos.get(pos) ?? ""}
                  editable={rdvInitialEditable}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((stage) => (
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
                const title = priorityByPos.get(pos) ?? "";
                const hasTitle = title.trim().length > 0;
                const entry = entryByKey.get(`${pos}:${stage}`);
                const isEditable =
                  (editable as readonly TandemStage[]).includes(stage) && hasTitle && !entry?.is_locked;
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
                        initialValue={entry?.content ?? ""}
                        editable={isEditable}
                        placeholder={
                          stage === "rdv_initial"
                            ? "Décris ce que cette priorité signifie concrètement…"
                            : stage === "plan_action"
                              ? "Actions concrètes à mettre en place…"
                              : "Observations factuelles…"
                        }
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
