export const memberDirectoryFilters = ["all", "approved", "pending", "admins"] as const;

export type MemberDirectoryFilter = (typeof memberDirectoryFilters)[number];

export type PortalMemberRecord = {
  approved?: boolean | null;
  created_at?: string | null;
  email?: string | null;
  full_name?: string | null;
  is_admin?: boolean | null;
  notify_email?: boolean | null;
  notify_sms?: boolean | null;
  phone?: string | null;
  updated_at?: string | null;
  user_id?: string | null;
};

export type PortalMember = {
  approved: boolean;
  createdAt: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  phone: string;
  searchText: string;
  updatedAt: string;
  userId: string;
};

export function normalizePortalMember(record: PortalMemberRecord): PortalMember {
  const email = String(record.email || "")
    .trim()
    .toLowerCase();
  const fullName = String(record.full_name || "").trim() || email.split("@")[0] || "Member";
  const phone = String(record.phone || "").trim();
  const approved = record.approved !== false;
  const isAdmin = Boolean(record.is_admin);

  return {
    approved,
    createdAt: String(record.created_at || ""),
    email,
    fullName,
    isAdmin,
    notifyEmail: record.notify_email !== false,
    notifySms: Boolean(record.notify_sms),
    phone,
    searchText: `${fullName} ${email} ${phone}`.toLowerCase(),
    updatedAt: String(record.updated_at || ""),
    userId: String(record.user_id || ""),
  };
}

export function countApprovedAdmins(members: PortalMember[]) {
  return members.filter((member) => member.isAdmin && member.approved).length;
}

export function buildMemberDirectoryStats(members: PortalMember[]) {
  return {
    admins: members.filter((member) => member.isAdmin).length,
    approved: members.filter((member) => member.approved).length,
    pending: members.filter((member) => !member.approved).length,
    total: members.length,
  };
}

export function filterPortalMembers(
  members: PortalMember[],
  query: string,
  filter: MemberDirectoryFilter,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return members.filter((member) => {
    if (filter === "approved" && !member.approved) return false;
    if (filter === "pending" && member.approved) return false;
    if (filter === "admins" && !member.isAdmin) return false;
    if (!normalizedQuery) return true;
    return member.searchText.includes(normalizedQuery);
  });
}

export function getMemberApprovalLockReason(member: PortalMember, members: PortalMember[]) {
  if (member.approved && member.isAdmin && countApprovedAdmins(members) <= 1) {
    return "At least one approved admin must remain.";
  }

  return "";
}

export function getMemberAdminLockReason(member: PortalMember, members: PortalMember[]) {
  if (member.isAdmin && member.approved && countApprovedAdmins(members) <= 1) {
    return "Grant another approved admin before removing this one.";
  }

  return "";
}

export function sortPortalMembers(members: PortalMember[]) {
  return [...members].sort((left, right) => {
    if (left.isAdmin !== right.isAdmin) {
      return left.isAdmin ? -1 : 1;
    }
    if (left.approved !== right.approved) {
      return left.approved ? -1 : 1;
    }
    return left.fullName.localeCompare(right.fullName, "en-AU", { sensitivity: "base" });
  });
}
