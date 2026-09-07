import { UsersRound } from "lucide-react";
import { OrgPage } from "@/components/products/org-page";
import {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
} from "@/api/hooks/org";

export function TeamsPage() {
  return (
    <OrgPage
      title="Teams"
      icon={UsersRound}
      entityKey="teams"
      useList={useTeams}
      useCreate={useCreateTeam}
      useUpdate={useUpdateTeam}
      useDelete={useDeleteTeam}
      showRoster
    />
  );
}
