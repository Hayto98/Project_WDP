import type { CollaborationInvite, InviteStatus, ResearcherProfile } from "../../data/workspaceSample";

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Đang chờ",
  accepted: "Đã chấp nhận",
  declined: "Đã từ chối",
};

export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "collaborator";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "NC";
}

export function getInvitePerson(invite: CollaborationInvite, researchers: ResearcherProfile[]) {
  const researcher = researchers.find((item) => item.id === invite.researcherId);
  const name = invite.inviteeName ?? researcher?.name ?? nameFromEmail(invite.inviteeEmail);
  return {
    name,
    initials: researcher?.initials ?? initialsFromName(name),
    email: invite.inviteeEmail,
  };
}
