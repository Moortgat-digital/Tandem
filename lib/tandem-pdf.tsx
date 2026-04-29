import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { TandemStage, TandemStatus } from "@/types/tandem";
import { statusLabel } from "@/lib/tandem-workflow";

export type TandemPdfData = {
  organisationName: string;
  sessionName: string;
  status: TandemStatus;
  participantName: string;
  managerName: string;
  attentes: {
    participant: string;
    manager: string;
  };
  dates: {
    premiereJournee: string | null;
    premierRdv: string | null;
    rdvInter: string[];
    dernierRdv: string | null;
  };
  priorities: {
    position: number;
    title: string;
    kpi: string;
  }[];
  entries: {
    priorityPos: number;
    stage: TandemStage;
    interIndex: number;
    content: string;
  }[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0a0a0a",
    lineHeight: 1.4,
  },
  headerEyebrow: {
    fontSize: 8,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  statusLine: {
    fontSize: 9,
    color: "#525252",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#404040",
    marginTop: 18,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 4,
  },
  twoCol: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 8,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    marginBottom: 6,
  },
  attenteBlock: {
    flex: 1,
    backgroundColor: "#fafafa",
    padding: 8,
    borderRadius: 3,
  },
  priorityHeader: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f5f5f5",
    padding: 6,
    marginTop: 14,
    marginBottom: 6,
  },
  kpiBlock: {
    backgroundColor: "#fafafa",
    padding: 6,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#a3a3a3",
  },
  kpiLabel: {
    fontSize: 8,
    color: "#525252",
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  stageBlock: {
    marginBottom: 8,
  },
  stageLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#262626",
    marginBottom: 2,
  },
  stageDate: {
    fontSize: 8,
    color: "#737373",
    marginBottom: 3,
  },
  stageContent: {
    fontSize: 10,
    color: "#0a0a0a",
  },
  empty: {
    fontSize: 10,
    color: "#a3a3a3",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#a3a3a3",
    textAlign: "center",
  },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    right: 40,
    fontSize: 8,
    color: "#a3a3a3",
  },
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getEntry(
  entries: TandemPdfData["entries"],
  priorityPos: number,
  stage: TandemStage,
  interIndex: number
): string {
  return (
    entries.find(
      (e) =>
        e.priorityPos === priorityPos &&
        e.stage === stage &&
        e.interIndex === interIndex
    )?.content ?? ""
  );
}

export function TandemPdfDocument({ data }: { data: TandemPdfData }) {
  const exportedAt = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const populatedPriorities = data.priorities.filter(
    (p) => p.title.trim().length > 0
  );

  return (
    <Document title={`Tandem — ${data.participantName} × ${data.managerName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerEyebrow}>
          {data.organisationName} · {data.sessionName}
        </Text>
        <Text style={styles.title}>
          Tandem — {data.participantName} × {data.managerName}
        </Text>
        <Text style={styles.statusLine}>
          {statusLabel(data.status)} · Exporté le {exportedAt}
        </Text>

        <Text style={styles.sectionTitle}>Informations du parcours</Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Participant (N)</Text>
            <Text style={styles.fieldValue}>{data.participantName}</Text>
            <Text style={styles.fieldLabel}>1ère journée</Text>
            <Text style={styles.fieldValue}>
              {formatDate(data.dates.premiereJournee)}
            </Text>
            <Text style={styles.fieldLabel}>1er RDV Tandem</Text>
            <Text style={styles.fieldValue}>
              {formatDate(data.dates.premierRdv)}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Manager (N+1)</Text>
            <Text style={styles.fieldValue}>{data.managerName}</Text>
            <Text style={styles.fieldLabel}>RDV intermédiaires</Text>
            <Text style={styles.fieldValue}>
              {data.dates.rdvInter.length === 0
                ? "Non programmés"
                : data.dates.rdvInter
                    .map((d, i) => `N°${i + 1} — ${formatDate(d)}`)
                    .join("\n")}
            </Text>
            <Text style={styles.fieldLabel}>Dernier RDV</Text>
            <Text style={styles.fieldValue}>
              {formatDate(data.dates.dernierRdv)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Attentes vis-à-vis du parcours</Text>
        <View style={styles.twoCol}>
          <View style={styles.attenteBlock}>
            <Text style={styles.fieldLabel}>Attentes du participant</Text>
            {data.attentes.participant ? (
              <Text style={styles.stageContent}>
                {data.attentes.participant}
              </Text>
            ) : (
              <Text style={styles.empty}>Non renseigné</Text>
            )}
          </View>
          <View style={styles.attenteBlock}>
            <Text style={styles.fieldLabel}>Attentes du manager</Text>
            {data.attentes.manager ? (
              <Text style={styles.stageContent}>{data.attentes.manager}</Text>
            ) : (
              <Text style={styles.empty}>Non renseigné</Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Compte rendu par priorité</Text>
        {populatedPriorities.length === 0 ? (
          <Text style={styles.empty}>
            Aucune priorité n&apos;a encore été définie pour ce binôme.
          </Text>
        ) : (
          populatedPriorities.map((p) => (
            <View key={p.position} wrap={false}>
              <Text style={styles.priorityHeader}>
                Priorité {p.position} — {p.title}
              </Text>

              <View style={styles.kpiBlock}>
                <Text style={styles.kpiLabel}>
                  KPI · Comment mesurer l&apos;évolution
                </Text>
                {p.kpi ? (
                  <Text style={styles.stageContent}>{p.kpi}</Text>
                ) : (
                  <Text style={styles.empty}>Non renseigné</Text>
                )}
              </View>

              <View style={styles.stageBlock}>
                <Text style={styles.stageLabel}>RDV initial — Description</Text>
                <RenderEntry
                  content={getEntry(data.entries, p.position, "rdv_initial", 0)}
                />
              </View>

              {data.dates.rdvInter.length === 0 ? (
                <View style={styles.stageBlock}>
                  <Text style={styles.stageLabel}>RDV intermédiaire</Text>
                  <Text style={styles.empty}>Aucune date programmée</Text>
                </View>
              ) : (
                data.dates.rdvInter.map((date, i) => {
                  const idx = i + 1;
                  return (
                    <View key={idx} style={styles.stageBlock}>
                      <Text style={styles.stageLabel}>
                        RDV intermédiaire N°{idx}
                      </Text>
                      <Text style={styles.stageDate}>{formatDate(date)}</Text>
                      <RenderEntry
                        content={getEntry(
                          data.entries,
                          p.position,
                          "rdv_inter",
                          idx
                        )}
                      />
                    </View>
                  );
                })
              )}

              <View style={styles.stageBlock}>
                <Text style={styles.stageLabel}>RDV final — Observations</Text>
                <RenderEntry
                  content={getEntry(data.entries, p.position, "rdv_final", 0)}
                />
              </View>

              <View style={styles.stageBlock}>
                <Text style={styles.stageLabel}>Plan d&apos;action</Text>
                <RenderEntry
                  content={getEntry(
                    data.entries,
                    p.position,
                    "plan_action",
                    0
                  )}
                />
              </View>
            </View>
          ))
        )}

        <Text style={styles.footer} fixed>
          Tandem by Moortgat · {data.organisationName}
        </Text>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function RenderEntry({ content }: { content: string }) {
  if (!content.trim()) {
    return <Text style={styles.empty}>Non renseigné</Text>;
  }
  return <Text style={styles.stageContent}>{content}</Text>;
}
