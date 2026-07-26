export type ReportLanguage = "en" | "no" | "sv" | "da";

export const REPORT_LANGUAGES: { value: ReportLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "no", label: "Norsk (Norwegian)" },
  { value: "sv", label: "Svenska (Swedish)" },
  { value: "da", label: "Dansk (Danish)" },
];

export const REPORT_LANGUAGE_NAMES: Record<ReportLanguage, string> = {
  en: "English",
  no: "Norwegian",
  sv: "Swedish",
  da: "Danish",
};

// UserRole from lib/auth/roles.ts — duplicated as string keys here rather
// than imported, so this stays a plain data module with no app-logic deps.
const ROLE_LABELS: Record<ReportLanguage, Record<string, string>> = {
  en: {
    team_leader: "Team Leader",
    editor_designer: "Editor / Graphic Designer",
    videographer_photographer: "Videographer / Photographer",
    social_media_manager: "Social Media Manager",
  },
  no: {
    team_leader: "Teamleder",
    editor_designer: "Redigerer / Grafisk designer",
    videographer_photographer: "Videograf / Fotograf",
    social_media_manager: "Social Media-ansvarlig",
  },
  sv: {
    team_leader: "Teamledare",
    editor_designer: "Redigerare / Grafisk designer",
    videographer_photographer: "Videograf / Fotograf",
    social_media_manager: "Ansvarig för sociala medier",
  },
  da: {
    team_leader: "Teamleder",
    editor_designer: "Redigerer / Grafisk designer",
    videographer_photographer: "Videograf / Fotograf",
    social_media_manager: "Social media-ansvarlig",
  },
};

export function translatedRoleLabel(role: string, language: ReportLanguage): string {
  return ROLE_LABELS[language][role] ?? role;
}

const STATUS_LABELS: Record<ReportLanguage, Record<string, string>> = {
  en: {
    not_started: "Not started",
    in_progress: "In progress",
    blocked: "Blocked",
    review: "Review",
    done: "Done",
  },
  no: {
    not_started: "Ikke startet",
    in_progress: "Pågår",
    blocked: "Blokkert",
    review: "Til gjennomgang",
    done: "Ferdig",
  },
  sv: {
    not_started: "Ej påbörjad",
    in_progress: "Pågår",
    blocked: "Blockerad",
    review: "Under granskning",
    done: "Klar",
  },
  da: {
    not_started: "Ikke startet",
    in_progress: "I gang",
    blocked: "Blokeret",
    review: "Til gennemgang",
    done: "Færdig",
  },
};

export function translatedStatusLabel(status: string, language: ReportLanguage): string {
  return STATUS_LABELS[language][status] ?? status;
}

