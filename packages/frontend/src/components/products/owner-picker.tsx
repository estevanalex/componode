import { Label } from "@/components/ui/label";
import { useLobs, useTeams } from "@/api/hooks/org";
import type { OrgEntity } from "@/api/types";

export function OwnerSelect({
  id,
  label,
  entities,
  value,
  onChange,
  unassignedLabel = "Unassigned",
}: {
  id: string;
  label: string;
  entities: OrgEntity[] | undefined;
  value: string;
  onChange: (v: string) => void;
  unassignedLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">{unassignedLabel}</option>
        {(entities ?? []).map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Shared LOB/team owner selects (products, groups, components — spec 005). */
export function OwnerPickers({
  lobOwnerId,
  teamOwnerId,
  onLobChange,
  onTeamChange,
  showLob = true,
}: {
  lobOwnerId?: string;
  teamOwnerId?: string;
  onLobChange?: (v: string) => void;
  onTeamChange?: (v: string) => void;
  showLob?: boolean;
}) {
  const { data: lobsData } = useLobs();
  const { data: teamsData } = useTeams();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showLob && onLobChange && (
        <OwnerSelect
          id="lob-owner"
          label="Line of Business owner"
          entities={lobsData?.lobs}
          value={lobOwnerId ?? ""}
          onChange={onLobChange}
        />
      )}
      {onTeamChange && (
        <OwnerSelect
          id="team-owner"
          label="Team owner"
          entities={teamsData?.teams}
          value={teamOwnerId ?? ""}
          onChange={onTeamChange}
        />
      )}
    </div>
  );
}
