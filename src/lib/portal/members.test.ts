import {
  buildMemberDirectoryStats,
  countApprovedAdmins,
  filterPortalMembers,
  getMemberAdminLockReason,
  getMemberApprovalLockReason,
  normalizePortalMember,
  sortPortalMembers,
} from "@/lib/portal/members";

describe("portal member helpers", () => {
  it("normalizes member records with stable defaults", () => {
    expect(
      normalizePortalMember({
        email: "trent@example.com",
        full_name: "",
        is_admin: true,
        approved: true,
      }),
    ).toMatchObject({
      email: "trent@example.com",
      fullName: "trent",
      isAdmin: true,
      approved: true,
    });
  });

  it("filters members by query and directory segment", () => {
    const members = [
      normalizePortalMember({
        email: "admin@example.com",
        full_name: "Trent",
        approved: true,
        is_admin: true,
      }),
      normalizePortalMember({
        email: "member@example.com",
        full_name: "Pending Rider",
        approved: false,
        is_admin: false,
      }),
    ];

    expect(filterPortalMembers(members, "pending", "all")).toHaveLength(1);
    expect(filterPortalMembers(members, "", "approved")).toHaveLength(1);
    expect(filterPortalMembers(members, "", "pending")).toHaveLength(1);
    expect(filterPortalMembers(members, "", "admins")).toHaveLength(1);
  });

  it("locks the last approved admin from unsafe changes", () => {
    const primaryAdmin = normalizePortalMember({
      email: "admin@example.com",
      approved: true,
      is_admin: true,
    });
    const backupAdmin = normalizePortalMember({
      email: "backup@example.com",
      approved: true,
      is_admin: true,
    });

    expect(getMemberApprovalLockReason(primaryAdmin, [primaryAdmin, backupAdmin])).toBe("");
    expect(getMemberAdminLockReason(primaryAdmin, [primaryAdmin, backupAdmin])).toBe("");
    expect(getMemberAdminLockReason(backupAdmin, [backupAdmin])).toBe(
      "Grant another approved admin before removing this one.",
    );
    expect(getMemberApprovalLockReason(backupAdmin, [backupAdmin])).toBe(
      "At least one approved admin must remain.",
    );
  });

  it("builds member counts and sort order for the admin directory", () => {
    const members = sortPortalMembers([
      normalizePortalMember({
        email: "pending@example.com",
        full_name: "Pending",
        approved: false,
        is_admin: false,
      }),
      normalizePortalMember({
        email: "backup@example.com",
        full_name: "Backup",
        approved: true,
        is_admin: true,
      }),
      normalizePortalMember({
        email: "admin@example.com",
        full_name: "Trent",
        approved: true,
        is_admin: true,
      }),
    ]);

    expect(members.map((member) => member.email)).toEqual([
      "backup@example.com",
      "admin@example.com",
      "pending@example.com",
    ]);
    expect(countApprovedAdmins(members)).toBe(2);
    expect(buildMemberDirectoryStats(members)).toEqual({
      admins: 2,
      approved: 2,
      pending: 1,
      total: 3,
    });
  });
});