const PRIORITY_LABELS: Record<ReportLanguage, Record<string, string>> = {
  en: { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" },
  no: { low: "Lav", medium: "Middels", high: "Høy", urgent: "Haster" },
  sv: { low: "Låg", medium: "Medel", high: "Hög", urgent: "Brådskande" },
  da: { low: "Lav", medium: "Middel", high: "Høj", urgent: "Haster" },
};

export function translatedPriorityLabel(priority: string, language: ReportLanguage): string {
  return PRIORITY_LABELS[language][priority] ?? priority;
}

const UNASSIGNED: Record<ReportLanguage, string> = {
  en: "Unassigned",
  no: "Ikke tildelt",
  sv: "Ej tilldelad",
  da: "Ikke tildelt",
};

export function translatedUnassigned(language: ReportLanguage): string {
  return UNASSIGNED[language];
}

export type ReportLabels = {
  subtitle: (date: string) => string;
  overview: string;
  summary: string;
  totalTasks: string;
  completed: string;
  estimatedHours: string;
  rolesActivatedStat: string;
  rolesActivatedSection: string;
  contributedMostPrefix: string;
  completedTasksSuffix: (count: number) => string;
  roleCol: string;
  tasksCol: string;
  workPerformed: string;
  taskCol: string;
  statusCol: string;
  priorityCol: string;
  hoursCol: string;
  contentEngagement: string;
  assetCol: string;
  viewsCol: string;
  likesCol: string;
  commentsCol: string;
  sharesCol: string;
  performanceHighlights: string;
  bestAsset: string;
  worstAsset: string;
  topPerformers: string;
  needsAttention: string;
  salesCampaign: string;
  campaignFiguresFrom: (date: string) => string;
  salesGrowth: string;
  roas: string;
  adSpend: string;
  appDownloads: string;
  soldValue: string;
  soldUnits: string;
  adviceTitle: string;
  adviceEmpty: string;
  footer: string;
};

export const REPORT_LABELS: Record<ReportLanguage, ReportLabels> = {
  en: {
    subtitle: (date) => `Agency performance report — generated ${date}`,
    overview: "Overview",
    summary: "Summary",
    totalTasks: "Total tasks",
    completed: "Completed",
    estimatedHours: "Estimated hours",
    rolesActivatedStat: "Roles activated",
    rolesActivatedSection: "Roles activated",
    contributedMostPrefix: "Contributed most to this period's success: ",
    completedTasksSuffix: (n) => `(${n} completed task${n === 1 ? "" : "s"})`,
    roleCol: "Role",
    tasksCol: "Tasks",
    workPerformed: "Work performed",
    taskCol: "Task",
    statusCol: "Status",
    priorityCol: "Priority",
    hoursCol: "Hours",
    contentEngagement: "Content engagement",
    assetCol: "Asset",
    viewsCol: "Views",
    likesCol: "Likes",
    commentsCol: "Comments",
    sharesCol: "Shares",
    performanceHighlights: "Performance highlights",
    bestAsset: "Best performing asset",
    worstAsset: "Weakest performing asset",
    topPerformers: "Top performers: ",
    needsAttention: "Needs attention: ",
    salesCampaign: "Sales & campaign performance",
    campaignFiguresFrom: (date) => `Campaign figures from the report submitted ${date}.`,
    salesGrowth: "Sales growth",
    roas: "ROAS",
    adSpend: "Ad spend",
    appDownloads: "App downloads",
    soldValue: "Sold items — value",
    soldUnits: "Sold items — units",
    adviceTitle: "Advice for a better month",
    adviceEmpty:
      "Not enough data yet to generate advice — log a few reports and content assets first.",
    footer: "Prepared by your agency team · Confidential",
  },
  no: {
    subtitle: (date) => `Byråets resultatrapport — generert ${date}`,
    overview: "Oversikt",
    summary: "Sammendrag",
    totalTasks: "Totalt antall oppgaver",
    completed: "Fullført",
    estimatedHours: "Estimerte timer",
    rolesActivatedStat: "Aktiverte roller",
    rolesActivatedSection: "Aktiverte roller",
    contributedMostPrefix: "Bidro mest til periodens suksess: ",
    completedTasksSuffix: (n) =>
      n === 1 ? "(1 fullført oppgave)" : `(${n} fullførte oppgaver)`,
    roleCol: "Rolle",
    tasksCol: "Oppgaver",
    workPerformed: "Utført arbeid",
    taskCol: "Oppgave",
    statusCol: "Status",
    priorityCol: "Prioritet",
    hoursCol: "Timer",
    contentEngagement: "Engasjement på innhold",
    assetCol: "Innhold",
    viewsCol: "Visninger",
    likesCol: "Likerklikk",
    commentsCol: "Kommentarer",
    sharesCol: "Delinger",
    performanceHighlights: "Ytelseshøydepunkter",
    bestAsset: "Best presterende innhold",
    worstAsset: "Svakest presterende innhold",
    topPerformers: "Best presterende: ",
    needsAttention: "Trenger oppmerksomhet: ",
    salesCampaign: "Salg og kampanjeresultater",
    campaignFiguresFrom: (date) => `Kampanjetall fra rapporten sendt inn ${date}.`,
    salesGrowth: "Salgsvekst",
    roas: "ROAS",
    adSpend: "Annonseforbruk",
    appDownloads: "App-nedlastinger",
    soldValue: "Solgte varer — verdi",
    soldUnits: "Solgte varer — antall",
    adviceTitle: "Råd for en bedre måned",
    adviceEmpty:
      "Ikke nok data til å generere råd ennå — logg noen rapporter og innholdselementer først.",
    footer: "Utarbeidet av ditt byråteam · Konfidensielt",
  },
  sv: {
    subtitle: (date) => `Byråns resultatrapport — genererad ${date}`,
    overview: "Översikt",
    summary: "Sammanfattning",
    totalTasks: "Totalt antal uppgifter",
    completed: "Avklarade",
    estimatedHours: "Uppskattade timmar",
    rolesActivatedStat: "Aktiverade roller",
    rolesActivatedSection: "Aktiverade roller",
    contributedMostPrefix: "Bidrog mest till periodens framgång: ",
    completedTasksSuffix: (n) =>
      n === 1 ? "(1 avklarad uppgift)" : `(${n} avklarade uppgifter)`,
    roleCol: "Roll",
    tasksCol: "Uppgifter",
    workPerformed: "Utfört arbete",
    taskCol: "Uppgift",
    statusCol: "Status",
    priorityCol: "Prioritet",
    hoursCol: "Timmar",
    contentEngagement: "Engagemang för innehåll",
    assetCol: "Innehåll",
    viewsCol: "Visningar",
    likesCol: "Gilla-markeringar",
    commentsCol: "Kommentarer",
    sharesCol: "Delningar",
    performanceHighlights: "Prestationshöjdpunkter",
    bestAsset: "Bäst presterande innehåll",
    worstAsset: "Svagast presterande innehåll",
    topPerformers: "Bäst presterande: ",
    needsAttention: "Behöver uppmärksamhet: ",
    salesCampaign: "Försäljning och kampanjresultat",
    campaignFiguresFrom: (date) => `Kampanjsiffror från rapporten som skickades in ${date}.`,
    salesGrowth: "Försäljningstillväxt",
    roas: "ROAS",
    adSpend: "Annonsutgifter",
    appDownloads: "App-nedladdningar",
    soldValue: "Sålda varor — värde",
    soldUnits: "Sålda varor — antal",
    adviceTitle: "Råd för en bättre månad",
    adviceEmpty:
      "Inte tillräckligt med data för att generera råd ännu — logga några rapporter och innehåll först.",
    footer: "Framtaget av ditt byråteam · Konfidentiellt",
  },
  da: {
    subtitle: (date) => `Bureauets resultatrapport — genereret ${date}`,
    overview: "Oversigt",
    summary: "Sammendrag",
    totalTasks: "Samlet antal opgaver",
    completed: "Gennemført",
    estimatedHours: "Estimerede timer",
    rolesActivatedStat: "Aktiverede roller",
    rolesActivatedSection: "Aktiverede roller",
    contributedMostPrefix: "Bidrog mest til periodens succes: ",
    completedTasksSuffix: (n) =>
      n === 1 ? "(1 gennemført opgave)" : `(${n} gennemførte opgaver)`,
    roleCol: "Rolle",
    tasksCol: "Opgaver",
    workPerformed: "Udført arbejde",
    taskCol: "Opgave",
    statusCol: "Status",
    priorityCol: "Prioritet",
    hoursCol: "Timer",
    contentEngagement: "Engagement på indhold",
    assetCol: "Indhold",
    viewsCol: "Visninger",
    likesCol: "Likes",
    commentsCol: "Kommentarer",
    sharesCol: "Delinger",
    performanceHighlights: "Præstationshøjdepunkter",
    bestAsset: "Bedst præsterende indhold",
    worstAsset: "Svagest præsterende indhold",
    topPerformers: "Bedst præsterende: ",
    needsAttention: "Kræver opmærksomhed: ",
    salesCampaign: "Salg og kampagneresultater",
    campaignFiguresFrom: (date) => `Kampagnetal fra rapporten indsendt ${date}.`,
    salesGrowth: "Salgsvækst",
    roas: "ROAS",
    adSpend: "Annonceforbrug",
    appDownloads: "App-downloads",
    soldValue: "Solgte varer — værdi",
    soldUnits: "Solgte varer — antal",
    adviceTitle: "Råd til en bedre måned",
    adviceEmpty:
      "Ikke nok data til at generere råd endnu — log nogle rapporter og indholdselementer først.",
    footer: "Udarbejdet af dit bureauteam · Fortroligt",
  },
};
