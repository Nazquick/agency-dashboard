export type AdSpendLanguage = "en" | "no";
export type AdSpendVariant = "simple" | "advanced";

export const AD_SPEND_LANGUAGES: { value: AdSpendLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "no", label: "Norsk" },
];

export const AD_SPEND_VARIANTS: { value: AdSpendVariant; label: string; description: string }[] = [
  {
    value: "simple",
    label: "Simplified",
    description: "Plain-language overview — best for a first send to a business owner.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Full breakdown with CPM tables, formulas, and campaign setup detail.",
  },
];

export type AdSpendSimpleContent = {
  eyebrow: string;
  title: string;
  tagline: string;
  badge: string;
  intro: string;
  section1Title: string;
  targeting: { title: string; body: string }[];
  section2Title: string;
  tierUnit: string;
  tiers: { title: string; range: string; body: string }[];
  section3Title: string;
  growth: string[];
  closingText: string;
  closingSite: string;
  footerTitle: string;
  preparedLabel: string;
  confidentialLabel: string;
};

export type AdSpendAdvancedContent = {
  eyebrow: string;
  title: string;
  tagline: string;
  badge: string;
  intro: string;
  section1Title: string;
  cards: { title: string; body: string }[];
  section2Title: string;
  formula: string;
  tableHeaders: [string, string, string, string];
  tableRows: { objective: string; cpm: string; cost: string; bestFor: string }[];
  variables: { label: string; body: string }[];
  section3Title: string;
  bullets: string[];
  stats: { value: string; label: string }[];
  closingText: string;
  closingSite: string;
  footerTitle: string;
  preparedLabel: string;
  confidentialLabel: string;
};

export const AD_SPEND_CONTENT: Record<
  AdSpendLanguage,
  { simple: AdSpendSimpleContent; advanced: AdSpendAdvancedContent }
