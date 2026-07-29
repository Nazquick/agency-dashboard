import { Document, Page, Text, View, StyleSheet, Svg, Path } from "@react-pdf/renderer";

const BLUE = "#5b86c2";
const INK = "#111827";
const MUTED = "#6b7280";
const BODY = "#374151";
const BORDER = "#e5e7eb";
const PANEL = "#f8faff";

const styles = StyleSheet.create({
  page: { padding: 34, paddingBottom: 28, fontSize: 10, fontFamily: "Helvetica", color: INK },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontSize: 8.5, letterSpacing: 2, color: BLUE, fontWeight: 700 },
  title: { fontSize: 26, fontWeight: 700, marginTop: 6 },
  tagline: { fontSize: 10, color: MUTED, marginTop: 5, maxWidth: 330, lineHeight: 1.4 },
  badge: {
    fontSize: 7.5,
    color: "#ffffff",
    backgroundColor: BLUE,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
    letterSpacing: 0.8,
    fontWeight: 700,
  },
  rule: { height: 1, backgroundColor: BORDER, marginTop: 10, marginBottom: 12 },

  intro: { fontSize: 10, color: BODY, lineHeight: 1.5, marginBottom: 14 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 7,
    color: INK,
  },
  sectionNum: { color: BLUE },

  cardRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: PANEL,
    borderRadius: 5,
    padding: 10,
    borderTopWidth: 3,
    borderTopColor: BLUE,
  },
  cardTitle: { fontSize: 9.5, fontWeight: 700, color: INK, marginBottom: 4 },
  cardBody: { fontSize: 8.6, color: BODY, lineHeight: 1.4 },

  formula: {
    fontSize: 10,
    color: INK,
    backgroundColor: PANEL,
    padding: 9,
    borderRadius: 5,
    marginBottom: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },

  table: { marginBottom: 9 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: INK,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  th: { fontSize: 7.5, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 },
  td: { fontSize: 9, color: INK },
  tdMuted: { fontSize: 8.4, color: MUTED },

  variablesRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  variable: { flex: 1 },
  variableLabel: { fontSize: 8, fontWeight: 700, color: BLUE, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  variableBody: { fontSize: 8.4, color: BODY, lineHeight: 1.4 },

  splitRow: { flexDirection: "row", gap: 20 },
  splitCol: { flex: 1 },
  bullet: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { fontSize: 8.5, color: BLUE, marginRight: 6, fontFamily: "Helvetica-Bold" },
  bulletText: { fontSize: 8.8, color: BODY, lineHeight: 1.4, flex: 1 },

  statBox: { backgroundColor: PANEL, borderRadius: 5, padding: 9, marginBottom: 7 },
  statValue: { fontSize: 15, fontWeight: 700, color: INK },
  statLabel: { fontSize: 7.5, color: MUTED, marginTop: 2, lineHeight: 1.3 },

  closingBand: {
    marginTop: 4,
    backgroundColor: INK,
    borderRadius: 5,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closingText: { fontSize: 10.5, color: "#ffffff", lineHeight: 1.5, maxWidth: 400 },
  closingSite: { fontSize: 10, color: "#9fc0e8", fontWeight: 700 },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 34,
    right: 34,
    fontSize: 7.5,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cornerTL: { position: "absolute", top: 14, left: 18 },
  cornerTR: { position: "absolute", top: 14, right: 18 },
  cornerBL: { position: "absolute", bottom: 12, left: 18 },
  cornerBR: { position: "absolute", bottom: 12, right: 18 },
});

// Same vector as components/branding/dyor-logo.tsx, redrawn with react-pdf's
// Svg/Path primitives — react-pdf can't render a plain React DOM <svg>.
function DyorMark({ style, fill = "#d1d5db" }: { style: object; fill?: string }) {
  return (
    <Svg viewBox="0 0 144 25" style={{ width: 36, height: 6.25, ...style }} fixed>
      <Path
        d="M0 24.5769V0.524178C0.138608 0.506705 0.257237 0.479248 0.375865 0.479248C6.76308 0.494225 13.1503 0.444302 19.535 0.557876C22.9403 0.619031 26.2831 1.21685 29.3375 2.87553C32.6653 4.68273 34.4235 7.49213 34.5933 11.275C34.6907 13.4491 34.6033 15.6021 33.6605 17.6239C32.2919 20.5581 29.8469 22.2056 26.8987 23.2365C24.1802 24.1875 21.3506 24.5482 18.4961 24.5757C12.4847 24.6343 6.47088 24.5994 0.45953 24.6019C0.318424 24.6019 0.177318 24.5869 0 24.5769ZM9.23804 18.1631C9.3804 18.1831 9.50027 18.2155 9.6189 18.2155C11.9915 18.2155 14.364 18.2505 16.7354 18.1993C18.5061 18.1606 20.2668 17.9671 21.9138 17.2333C23.6033 16.4807 24.7347 15.2726 24.9532 13.363C25.1855 11.3312 24.7721 9.54769 22.959 8.32584C21.8114 7.55328 20.514 7.09524 19.1591 7.03658C15.9 6.89555 12.6346 6.87558 9.37166 6.81068C9.33669 6.81068 9.30173 6.84813 9.23804 6.88557V18.1631Z"
        fill={fill}
      />
      <Path
        d="M83.1761 24.9787C79.6909 25.0586 76.2307 24.8589 72.8891 23.7394C71.1572 23.159 69.5526 22.3478 68.174 21.1284C66.3021 19.4722 65.207 17.3892 64.9086 14.9243C64.6064 12.4307 64.5789 9.93453 65.5454 7.54948C66.914 4.17346 69.6475 2.3775 72.9553 1.28169C75.2842 0.51039 77.6955 0.170916 80.1317 0.0773108C83.9391 -0.0687128 87.7489 -0.0849377 91.4963 0.779972C93.6841 1.28419 95.7582 2.05799 97.5601 3.43835C99.7679 5.13073 101.049 7.37225 101.38 10.1255C101.635 12.241 101.653 14.3614 101.055 16.4345C100.053 19.9078 97.6375 22.0445 94.3934 23.37C91.8797 24.3971 89.2337 24.8102 86.5452 24.9675C85.4251 25.0324 84.2987 24.9787 83.1761 24.9787ZM83.2036 18.5087C84.7233 18.5387 86.3091 18.3802 87.8488 17.8735C90.5161 16.9961 91.9221 15.1777 91.9584 12.5655C91.9946 9.89959 90.7558 8.08115 88.0474 7.22498C84.6658 6.15664 81.2368 6.19533 77.8653 7.33107C76.3006 7.85775 75.0607 8.86369 74.5886 10.5111C73.8044 13.2481 74.5062 16.1948 77.8004 17.6076C79.4961 18.334 81.2868 18.53 83.2036 18.5075V18.5087Z"
        fill={fill}
      />
      <Path
        d="M103.429 0.527923C103.584 0.507954 103.705 0.479248 103.825 0.479248C111.566 0.491729 119.307 0.486736 127.047 0.535411C128.842 0.546644 130.613 0.866148 132.263 1.62747C134.696 2.75073 135.741 4.51424 135.576 7.3461C135.433 9.81478 133.892 11.2176 131.736 12.0925C131.495 12.1898 131.247 12.271 130.907 12.3933C131.5 12.6267 131.992 12.7852 132.452 13.0073C134.54 14.0133 135.617 15.6919 135.694 18.0021C135.721 18.8333 135.692 19.6658 135.702 20.4982C135.719 21.8424 135.572 23.2015 136.159 24.5519H126.457C126.444 24.3385 126.423 24.1189 126.422 23.8992C126.417 22.7547 126.441 21.6102 126.413 20.467C126.349 17.7799 125.121 16.4695 122.432 16.3858C119.771 16.3022 117.106 16.3459 114.443 16.3359C113.867 16.3334 113.292 16.3359 112.658 16.3359V24.5582H103.43V0.527923H103.429ZM112.683 10.4588C112.84 10.475 112.941 10.4962 113.041 10.4962C116.491 10.4962 119.942 10.505 123.392 10.485C123.842 10.4825 124.305 10.3889 124.736 10.2553C125.615 9.98202 126.088 9.27187 126.068 8.36702C126.048 7.4784 125.584 6.80195 124.714 6.56232C124.2 6.42129 123.651 6.36512 123.116 6.36263C119.874 6.34516 116.631 6.35389 113.389 6.35389C113.167 6.35389 112.944 6.35389 112.685 6.35389V10.4588H112.683Z"
        fill={fill}
      />
      <Path
        d="M54.2545 15.6032V24.5656H45.0751V15.572C40.6846 10.5835 36.3053 5.60746 31.8424 0.536571H42.8986C45.1975 3.24737 47.5313 6.0006 49.9077 8.80376C52.3302 5.99935 54.7053 3.24862 57.0641 0.516602H67.1825C62.8382 5.585 58.5675 10.5685 54.2532 15.6032H54.2545Z"
        fill={fill}
      />
      <Path
        d="M140.931 0C141.433 0 141.923 0.128551 142.4 0.385652C142.879 0.642754 143.251 1.01093 143.518 1.49144C143.785 1.9707 143.919 2.46992 143.919 2.99036C143.919 3.51081 143.788 4.00005 143.524 4.47556C143.261 4.95108 142.892 5.3205 142.419 5.5826C141.945 5.84594 141.449 5.97699 140.931 5.97699C140.412 5.97699 139.917 5.84594 139.442 5.5826C138.968 5.3205 138.599 4.95108 138.335 4.47556C138.07 4.00005 137.939 3.50457 137.939 2.99036C137.939 2.47616 138.072 1.9707 138.341 1.49144C138.609 1.01218 138.983 0.644002 139.461 0.385652C139.939 0.128551 140.429 0 140.931 0ZM140.931 0.495482C140.511 0.495482 140.102 0.602816 139.704 0.818731C139.307 1.03465 138.995 1.34167 138.772 1.74105C138.547 2.14168 138.435 2.55729 138.435 2.99036C138.435 3.42344 138.544 3.83406 138.765 4.22845C138.986 4.62283 139.295 4.93111 139.691 5.15201C140.087 5.37292 140.501 5.48275 140.931 5.48275C141.36 5.48275 141.775 5.37292 142.171 5.15201C142.567 4.93111 142.875 4.62408 143.094 4.22845C143.313 3.83406 143.422 3.42095 143.422 2.99036C143.422 2.55978 143.311 2.14043 143.087 1.74105C142.864 1.34042 142.553 1.0334 142.154 0.818731C141.755 0.604064 141.348 0.495482 140.929 0.495482H140.931ZM139.618 4.6428V1.42654H140.723C141.102 1.42654 141.375 1.45649 141.544 1.51515C141.712 1.57506 141.847 1.67865 141.948 1.82592C142.048 1.97444 142.1 2.13045 142.1 2.29769C142.1 2.53232 142.016 2.73701 141.849 2.91174C141.681 3.08647 141.458 3.18382 141.18 3.20503C141.294 3.25246 141.385 3.30987 141.454 3.37477C141.584 3.50207 141.742 3.71424 141.93 4.01253L142.322 4.6428H141.687L141.401 4.13609C141.177 3.73796 140.996 3.48834 140.858 3.38725C140.763 3.31361 140.625 3.27617 140.442 3.27617H140.138V4.6428H139.618ZM140.138 2.83186H140.768C141.069 2.83186 141.275 2.78693 141.385 2.69707C141.495 2.60721 141.55 2.48864 141.55 2.34012C141.55 2.24527 141.524 2.1604 141.471 2.08427C141.419 2.00939 141.345 1.95322 141.252 1.91578C141.158 1.87834 140.984 1.86087 140.731 1.86087H140.14V2.83186H140.138Z"
        fill={fill}
      />
    </Svg>
  );
}

export function AdSpendStrategyDocument({ generatedAt }: { generatedAt: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DyorMark style={styles.cornerTL} />
        <DyorMark style={styles.cornerTR} />
        <DyorMark style={styles.cornerBL} />
        <DyorMark style={styles.cornerBR} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>DYOR STUDIO</Text>
            <Text style={styles.title}>Ad Spend & ROAS Strategy</Text>
            <Text style={styles.tagline}>
              How we turn a media budget into precise, local reach — and reach into return.
            </Text>
          </View>
          <Text style={styles.badge}>META BUSINESS SUITE SPECIALISTS</Text>
        </View>
        <View style={styles.rule} />

        <Text style={styles.intro}>
          Every campaign we run is built inside Meta Ads Manager — never the basic &quot;Boost
          Post&quot; button. That one decision is what gives us structural control over exactly
          who sees your ad, how often, and at what cost per result. Below is exactly how we
          target, budget, and grow your following — and what it costs to reach the people who
          actually matter to your business.
        </Text>

        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionNum}>01 · </Text>Precision Targeting, Down to the Person
        </Text>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>High-Intent Audiences</Text>
            <Text style={styles.cardBody}>
              The Meta Pixel targets people who took a high-value action — visiting a pricing
              page, adding to cart — in the last 7–14 days. Customer lists let us re-target real
              past buyers directly.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Layered Targeting</Text>
            <Text style={styles.cardBody}>
              We set targeting manually at the ad set level, requiring an interest AND a
              demographic AND, where relevant, a job title to match — cutting broad, wasted
              reach before a krone is spent.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Precision Lookalikes</Text>
            <Text style={styles.cardBody}>
              Sourced from a seed of 100–1,000+ real buyers, started at a tight 1% match in your
              target country before ever scaling to a wider 3–5% audience.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionNum}>02 · </Text>Budget, Mapped to Results — Before You Spend
        </Text>
        <Text style={styles.formula}>
          Total Spend  =  (Target Impressions ÷ 1,000)  ×  CPM
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: "26%" }]}>Objective</Text>
            <Text style={[styles.th, { width: "22%" }]}>Typical Niche CPM</Text>
            <Text style={[styles.th, { width: "24%" }]}>Cost / 50,000 Impressions</Text>
            <Text style={[styles.th, { width: "28%" }]}>Best Used For</Text>
          </View>
          {[
            ["Awareness / Reach", "$5 – 12", "$250 – 600", "Local visibility, video views"],
            ["Traffic / Clicks", "$9 – 16", "$450 – 800", "Driving to a page or offer"],
            ["Lead Generation", "$14 – 22", "$700 – 1,100", "Form fills, sign-ups"],
            ["Sales / Conversions", "$18 – 28+", "$900 – 1,400+", "Direct e-commerce purchases"],
          ].map(([obj, cpm, cost, use]) => (
            <View style={styles.tableRow} key={obj}>
              <Text style={[styles.td, { width: "26%", fontWeight: 700 }]}>{obj}</Text>
              <Text style={[styles.td, { width: "22%" }]}>{cpm}</Text>
              <Text style={[styles.td, { width: "24%" }]}>{cost}</Text>
              <Text style={[styles.tdMuted, { width: "28%" }]}>{use}</Text>
            </View>
          ))}
        </View>
        <View style={styles.variablesRow}>
          <View style={styles.variable}>
            <Text style={styles.variableLabel}>Location</Text>
            <Text style={styles.variableBody}>
              Competitive markets (US, UK) sit at the higher end. Global or developing-region
              targeting can fall under $5 CPM.
            </Text>
          </View>
          <View style={styles.variable}>
            <Text style={styles.variableLabel}>Frequency</Text>
            <Text style={styles.variableBody}>
              A tight niche repeats — to reach 50,000 unique people you may need to buy
              75,000–100,000 impressions.
            </Text>
          </View>
          <View style={styles.variable}>
            <Text style={styles.variableLabel}>Seasonality</Text>
            <Text style={styles.variableBody}>
              Q4 (Nov–Dec) costs run 20–40% higher industry-wide due to holiday e-commerce
              competition.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionNum}>03 · </Text>Engagement That Compounds Into Followers
        </Text>
        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <View style={styles.bullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                Set up as an Engagement campaign — Conversion Location &quot;On Your Ad&quot;,
                optimized for Post Engagement — so Meta shows it to people with a track record of
                liking, commenting, and sharing in your niche.
              </Text>
            </View>
            <View style={styles.bullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                Content is built to be shared — infographics, relatable niche moments, checklist
                tips — with a clear call to action in every caption.
              </Text>
            </View>
            <View style={styles.bullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                Frequency is capped (e.g. once per person, per week) so budget goes toward new
                reach, not repeating to the same viewer.
              </Text>
            </View>
          </View>
          <View style={{ width: 172 }}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>$6 – 14</Text>
              <Text style={styles.statLabel}>Engagement CPM (per 1,000 impressions)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>$300 – 700</Text>
              <Text style={styles.statLabel}>Cost to reach 50,000 people</Text>
            </View>
            <View style={[styles.statBox, { marginBottom: 0 }]}>
              <Text style={styles.statValue}>$0.05 – 0.30</Text>
              <Text style={styles.statLabel}>Per like, comment, or share</Text>
            </View>
          </View>
        </View>

        <View style={styles.closingBand}>
          <Text style={styles.closingText}>
            Every krone is planned, targeted, and reported on inside Meta Ads Manager — built
            around your business, your local audience, and your ROAS. That&apos;s the DYOR
            standard.
          </Text>
          <Text style={styles.closingSite}>dyor.studio</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>DYOR Studio — Ad Spend & ROAS Strategy</Text>
          <Text>Prepared {generatedAt} · Confidential</Text>
        </View>
      </Page>
    </Document>
  );
}
