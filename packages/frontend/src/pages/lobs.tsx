import { Landmark } from "lucide-react";
import { OrgPage } from "@/components/products/org-page";
import {
  useLobs,
  useCreateLob,
  useUpdateLob,
  useDeleteLob,
} from "@/api/hooks/org";

export function LobsPage() {
  return (
    <OrgPage
      title="Lines of Business"
      icon={Landmark}
      entityKey="lobs"
      useList={useLobs}
      useCreate={useCreateLob}
      useUpdate={useUpdateLob}
      useDelete={useDeleteLob}
    />
  );
}
