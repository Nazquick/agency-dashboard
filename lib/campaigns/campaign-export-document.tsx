import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { DyorMark } from "@/lib/reports/client-report-document";

// Deliberately excludes budget, ad spend, ROAS, boost location, and notes —
// this is the client-facing summary, not the internal record. Only what a
// client should see: name, client, channels, publication date, visuals.
export type CampaignExportData = {
  code: string;
  name: string;
  clientName: string;
  channels: string[];
  publicationDate: string | null;
  generatedAt: string;
  images: { url: string; fileName: string }[];
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  code: { fontSize: 8, color: "#9ca3af", marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 22,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  fieldGrid: { flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" },
  fieldBox: { minWidth: 140, padding: 10, backgroundColor: "#f9fafb", borderRadius: 4 },
  fieldValue: { fontSize: 12, fontWeight: 700 },
  fieldLabel: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  imageBox: { width: 150 },
  image: { width: 150, height: 150, objectFit: "cover", borderRadius: 4 },
  imageCaption: { fontSize: 7, color: "#9ca3af", marginTop: 3 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#9ca3af" },
  cornerTL: { position: "absolute", top: 16, left: 20 },
  cornerBR: { position: "absolute", bottom: 16, right: 20 },
});

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CampaignExportDocument({ data }: { data: CampaignExportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DyorMark style={styles.cornerTL} />
        <DyorMark style={styles.cornerBR} />

        <Text style={styles.title}>{data.name}</Text>
        <Text style={styles.subtitle}>{data.clientName}</Text>
        <Text style={styles.code}>{data.code}</Text>

        <View>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.fieldGrid}>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{formatDate(data.publicationDate)}</Text>
              <Text style={styles.fieldLabel}>Publication date</Text>
            </View>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>
                {data.channels.length > 0 ? data.channels.join(", ") : "—"}
              </Text>
              <Text style={styles.fieldLabel}>Distribution channels</Text>
            </View>
          </View>
        </View>

        {data.images.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Visuals</Text>
            <View style={styles.imageGrid}>
              {data.images.map((img) => (
                <View key={img.url} style={styles.imageBox}>
                  <Image src={img.url} style={styles.image} />
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Prepared by DYOR Studio — {new Date(data.generatedAt).toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}
