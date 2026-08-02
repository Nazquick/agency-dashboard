"use client";

import { useState, type ReactNode } from "react";
import { ClientActivityPanel } from "@/components/clients/client-activity-panel";
import { MemberActivityPanel } from "@/components/team/member-activity-panel";
import { SalaryPanel } from "@/components/admin/salary-panel";
import { CompanyFinances } from "@/components/admin/company-finances";
import { EmailBroadcastDialog } from "@/components/admin/email-broadcast-dialog";
import { CreateClientDialog } from "@/components/admin/create-client-dialog";
import { ClientQuotaPanel } from "@/components/admin/client-quota-panel";
import { AddMemberDialog } from "@/components/team/add-member-dialog";
import { AdSpendStrategyDownload } from "@/components/admin/ad-spend-strategy-download";
import type { WorkloadTask } from "@/components/team/workload-kanban";
import type { Tables } from "@/lib/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ClientLoginProfile = Pick<Tables<"profiles">, "id" | "full_name" | "client_id">;
type QuotaClient = Pick<Tables<"clients">, "id" | "name" | "monthly_credit_limit">;
type QuotaTask = Pick<
  Tables<"tasks">,
  "id" | "title" | "client_id" | "created_at" | "status" | "overage_charged" | "task_type" | "archived"
>;
type QuotaTopup = Pick<Tables<"credit_topups">, "client_id" | "period_start" | "credits_added">;

const SECTIONS = [
  { key: "client-activity", title: "Client activity", description: "Portal logins, time spent, and actions per client." },
  { key: "member-activity", title: "Member activity", description: "Logins, time in the app, and actions per team member." },
  { key: "salary", title: "Salary adjustments", description: "Review workload and adjust monthly salaries." },
  { key: "finances", title: "Company finances", description: "Income, expenses, and net — including team salaries." },
  { key: "client-quotas", title: "Client quotas", description: "Who's over their monthly credit, and billing for overage." },
  { key: "email-clients", title: "Email all clients", description: "Send a one-off message to every client's primary contact." },
  { key: "email-members", title: "Email all members", description: "Send a one-off message to the whole team." },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function AdminGrid({
  clients,
  quotaClients,
  quotaTasks,
  quotaTopups,
  loginProfiles,
  members,
  salaries,
  tasks,
  companyTransactions,
  salaryTotal,
  initialSessions,
  initialActivity,
}: {
  clients: Pick<Tables<"clients">, "id" | "name">[];
  quotaClients: QuotaClient[];
  quotaTasks: QuotaTask[];
  quotaTopups: QuotaTopup[];
  loginProfiles: ClientLoginProfile[];
  members: Tables<"profiles">[];
  salaries: Tables<"profile_salaries">[];
  tasks: WorkloadTask[];
  companyTransactions: Tables<"company_transactions">[];
  salaryTotal: number;
  initialSessions: Tables<"user_sessions">[];
  initialActivity: Tables<"activity_log">[];
}) {
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const memberProfiles = members.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
    role: m.role,
  }));

  function content(key: SectionKey): ReactNode {
    switch (key) {
      case "client-activity":
        return (
          <ClientActivityPanel
            clients={clients}
            initialLoginProfiles={loginProfiles}
            initialSessions={initialSessions}
            initialActivity={initialActivity}
          />
        );
      case "member-activity":
        return (
          <MemberActivityPanel
            members={memberProfiles}
            initialSessions={initialSessions}
            initialActivity={initialActivity}
          />
        );
      case "salary":
        return <SalaryPanel tasks={tasks} members={members} initialSalaries={salaries} />;
      case "finances":
        return <CompanyFinances initialTransactions={companyTransactions} salaryTotal={salaryTotal} />;
      case "client-quotas":
        return (
          <ClientQuotaPanel clients={quotaClients} initialTasks={quotaTasks} initialTopups={quotaTopups} />
        );
      case "email-clients":
        return <EmailBroadcastDialog audience="clients" />;
      case "email-members":
        return <EmailBroadcastDialog audience="members" />;
    }
  }

  const active = SECTIONS.find((s) => s.key === openSection);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card key={section.key}>
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <div>
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
              </div>
              <Button
                variant="outline"
                className="mt-auto"
                onClick={() => setOpenSection(section.key)}
              >
                Open
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <div>
              <h3 className="text-sm font-semibold">Create client</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add a new client record.</p>
            </div>
            <div className="mt-auto">
              <CreateClientDialog />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <div>
              <h3 className="text-sm font-semibold">Create member</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add a new team login.</p>
            </div>
            <div className="mt-auto">
              <AddMemberDialog />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <div>
              <h3 className="text-sm font-semibold">Ad spend strategy</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Download our one-pager on Meta ad spend, targeting, and ROAS — safe to send to any
                client.
              </p>
            </div>
            <div className="mt-auto">
              <AdSpendStrategyDownload />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openSection !== null} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
          </DialogHeader>
          {openSection && content(openSection)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
