import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type ReportSections = {
  overview: boolean;
  taskList: boolean;
  rolesSummary: boolean;
  engagement: boolean;
  performance: boolean;
};

export type ReportData = {
  clientName: string;
  clientDescription: string | null;
  generatedAt: string;
  sections: ReportSections;
  stats: {
    totalTasks: number;
    doneTasks: number;
    totalHours: number;
    roleActivity: { role: string; count: number }[];
  };
  tasks: {
    title: string;
    status: string;
    priority: string;
    assigneeRole: string;
    hours: number | null;
    createdAt: string;
  }[];
  assets: {
    title: string;
    platform: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    tier: string;
  }[];
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 4, marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 22,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  paragraph: { fontSize: 10, color: "#374151", lineHeight: 1.5 },
  statGrid: { flexDirection: "row", gap: 10, marginTop: 4 },
  statBox: { flex: 1, padding: 10, backgroundColor: "#f9fafb", borderRadius: 4 },
  statValue: { fontSize: 16, fontWeight: 700 },
  statLabel: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  th: { fontSize: 8, fontWeight: 700, color: "#374151", textTransform: "uppercase" },
  td: { fontSize: 9, color: "#111827" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#9ca3af" },
});

function col(width: string) {
  return { width };
}

export function ClientReportDocument({ data }: { data: ReportData }) {
  const { clientName, clientDescription, generatedAt, sections, stats, tasks, assets } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{clientName}</Text>
        <Text style={styles.subtitle}>
          Agency performance report — generated {new Date(generatedAt).toLocaleDateString()}
        </Text>

        {sections.overview && clientDescription && (
          <View>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.paragraph}>{clientDescription}</Text>
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalTasks}</Text>
              <Text style={styles.statLabel}>Total tasks</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.doneTasks}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalHours.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Estimated hours</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.roleActivity.length}</Text>
              <Text style={styles.statLabel}>Roles activated</Text>
            </View>
          </View>
        </View>

        {sections.rolesSummary && stats.roleActivity.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Roles activated</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, col("70%")]}>Role</Text>
              <Text style={[styles.th, col("30%")]}>Tasks</Text>
            </View>
            {stats.roleActivity.map((r) => (
              <View style={styles.tableRow} key={r.role}>
                <Text style={[styles.td, col("70%")]}>{r.role}</Text>
                <Text style={[styles.td, col("30%")]}>{r.count}</Text>
              </View>
            ))}
          </View>
        )}

        {sections.taskList && tasks.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Work performed</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, col("40%")]}>Task</Text>
              <Text style={[styles.th, col("20%")]}>Role</Text>
              <Text style={[styles.th, col("15%")]}>Status</Text>
              <Text style={[styles.th, col("15%")]}>Priority</Text>
              <Text style={[styles.th, col("10%")]}>Hours</Text>
            </View>
            {tasks.map((t, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.td, col("40%")]}>{t.title}</Text>
                <Text style={[styles.td, col("20%")]}>{t.assigneeRole}</Text>
                <Text style={[styles.td, col("15%")]}>{t.status}</Text>
                <Text style={[styles.td, col("15%")]}>{t.priority}</Text>
                <Text style={[styles.td, col("10%")]}>{t.hours ? t.hours.toFixed(1) : "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {sections.engagement && assets.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Content engagement</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, col("34%")]}>Asset</Text>
              <Text style={[styles.th, col("16%")]}>Views</Text>
              <Text style={[styles.th, col("16%")]}>Likes</Text>
              <Text style={[styles.th, col("17%")]}>Comments</Text>
              <Text style={[styles.th, col("17%")]}>Shares</Text>
            </View>
            {assets.map((a, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.td, col("34%")]}>{a.title}</Text>
                <Text style={[styles.td, col("16%")]}>{a.views.toLocaleString()}</Text>
                <Text style={[styles.td, col("16%")]}>{a.likes.toLocaleString()}</Text>
                <Text style={[styles.td, col("17%")]}>{a.comments.toLocaleString()}</Text>
                <Text style={[styles.td, col("17%")]}>{a.shares.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {sections.performance && assets.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Performance highlights</Text>
            <Text style={styles.paragraph}>
              Top performers: {assets.filter((a) => a.tier === "high").map((a) => a.title).join(", ") || "—"}
            </Text>
            <Text style={styles.paragraph}>
              Needs attention: {assets.filter((a) => a.tier === "low").map((a) => a.title).join(", ") || "—"}
            </Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Prepared by your agency team · Confidential
        </Text>
      </Page>
    </Document>
  );
}