> = {
  en: {
    simple: {
      eyebrow: "DYOR STUDIO",
      title: "Ad Spend, Made Simple",
      tagline: "What we do with your ad budget, who we reach in Oslo, and why you can trust us with it.",
      badge: "META BUSINESS SUITE SPECIALISTS",
      intro:
        "We run every campaign through Meta's professional Ads Manager — never the basic \"Boost Post\" button most businesses use. That means we control exactly who sees your ad in Oslo, how often, and what it costs — so your budget goes toward real customers, not guesswork.",
      section1Title: "How we find your customers",
      targeting: [
        {
          title: "People who already showed interest",
          body: "We reach people who recently visited your website or looked at your products — the people most likely to buy.",
        },
        {
          title: "The right age, interests, and job",
          body: "We layer your audience by who they are and what they care about, so your ad isn't wasted on the wrong people.",
        },
        {
          title: "Lookalikes of your best customers",
          body: "We build new audiences that resemble your best existing customers, starting narrow and widening only once we know it works.",
        },
      ],
      section2Title: "What your budget gets you",
      tierUnit: "per 50,000 people reached",
      tiers: [
        { title: "Getting Noticed", range: "2,500 – 6,500 kr", body: "Build local awareness and video views across Oslo." },
        { title: "Getting Clicks", range: "4,500 – 8,500 kr", body: "Drive traffic to your website or a specific offer." },
        { title: "Getting Leads", range: "7,000 – 11,500 kr", body: "Collect sign-ups and form fills from real prospects." },
        { title: "Getting Sales", range: "9,500 – 15,000+ kr", body: "Drive direct purchases with measurable return." },
      ],
      section3Title: "Growing your following",
      growth: [
        "We create content people actually want to share — not just ads.",
        "Every post has one clear call to action.",
        "We cap how often the same person sees an ad, so your budget always reaches new people.",
      ],
      closingText:
        "Every krone we spend is planned, tracked, and reported back to you — built around your business, your Oslo audience, and your return. That's the DYOR standard.",
      closingSite: "dyor.studio",
      footerTitle: "DYOR Studio — Ad Spend, Made Simple",
      preparedLabel: "Prepared",
      confidentialLabel: "Confidential",
    },
    advanced: {
      eyebrow: "DYOR STUDIO",
      title: "Ad Spend & ROAS Strategy",
      tagline: "How we turn a media budget into precise, local reach in Oslo — and reach into return.",
      badge: "META BUSINESS SUITE SPECIALISTS",
      intro:
        "Every campaign we run is built inside Meta Ads Manager — never the basic \"Boost Post\" button. That one decision is what gives us structural control over exactly who sees your ad, how often, and at what cost per result. Below is exactly how we target, budget, and grow your following in the Oslo market — and what it costs to reach the people who actually matter to your business.",
      section1Title: "Precision Targeting, Down to the Person",
      cards: [
        {
          title: "High-Intent Audiences",
          body: "The Meta Pixel targets people who took a high-value action — visiting a pricing page, adding to cart — in the last 7–14 days. Customer lists let us re-target real past buyers directly.",
        },
        {
          title: "Layered Targeting",
          body: "We set targeting manually at the ad set level, requiring an interest AND a demographic AND, where relevant, a job title to match — cutting broad, wasted reach before a krone is spent.",
        },
        {
          title: "Precision Lookalikes",
          body: "Sourced from a seed of 100–1,000+ real buyers, started at a tight 1% match in Norway before ever scaling to a wider 3–5% audience.",
        },
      ],
      section2Title: "Budget, Mapped to Results — Before You Spend",
      formula: "Total Spend  =  (Target Impressions ÷ 1,000)  ×  CPM",
      tableHeaders: ["Objective", "Typical Oslo CPM", "Cost / 50,000 Impressions", "Best Used For"],
      tableRows: [
        { objective: "Awareness / Reach", cpm: "50 – 130 kr", cost: "2,500 – 6,500 kr", bestFor: "Local visibility, video views" },
        { objective: "Traffic / Clicks", cpm: "90 – 170 kr", cost: "4,500 – 8,500 kr", bestFor: "Driving to a page or offer" },
        { objective: "Lead Generation", cpm: "140 – 230 kr", cost: "7,000 – 11,500 kr", bestFor: "Form fills, sign-ups" },
        { objective: "Sales / Conversions", cpm: "190 – 300+ kr", cost: "9,500 – 15,000+ kr", bestFor: "Direct e-commerce purchases" },
      ],
      variables: [
        {
          label: "Location",
          body: "Oslo and other Norwegian metro areas sit at the higher end of Nordic CPM. Broader national or rural targeting can fall well under 40 kr.",
        },
        {
          label: "Frequency",
          body: "A tight Oslo niche repeats — to reach 50,000 unique people you may need to buy 75,000–100,000 impressions.",
        },
        {
          label: "Seasonality",
          body: "Q4 (Nov–Dec) costs run 20–40% higher industry-wide due to holiday e-commerce competition.",
        },
      ],
      section3Title: "Engagement That Compounds Into Followers",
      bullets: [
        "Set up as an Engagement campaign — Conversion Location \"On Your Ad\", optimized for Post Engagement — so Meta shows it to people with a track record of liking, commenting, and sharing in your niche.",
        "Content is built to be shared — infographics, relatable niche moments, checklist tips — with a clear call to action in every caption.",
        "Frequency is capped (e.g. once per person, per week) so budget goes toward new reach, not repeating to the same viewer.",
      ],
      stats: [
        { value: "60 – 140 kr", label: "Engagement CPM (per 1,000 impressions)" },
        { value: "3,000 – 7,000 kr", label: "Cost to reach 50,000 people" },
        { value: "0.50 – 3 kr", label: "Per like, comment, or share" },
      ],
      closingText:
        "Every krone is planned, targeted, and reported on inside Meta Ads Manager — built around your business, your Oslo audience, and your ROAS. That's the DYOR standard.",
      closingSite: "dyor.studio",
      footerTitle: "DYOR Studio — Ad Spend & ROAS Strategy",
      preparedLabel: "Prepared",
      confidentialLabel: "Confidential",
    },
  },
  no: {
    simple: {
      eyebrow: "DYOR STUDIO",
      title: "Annonsebudsjett, gjort enkelt",
      tagline: "Hva vi gjør med annonsebudsjettet ditt, hvem vi når i Oslo, og hvorfor du kan stole på oss.",
      badge: "SPESIALISTER PÅ META BUSINESS SUITE",
      intro:
        "Vi kjører hver kampanje gjennom Metas profesjonelle Ads Manager — aldri den enkle \"Boost innlegg\"-knappen de fleste bedrifter bruker. Det betyr at vi styrer nøyaktig hvem som ser annonsen din i Oslo, hvor ofte, og hva det koster — slik at budsjettet går til ekte kunder, ikke gjetting.",
      section1Title: "Slik finner vi kundene dine",
      targeting: [
        {
          title: "Folk som allerede har vist interesse",
          body: "Vi når folk som nylig har besøkt nettsiden din eller sett på produktene dine — de som er mest sannsynlig til å kjøpe.",
        },
        {
          title: "Riktig alder, interesser og yrke",
          body: "Vi lagdeler målgruppen etter hvem de er og hva de bryr seg om, slik at annonsen ikke sløses bort på feil personer.",
        },
        {
          title: "Speilede målgrupper av dine beste kunder",
          body: "Vi bygger nye målgrupper som ligner på dine beste eksisterende kunder — vi starter smalt og utvider først når vi vet det fungerer.",
        },
      ],
      section2Title: "Dette får du for budsjettet ditt",
      tierUnit: "per 50 000 personer nådd",
      tiers: [
        { title: "Bli lagt merke til", range: "2 500 – 6 500 kr", body: "Bygg lokal kjennskap og videovisninger i Oslo." },
        { title: "Få klikk", range: "4 500 – 8 500 kr", body: "Send trafikk til nettsiden din eller et konkret tilbud." },
        { title: "Få leads", range: "7 000 – 11 500 kr", body: "Samle påmeldinger og skjemautfyllinger fra reelle interessenter." },
        { title: "Få salg", range: "9 500 – 15 000+ kr", body: "Driv direkte kjøp med målbar avkastning." },
      ],
      section3Title: "Bygge følgerskaren din",
      growth: [
        "Vi lager innhold folk faktisk har lyst til å dele — ikke bare annonser.",
        "Hvert innlegg har én tydelig oppfordring til handling.",
        "Vi begrenser hvor ofte samme person ser en annonse, slik at budsjettet alltid når nye folk.",
      ],
      closingText:
        "Hver krone vi bruker er planlagt, sporet og rapportert tilbake til deg — bygget rundt din virksomhet, ditt Oslo-publikum og din avkastning. Det er DYOR-standarden.",
      closingSite: "dyor.studio",
      footerTitle: "DYOR Studio — Annonsebudsjett, gjort enkelt",
      preparedLabel: "Utarbeidet",
      confidentialLabel: "Konfidensielt",
    },
    advanced: {
      eyebrow: "DYOR STUDIO",
      title: "Annonsebudsjett & ROAS-strategi",
      tagline: "Slik omgjør vi et annonsebudsjett til presis, lokal rekkevidde i Oslo — og rekkevidde til avkastning.",
      badge: "SPESIALISTER PÅ META BUSINESS SUITE",
      intro:
        "Hver eneste kampanje vi kjører bygges inne i Meta Ads Manager — aldri med den enkle \"Boost innlegg\"-knappen. Det ene valget gir oss full kontroll over nøyaktig hvem som ser annonsen din, hvor ofte, og til hvilken kostnad per resultat. Under ser du nøyaktig hvordan vi målretter, budsjetterer og bygger følgerskaren din i Oslo-markedet — og hva det koster å nå de menneskene som faktisk betyr noe for virksomheten din.",
      section1Title: "Presis målretting, helt ned på personnivå",
      cards: [
        {
          title: "Kjøpsklare målgrupper",
          body: "Meta-pikselen målretter mennesker som har gjort en verdifull handling — besøkt en prisside, lagt noe i handlekurven — de siste 7–14 dagene. Kundelister lar oss retargetere reelle, tidligere kunder direkte.",
        },
        {
          title: "Lagdelt målretting",
          body: "Vi setter målretting manuelt på annonsesettnivå, og krever at interesse OG demografi OG, der relevant, stillingstittel stemmer overens — det kutter bred, bortkastet rekkevidde før en krone er brukt.",
        },
        {
          title: "Presise speilede målgrupper",
          body: "Bygget fra en kildegruppe på 100–1 000+ reelle kjøpere, startet med en snever 1 %-match i Norge før vi noensinne skalerer til en bredere 3–5 %-målgruppe.",
        },
      ],
      section2Title: "Budsjett koblet direkte til resultater — før du bruker en krone",
      formula: "Totalt forbruk  =  (Ønsket antall visninger ÷ 1 000)  ×  CPM",
      tableHeaders: ["Mål", "Typisk CPM i Oslo", "Kostnad / 50 000 visninger", "Brukes best til"],
      tableRows: [
        { objective: "Kjennskap / Rekkevidde", cpm: "50 – 130 kr", cost: "2 500 – 6 500 kr", bestFor: "Lokal synlighet, videovisninger" },
        { objective: "Trafikk / Klikk", cpm: "90 – 170 kr", cost: "4 500 – 8 500 kr", bestFor: "Trafikk til side eller tilbud" },
        { objective: "Leadgenerering", cpm: "140 – 230 kr", cost: "7 000 – 11 500 kr", bestFor: "Skjemautfylling, påmeldinger" },
        { objective: "Salg / Konvertering", cpm: "190 – 300+ kr", cost: "9 500 – 15 000+ kr", bestFor: "Direkte netthandel-kjøp" },
      ],
      variables: [
        {
          label: "Plassering",
          body: "Oslo og andre norske storbyområder ligger i det høyere sjiktet av nordisk CPM. Bredere nasjonal eller distriktsrettet målretting kan ligge godt under 40 kr.",
        },
        {
          label: "Frekvens",
          body: "En snever Oslo-nisje gjentar seg — for å nå 50 000 unike personer må du kanskje kjøpe 75 000–100 000 visninger.",
        },
        {
          label: "Sesongvariasjon",
          body: "Q4 (nov–des) koster typisk 20–40 % mer i hele bransjen på grunn av konkurransen i julehandelen.",
        },
      ],
      section3Title: "Engasjement som bygger følgere over tid",
      bullets: [
        "Settes opp som en engasjementskampanje — konverteringssted \"På annonsen din\", optimalisert for innleggsengasjement — slik at Meta viser den til folk med historikk for å like, kommentere og dele i din nisje.",
        "Innholdet er laget for å deles — infografikk, gjenkjennelige nisjemomenter, sjekklister — med en tydelig oppfordring til handling i hver bildetekst.",
        "Frekvensen er begrenset (f.eks. én gang per person, per uke) slik at budsjettet går til ny rekkevidde, ikke gjentakelse til samme seer.",
      ],
      stats: [
        { value: "60 – 140 kr", label: "CPM for engasjement (per 1 000 visninger)" },
        { value: "3 000 – 7 000 kr", label: "Kostnad for å nå 50 000 personer" },
        { value: "0,50 – 3 kr", label: "Per like, kommentar eller deling" },
      ],
      closingText:
        "Hver krone er planlagt, målrettet og rapportert på inne i Meta Ads Manager — bygget rundt din virksomhet, ditt Oslo-publikum og din avkastning. Det er DYOR-standarden.",
      closingSite: "dyor.studio",
      footerTitle: "DYOR Studio — Annonsebudsjett & ROAS-strategi",
      preparedLabel: "Utarbeidet",
      confidentialLabel: "Konfidensielt",
    },
  },
};
