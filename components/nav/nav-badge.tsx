import { PipelineBadge } from "@/components/nav/pipeline-badge";
import { AdminQuotaBadge } from "@/components/nav/admin-quota-badge";
import { QuestionsBadge } from "@/components/nav/questions-badge";
import { BountiesBadge } from "@/components/nav/bounties-badge";

// Single source of truth for which badge (if any) decorates a given nav
// tab, shared by every layout shell so a new variant never has to
// re-hardcode this mapping.
export function NavBadge({ href }: { href: string }) {
  switch (href) {
    case "/pipeline":
      return <PipelineBadge />;
    case "/bounties":
      return <BountiesBadge />;
    case "/questions":
      return <QuestionsBadge />;
    case "/admin":
      return <AdminQuotaBadge />;
    default:
      return null;
  }
}
