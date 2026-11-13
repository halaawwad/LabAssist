import { useState } from "react";
import { effectiveAccountStatus, type AccountStatus } from "../../../../shared/web/domain";

export type DepartmentPerson = {
  name: string;
  number?: string;
  email?: string;
  active?: boolean;
  invited?: boolean;
  status?: AccountStatus;
  photoUrl?: string;
  avatarUrl?: string;
  profilePhotoUrl?: string;
};

export function DepartmentAvatar({ person }: { person: DepartmentPerson }) {
  const [failed, setFailed] = useState<string>();
  const photo = person.photoUrl || person.avatarUrl || person.profilePhotoUrl;
  const initials =
    person.name
      .split(/\s+/)
      .filter((word) => word && !/^(dr\.?|prof\.?)$/i.test(word))
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <span className="dept-member-avatar" aria-hidden="true">
      {photo && failed !== photo ? (
        <img src={photo} alt="" onError={() => setFailed(photo)} />
      ) : (
        initials
      )}
    </span>
  );
}

export function DepartmentAccountStatus({ person }: { person: DepartmentPerson }) {
  const storedStatus =
    person.status ??
    (typeof person.active === "boolean"
      ? effectiveAccountStatus({ ...person, active: person.active })
      : undefined);
  const status = storedStatus === "PENDING_ACTIVATION" ? "ACTIVE" : storedStatus;
  const labels = {
    ACTIVE: "Active",
    DISABLED: "Disabled",
    REFERENCE_ONLY: "Reference only",
  };
  return (
    <span
      className={`dept-status ${status === "DISABLED" ? "off" : status !== "ACTIVE" ? "reference" : ""}`}
    >
      {status ? labels[status] : "Status unavailable"}
    </span>
  );
}

export function DepartmentPersonRow({ person }: { person: DepartmentPerson }) {
  return (
    <div className="dept-member-row">
      <DepartmentAvatar person={person} />
      <div className="dept-member-copy">
        <div className="dept-member-identity">
          <strong>{person.name}</strong>
          <DepartmentAccountStatus person={person} />
        </div>
        {person.number && <span dir="auto">{person.number}</span>}
        {person.email && <span dir="auto">{person.email}</span>}
      </div>
    </div>
  );
}
