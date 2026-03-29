import { createClient } from "@supabase/supabase-js";
import {
  buildSiteUrl,
  portalOwnerEmailNormalized,
  portalLogoUrl as PORTAL_LOGO_URL,
  posthogHost as POSTHOG_HOST,
  posthogKey as POSTHOG_KEY,
  publicSiteUrl as PUBLIC_SITE_URL,
  supabaseAnonKey as SAFE_SUPABASE_ANON_KEY,
  supabaseUrl as SUPABASE_URL,
} from "@/lib/site-config";
import {
  cloneSiteContent,
  mergeSiteContent,
  pickSiteContentAdvanced,
  siteContentDefaults as SITE_CONTENT_DEFAULTS,
} from "@/lib/site-content-contract";
import { normalizeSiteImagePath } from "@/lib/media";
import {
  buildMemberDirectoryStats,
  countApprovedAdmins,
  filterPortalMembers,
  getMemberAdminLockReason,
  getMemberApprovalLockReason,
  normalizePortalMember,
  sortPortalMembers,
} from "@/lib/portal/members";
import {
  categoryLabel as getCategoryLabel,
  normalizeCategory as normalizePortalCategory,
  normalizePortalProduct as buildNormalizedPortalProduct,
  portalProductCategoryOptions as PRODUCT_CATEGORY_OPTIONS,
} from "@/lib/portal/products";

const db = createClient(SUPABASE_URL, SAFE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const PROFILE_TABLE = "member_profiles";
const BROADCAST_TABLE = "member_broadcasts";
const BROADCAST_DELIVERIES_TABLE = "member_broadcast_deliveries";
const SITE_CONTENT_TABLE = "site_content";
const SITE_CONTENT_RECORD_ID = "public_site";
const MEMBER_DIRECTORY_SELECTION =
  "user_id,email,full_name,phone,is_admin,approved,notify_email,notify_sms,sms_opted_in_at,created_at,updated_at";
const MEMBERS_PORTAL_URL = buildSiteUrl("/portal");

function coerceMemberIsAdmin(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === null || value === undefined || value === 0) return false;
  const s = String(value).toLowerCase();
  return s === "t" || s === "true" || s === "1";
}
const BROADCAST_FUNCTION = "member-broadcast";
const ORDER_NOTIFY_FUNCTION = "order-notify";
const INVITE_FUNCTION = "member-invite-links";
const CHAT_TABLE = "member_chat_messages";
const PRODUCT_TABLE = "products";
const ORDERS_TABLE = "orders";
const MERCH_IMAGE_BUCKET = "merch-images";
const MERCH_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const MERCH_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const CHAT_LIMIT = 60;
const CHAT_REFRESH_MS = 15000;
const ORDER_STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
];
const ADMIN_LOCKED_MESSAGE =
  "Admin tools are locked for this account. If this should be the BLFSC admin login, sign out, refresh the portal, and sign back in so the latest permissions load.";

const state = {
  session: null,
  products: [],
  adminProducts: [],
  cart: [],
  chatMessages: [],
  chatAvailable: true,
  profile: null,
  profileAvailable: false,
  broadcasts: [],
  broadcastsAvailable: false,
  siteContentAvailable: false,
  merchAdminAvailable: false,
  memberDirectory: [],
  memberDirectoryAvailable: false,
  inviteResults: [],
  inviteToolChecked: false,
  inviteToolHealthy: false,
  activePane: "shop",
  activeCategory: "all",
  memberOrders: [],
  memberOrdersAvailable: false,
  adminOrders: [],
  adminOrdersAvailable: false,
};

const els = {
  authScreen: document.getElementById("auth-screen"),
  memberApp: document.getElementById("member-app"),
  authMessage: document.getElementById("auth-message"),
  productGrid: document.getElementById("product-grid"),
  productsLoading: document.getElementById("products-loading"),
  productsEmpty: document.getElementById("products-empty"),
  shopSummary: document.getElementById("shop-summary"),
  shopCategoryTabs: document.getElementById("shop-category-tabs"),
  cartDrawer: document.getElementById("cart-drawer"),
  cartOverlay: document.getElementById("cart-overlay"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  cartTotalSummary: document.getElementById("cart-total-summary"),
  cartBadge: document.getElementById("cart-badge"),
  cartCountInline: document.getElementById("cart-count-inline"),
  productsCount: document.getElementById("products-count"),
  memberEmailDisplay: document.getElementById("member-email-display"),
  passwordUsername: document.getElementById("password-username"),
  chatStatus: document.getElementById("chat-status"),
  chatEmpty: document.getElementById("chat-empty"),
  chatList: document.getElementById("chat-list"),
  chatForm: document.getElementById("chat-form"),
  chatDisplayName: document.getElementById("chat-display-name"),
  chatMessage: document.getElementById("chat-message"),
  chatSendBtn: document.getElementById("chat-send-btn"),
  chatRefreshBtn: document.getElementById("chat-refresh-btn"),
  toast: document.getElementById("toast"),
  profileForm: document.getElementById("member-profile-form"),
  profileStatus: document.getElementById("profile-status"),
  profileMeta: document.getElementById("profile-meta"),
  profileFullName: document.getElementById("profile-full-name"),
  profilePhone: document.getElementById("profile-phone"),
  profileEmail: document.getElementById("profile-email"),
  profileNotifyEmail: document.getElementById("profile-notify-email"),
  profileNotifySms: document.getElementById("profile-notify-sms"),
  saveProfileBtn: document.getElementById("save-profile-btn"),
  adminTab: document.getElementById("admin-tab"),
  adminAccessBanner: document.getElementById("admin-access-banner"),
  adminDashboardMetrics: document.getElementById("admin-dashboard-metrics"),
  adminDashboardGrid: document.getElementById("admin-dashboard-grid"),
  adminDashboardNext: document.getElementById("admin-dashboard-next"),
  memberDirectorySearch: document.getElementById("member-directory-search"),
  memberDirectoryFilter: document.getElementById("member-directory-filter"),
  refreshMemberDirectoryBtn: document.getElementById("refresh-member-directory-btn"),
  memberDirectoryStatus: document.getElementById("member-directory-status"),
  memberDirectorySummary: document.getElementById("member-directory-summary"),
  memberDirectoryEmpty: document.getElementById("member-directory-empty"),
  memberDirectoryList: document.getElementById("member-directory-list"),
  merchAdminForm: document.getElementById("merch-admin-form"),
  merchAdminId: document.getElementById("merch-admin-id"),
  merchAdminName: document.getElementById("merch-admin-name"),
  merchAdminCategory: document.getElementById("merch-admin-category"),
  merchAdminPrice: document.getElementById("merch-admin-price"),
  merchAdminImageUrl: document.getElementById("merch-admin-image-url"),
  merchAdminDropzone: document.getElementById("merch-admin-dropzone"),
  merchAdminImageFileName: document.getElementById("merch-admin-image-file-name"),
  merchAdminImageFile: document.getElementById("merch-admin-image-file"),
  merchAdminPreview: document.getElementById("merch-admin-preview"),
  merchAdminPreviewEmpty: document.getElementById("merch-admin-preview-empty"),
  merchAdminDescription: document.getElementById("merch-admin-description"),
  merchAdminHasSizes: document.getElementById("merch-admin-has-sizes"),
  merchAdminActive: document.getElementById("merch-admin-active"),
  saveMerchBtn: document.getElementById("save-merch-btn"),
  clearMerchImageBtn: document.getElementById("clear-merch-image-btn"),
  resetMerchFormBtn: document.getElementById("reset-merch-form-btn"),
  merchAdminStatus: document.getElementById("merch-admin-status"),
  merchAdminSummary: document.getElementById("merch-admin-summary"),
  merchAdminEmpty: document.getElementById("merch-admin-empty"),
  merchAdminList: document.getElementById("merch-admin-list"),
  adminAccessNote: document.getElementById("admin-access-note"),
  broadcastForm: document.getElementById("member-broadcast-form"),
  broadcastSubject: document.getElementById("broadcast-subject"),
  broadcastMessage: document.getElementById("broadcast-message"),
  broadcastAudience: document.getElementById("broadcast-audience"),
  broadcastDryRun: document.getElementById("broadcast-dry-run"),
  broadcastEmail: document.getElementById("broadcast-email"),
  broadcastSms: document.getElementById("broadcast-sms"),
  sendBroadcastBtn: document.getElementById("send-broadcast-btn"),
  broadcastStatus: document.getElementById("broadcast-status"),
  broadcastMetrics: document.getElementById("broadcast-metrics"),
  broadcastHistoryEmpty: document.getElementById("broadcast-history-empty"),
  broadcastHistoryList: document.getElementById("broadcast-history-list"),
  siteContentForm: document.getElementById("site-content-form"),
  siteContentStatus: document.getElementById("site-content-status"),
  siteAnnouncementEnabled: document.getElementById("site-announcement-enabled"),
  siteAnnouncementTitle: document.getElementById("site-announcement-title"),
  siteAnnouncementMessage: document.getElementById("site-announcement-message"),
  siteAnnouncementLinkLabel: document.getElementById("site-announcement-link-label"),
  siteAnnouncementLinkHref: document.getElementById("site-announcement-link-href"),
  siteHeroTitle: document.getElementById("site-hero-title"),
  siteHeroDescription: document.getElementById("site-hero-description"),
  siteHeroNoticeTitle: document.getElementById("site-hero-notice-title"),
  siteHeroNoticeCopy: document.getElementById("site-hero-notice-copy"),
  siteStoryTitle: document.getElementById("site-story-title"),
  siteStoryParagraphOne: document.getElementById("site-story-paragraph-one"),
  siteStoryParagraphTwo: document.getElementById("site-story-paragraph-two"),
  siteContactEmail: document.getElementById("site-contact-email"),
  siteContactPhone: document.getElementById("site-contact-phone"),
  siteInstagramUrl: document.getElementById("site-instagram-url"),
  siteFacebookUrl: document.getElementById("site-facebook-url"),
  siteTiktokUrl: document.getElementById("site-tiktok-url"),
  siteFooterTitle: document.getElementById("site-footer-title"),
  siteFooterCopy: document.getElementById("site-footer-copy"),
  siteFooterNote: document.getElementById("site-footer-note"),
  siteAdvancedJson: document.getElementById("site-advanced-json"),
  inviteForm: document.getElementById("member-invite-form"),
  inviteEmails: document.getElementById("invite-emails"),
  invitePhones: document.getElementById("invite-phones"),
  inviteRedirect: document.getElementById("invite-redirect"),
  generateInviteLinksBtn: document.getElementById("generate-invite-links-btn"),
  downloadInviteLinksBtn: document.getElementById("download-invite-links-btn"),
  inviteLinksStatus: document.getElementById("invite-links-status"),
  inviteResultsEmpty: document.getElementById("invite-results-empty"),
  inviteResultsList: document.getElementById("invite-results-list"),
  refreshMemberOrdersBtn: document.getElementById("refresh-member-orders-btn"),
  memberOrdersList: document.getElementById("member-orders-list"),
  memberOrdersEmpty: document.getElementById("member-orders-empty"),
  refreshAdminOrdersBtn: document.getElementById("refresh-admin-orders-btn"),
  adminOrdersList: document.getElementById("admin-orders-list"),
  adminOrdersEmpty: document.getElementById("admin-orders-empty"),
  adminOrdersStatus: document.getElementById("admin-orders-status"),
};

let toastTimer = 0;
let chatPollTimer = 0;
let chatFetchInFlight = false;
let merchPreviewObjectUrl = "";
let merchPendingFile = null;
let adminJumpHighlightTimer = 0;
let posthogClient = window.posthog || null;
let posthogInitialized = false;

function initPosthogClient() {
  if (!posthogClient || !POSTHOG_KEY || posthogInitialized) return;
  posthogClient.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    persistence: "localStorage+cookie",
  });
  posthogInitialized = true;
}

function loadPosthogClient() {
  if (!POSTHOG_KEY) return;
  if (posthogClient) {
    initPosthogClient();
    return;
  }
  if (document.querySelector('script[data-posthog-loader="portal"]')) return;
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/posthog-js@1.363.5/dist/array.full.no-external.js";
  script.async = true;
  script.dataset.posthogLoader = "portal";
  script.addEventListener("load", () => {
    posthogClient = window.posthog || null;
    initPosthogClient();
  });
  document.head.append(script);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeId(value) {
  return (
    String(value ?? "item")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function productFieldId(product) {
  return `size-${safeId(product.id ?? product.name)}`;
}

function deriveDisplayName(email = "") {
  const local = String(email).split("@")[0] || "Member";
  return (
    local
      .replace(/[\W_]+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase()) || "Member"
  );
}

function formatDateTime(value, fallback = "Just now") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getDisplayNameKey() {
  return `blfsc_chat_name_${state.session?.user?.id || "guest"}`;
}

function saveDisplayName(value) {
  localStorage.setItem(getDisplayNameKey(), value);
}

function loadDisplayName() {
  return (
    localStorage.getItem(getDisplayNameKey()) ||
    deriveDisplayName(state.profile?.full_name || state.session?.user?.email || "")
  );
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `portal-toast${isError ? " is-error" : ""}`;
  els.toast.classList.remove("hidden");
  toastTimer = window.setTimeout(() => els.toast.classList.add("hidden"), 3200);
}

function track(event, properties = {}) {
  if (!posthogClient || !POSTHOG_KEY) return;
  posthogClient.capture(event, properties);
}

function showAuthMessage(message, isError = false) {
  els.authMessage.textContent = message;
  els.authMessage.className = `portal-alert${isError ? " is-error" : ""}`;
  els.authMessage.classList.remove("hidden");
}

function clearAuthMessage() {
  els.authMessage.textContent = "";
  els.authMessage.className = "portal-alert hidden";
}

function setChatStatus(message, isError = false) {
  els.chatStatus.textContent = message;
  els.chatStatus.className = `portal-chat-status${isError ? " is-error" : ""}`;
}

function setProfileStatus(message, isError = false) {
  els.profileStatus.textContent = String(message || "");
  els.profileStatus.className = `profile-status${isError ? " is-error" : ""}`;
}

function setBroadcastStatus(message, isError = false) {
  els.broadcastStatus.textContent = String(message || "");
  els.broadcastStatus.className = `broadcast-status${isError ? " is-error" : ""}`;
}

function setInviteStatus(message, isError = false) {
  els.inviteLinksStatus.textContent = String(message || "");
  els.inviteLinksStatus.className = `broadcast-status${isError ? " is-error" : ""}`;
}

function setSiteContentStatus(message, isError = false) {
  els.siteContentStatus.textContent = String(message || "");
  els.siteContentStatus.className = `broadcast-status${isError ? " is-error" : ""}`;
}

function setAdminAccessBanner(message = "") {
  const text = String(message || "").trim();
  if (!text) {
    els.adminAccessBanner.textContent = "";
    els.adminAccessBanner.classList.add("hidden");
    return;
  }
  els.adminAccessBanner.textContent = text;
  els.adminAccessBanner.classList.remove("hidden");
}

function setMerchAdminStatus(message, isError = false) {
  els.merchAdminStatus.textContent = String(message || "");
  els.merchAdminStatus.className = `broadcast-status${isError ? " is-error" : ""}`;
}

function setMemberDirectoryStatus(message, isError = false) {
  els.memberDirectoryStatus.textContent = String(message || "");
  els.memberDirectoryStatus.className = `broadcast-status${isError ? " is-error" : ""}`;
}

function setChatComposerEnabled(enabled) {
  els.chatDisplayName.disabled = !enabled;
  els.chatMessage.disabled = !enabled;
  els.chatSendBtn.disabled = !enabled;
}

function setProfileFormEnabled(enabled) {
  els.profileFullName.disabled = !enabled;
  els.profilePhone.disabled = !enabled;
  els.profileNotifyEmail.disabled = !enabled;
  els.profileNotifySms.disabled = !enabled;
  els.saveProfileBtn.disabled = !enabled;
}

function setBroadcastFormEnabled(enabled) {
  els.broadcastSubject.disabled = !enabled;
  els.broadcastMessage.disabled = !enabled;
  els.broadcastAudience.disabled = !enabled;
  els.broadcastDryRun.disabled = !enabled;
  els.broadcastEmail.disabled = !enabled;
  els.broadcastSms.disabled = !enabled;
  els.sendBroadcastBtn.disabled = !enabled;
}

function setInviteFormEnabled(enabled) {
  els.inviteEmails.disabled = !enabled;
  if (els.invitePhones) {
    els.invitePhones.disabled = !enabled;
  }
  els.inviteRedirect.disabled = !enabled;
  els.generateInviteLinksBtn.disabled = !enabled;
  els.downloadInviteLinksBtn.disabled = !enabled || !state.inviteResults.length;
}

function setMemberDirectoryEnabled(enabled) {
  [els.memberDirectorySearch, els.memberDirectoryFilter, els.refreshMemberDirectoryBtn].forEach(
    (field) => {
      if (field) field.disabled = !enabled;
    },
  );
}

function setSiteContentFormEnabled(enabled) {
  [
    els.siteHeroTitle,
    els.siteHeroDescription,
    els.siteHeroNoticeTitle,
    els.siteHeroNoticeCopy,
    els.siteAnnouncementEnabled,
    els.siteAnnouncementTitle,
    els.siteAnnouncementMessage,
    els.siteAnnouncementLinkLabel,
    els.siteAnnouncementLinkHref,
    els.siteStoryTitle,
    els.siteStoryParagraphOne,
    els.siteStoryParagraphTwo,
    els.siteContactEmail,
    els.siteContactPhone,
    els.siteInstagramUrl,
    els.siteFacebookUrl,
    els.siteTiktokUrl,
    els.siteFooterTitle,
    els.siteFooterCopy,
    els.siteFooterNote,
    els.siteAdvancedJson,
    document.getElementById("save-site-content-btn"),
    document.getElementById("reset-site-content-btn"),
    document.getElementById("copy-website-link-btn"),
  ].forEach((field) => {
    if (field) field.disabled = !enabled;
  });
}

function setMerchAdminEnabled(enabled) {
  [
    els.merchAdminName,
    els.merchAdminCategory,
    els.merchAdminPrice,
    els.merchAdminImageUrl,
    els.merchAdminImageFile,
    els.merchAdminDescription,
    els.merchAdminHasSizes,
    els.merchAdminActive,
    els.saveMerchBtn,
    els.clearMerchImageBtn,
    els.resetMerchFormBtn,
  ].forEach((field) => {
    if (field) field.disabled = !enabled;
  });
  if (els.merchAdminDropzone) {
    els.merchAdminDropzone.classList.toggle("is-disabled", !enabled);
    els.merchAdminDropzone.setAttribute("aria-disabled", enabled ? "false" : "true");
  }
}

function revokeMerchPreviewUrl() {
  if (merchPreviewObjectUrl) {
    URL.revokeObjectURL(merchPreviewObjectUrl);
    merchPreviewObjectUrl = "";
  }
}

function setMerchImagePreview(
  url,
  emptyMessage = "Pick an image to preview it here. If you upload a file, it will be stored automatically when you save the merch item.",
) {
  revokeMerchPreviewUrl();
  if (url) {
    els.merchAdminPreview.src = url;
    els.merchAdminPreview.classList.remove("hidden");
    els.merchAdminPreviewEmpty.classList.add("hidden");
    return;
  }
  els.merchAdminPreview.removeAttribute("src");
  els.merchAdminPreview.classList.add("hidden");
  els.merchAdminPreviewEmpty.textContent = emptyMessage;
  els.merchAdminPreviewEmpty.classList.remove("hidden");
}

function getSelectedMerchImageFile() {
  return els.merchAdminImageFile?.files?.[0] || merchPendingFile || null;
}

function syncMerchPreviewFromInputs() {
  const file = getSelectedMerchImageFile();
  if (file) {
    revokeMerchPreviewUrl();
    merchPreviewObjectUrl = URL.createObjectURL(file);
    els.merchAdminPreview.src = merchPreviewObjectUrl;
    els.merchAdminPreview.classList.remove("hidden");
    els.merchAdminPreviewEmpty.classList.add("hidden");
    if (els.merchAdminImageFileName) {
      els.merchAdminImageFileName.textContent = file.name;
    }
    return;
  }
  if (els.merchAdminImageFileName) {
    els.merchAdminImageFileName.textContent = "Drop image here or tap to choose";
  }
  setMerchImagePreview(els.merchAdminImageUrl.value.trim() || "");
}

function setMerchDropActive(active) {
  els.merchAdminDropzone?.classList.toggle("is-active", active);
}

function setMerchPendingFile(file, { syncInput = true } = {}) {
  merchPendingFile = file || null;
  if (!els.merchAdminImageFile) {
    syncMerchPreviewFromInputs();
    return;
  }
  if (syncInput) {
    try {
      const dataTransfer = new DataTransfer();
      if (file) {
        dataTransfer.items.add(file);
      }
      els.merchAdminImageFile.files = dataTransfer.files;
      merchPendingFile = null;
    } catch {
      // Keep the dropped file in memory if the browser does not let us assign files.
    }
  }
  syncMerchPreviewFromInputs();
}

function pickMerchImage() {
  if (!state.profile?.is_admin || els.merchAdminImageFile?.disabled) return;
  els.merchAdminImageFile?.click();
}

function handleMerchDropzoneKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  pickMerchImage();
}

function handleMerchDropzoneHover(event) {
  event.preventDefault();
  if (!state.profile?.is_admin || els.merchAdminImageFile?.disabled) return;
  setMerchDropActive(true);
}

function handleMerchDropzoneLeave(event) {
  if (!els.merchAdminDropzone?.contains(event.relatedTarget)) {
    setMerchDropActive(false);
  }
}

function handleMerchDropzoneDrop(event) {
  event.preventDefault();
  setMerchDropActive(false);
  if (!state.profile?.is_admin || els.merchAdminImageFile?.disabled) return;

  const files = Array.from(event.dataTransfer?.files || []);
  const file = files.find((item) => item.type?.startsWith("image/"));
  if (!file) {
    showToast("Drop an image file to use it for merch.", true);
    return;
  }

  setMerchPendingFile(file);
}

function providerLabel(value, type) {
  const normalized = String(value || "").toLowerCase();
  if (type === "email") {
    if (normalized === "resend") return "Resend";
    if (normalized === "smtp") return "SMTP";
    return "not configured";
  }
  if (normalized === "twilio") return "Twilio";
  return "not configured";
}

function deliveryProviderSummary(payload = {}) {
  return ` Email: ${providerLabel(payload.email_provider, "email")}. SMS: ${providerLabel(payload.sms_provider, "sms")}.`;
}

function money(value) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    Number(value || 0),
  );
}

function orderItemsPayloadSummary(items) {
  if (!items || typeof items !== "object") return "";
  const lines = items.line_items;
  if (!Array.isArray(lines) || !lines.length) return "";
  return lines
    .map((li) => {
      const name = li.name || "Item";
      const size = li.size ? ` (${li.size})` : "";
      return `${li.qty}× ${name}${size}`;
    })
    .join(", ");
}

function formatOrderItemsTotal(items) {
  if (!items || typeof items !== "object") return "—";
  const raw = items.total;
  if (raw == null || Number.isNaN(Number(raw))) return "—";
  return money(Number(raw));
}

function orderStatusSelectOptions(currentRaw) {
  const current = String(currentRaw || "submitted").trim();
  const known = new Set(ORDER_STATUS_OPTIONS.map((o) => o.value));
  const options = ORDER_STATUS_OPTIONS.map((o) => ({ ...o }));
  if (current && !known.has(current)) {
    options.unshift({ value: current, label: current.replaceAll("_", " ") });
  }
  return options;
}

function resetMemberOrdersUI() {
  state.memberOrders = [];
  state.memberOrdersAvailable = false;
  if (els.memberOrdersList) {
    els.memberOrdersList.innerHTML = "";
    els.memberOrdersList.classList.add("hidden");
  }
  if (els.memberOrdersEmpty) {
    els.memberOrdersEmpty.textContent = "Your submitted orders will appear here after you sign in.";
    els.memberOrdersEmpty.classList.remove("hidden");
  }
}

function renderMemberOrders() {
  if (!els.memberOrdersList || !els.memberOrdersEmpty) return;
  const rows = state.memberOrders;
  if (!rows.length) {
    els.memberOrdersList.innerHTML = "";
    els.memberOrdersList.classList.add("hidden");
    els.memberOrdersEmpty.textContent =
      "No orders yet. Add items to your cart and submit when you are ready.";
    els.memberOrdersEmpty.classList.remove("hidden");
    return;
  }
  els.memberOrdersEmpty.classList.add("hidden");
  els.memberOrdersList.classList.remove("hidden");
  els.memberOrdersList.innerHTML = rows
    .map((row) => {
      const items = row.items || {};
      const statusLabel = String(row.status || "submitted").replaceAll("_", " ");
      const when = formatDateTime(row.created_at, "—");
      return `
      <article class="broadcast-item portal-order-item">
        <div class="broadcast-item-head">
          <div>
            <strong>Order #${row.id}</strong>
            <div class="portal-card-copy portal-card-copy-tight">${escapeHtml(when)} · ${escapeHtml(statusLabel)}</div>
          </div>
          <span class="broadcast-chip">${escapeHtml(formatOrderItemsTotal(items))}</span>
        </div>
        <p class="portal-card-copy portal-card-copy-tight">${escapeHtml(orderItemsPayloadSummary(items) || "Details on file.")}</p>
      </article>`;
    })
    .join("");
}

async function fetchMemberOrders() {
  if (!state.session || !els.memberOrdersList || !els.memberOrdersEmpty) return;
  const { data, error } = await db
    .from(ORDERS_TABLE)
    .select("id,status,items,created_at")
    .eq("user_id", state.session.user.id)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) {
    console.error(error);
    state.memberOrdersAvailable = false;
    state.memberOrders = [];
    els.memberOrdersEmpty.textContent =
      "Could not load your orders. Check your connection and try refresh.";
    els.memberOrdersEmpty.classList.remove("hidden");
    els.memberOrdersList.classList.add("hidden");
    return;
  }
  state.memberOrdersAvailable = true;
  state.memberOrders = data || [];
  renderMemberOrders();
}

function resetAdminOrdersState() {
  state.adminOrders = [];
  state.adminOrdersAvailable = false;
  if (els.adminOrdersList) {
    els.adminOrdersList.innerHTML = "";
    els.adminOrdersList.classList.add("hidden");
  }
  if (els.adminOrdersEmpty) {
    els.adminOrdersEmpty.textContent = "Orders from members will appear here.";
    els.adminOrdersEmpty.classList.remove("hidden");
  }
  if (els.adminOrdersStatus) {
    els.adminOrdersStatus.textContent = "";
    els.adminOrdersStatus.classList.add("hidden");
  }
}

function renderAdminOrders() {
  if (!els.adminOrdersList || !els.adminOrdersEmpty) return;
  const rows = state.adminOrders;
  if (!rows.length) {
    els.adminOrdersList.innerHTML = "";
    els.adminOrdersList.classList.add("hidden");
    els.adminOrdersEmpty.textContent = "No member orders yet for this drop.";
    els.adminOrdersEmpty.classList.remove("hidden");
    return;
  }
  els.adminOrdersEmpty.classList.add("hidden");
  els.adminOrdersList.classList.remove("hidden");
  els.adminOrdersList.innerHTML = rows
    .map((row) => {
      const items = row.items || {};
      const memberLabel =
        items.member_email ||
        items.customer_name ||
        `Member ${String(row.user_id || "").slice(0, 8)}…`;
      const currentStatus = String(row.status || "submitted");
      const opts = orderStatusSelectOptions(currentStatus)
        .map(
          (o) =>
            `<option value="${escapeHtml(o.value)}"${o.value === currentStatus ? " selected" : ""}>${escapeHtml(o.label)}</option>`,
        )
        .join("");
      const notes = items.notes ? escapeHtml(String(items.notes)) : "";
      const customerRegion = items.state ? escapeHtml(String(items.state)) : "";
      return `
      <article class="broadcast-item portal-order-item" data-order-id="${row.id}">
        <div class="broadcast-item-head">
          <div>
            <strong>Order #${row.id}</strong>
            <div class="portal-card-copy portal-card-copy-tight">${escapeHtml(formatDateTime(row.created_at, "—"))} · ${escapeHtml(memberLabel)}</div>
          </div>
        </div>
        <p class="portal-card-copy portal-card-copy-tight"><strong>${escapeHtml(formatOrderItemsTotal(items))}</strong>${customerRegion ? ` · ${customerRegion}` : ""}</p>
        <p class="portal-card-copy portal-card-copy-tight">${escapeHtml(orderItemsPayloadSummary(items) || "No line items.")}</p>
        ${notes ? `<p class="portal-card-copy portal-card-copy-tight">${notes}</p>` : ""}
        <label class="field">
          <span class="field-label">Fulfillment status</span>
          <select class="input admin-order-status" aria-label="Fulfillment status for order ${row.id}">${opts}</select>
        </label>
      </article>`;
    })
    .join("");

  els.adminOrdersList.querySelectorAll(".admin-order-status").forEach((select) => {
    select.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      const article = target.closest("[data-order-id]");
      const idRaw = article?.getAttribute("data-order-id");
      if (!idRaw) return;
      await updateAdminOrderStatus(Number(idRaw), target.value);
    });
  });
}

async function updateAdminOrderStatus(orderId, status) {
  if (!state.session || !state.profile?.is_admin) return;
  const next = String(status || "").trim();
  if (!next) return;
  const { error } = await db.from(ORDERS_TABLE).update({ status: next }).eq("id", orderId);
  if (error) {
    console.error(error);
    showToast(error.message || "Could not update order status.", true);
    await fetchAdminOrders();
    return;
  }
  track("portal_admin_order_status", { order_id: orderId, status: next });
  showToast(`Order #${orderId} marked ${next.replaceAll("_", " ")}.`);
  await fetchAdminOrders();
}

async function fetchAdminOrders() {
  if (!state.session || !state.profile?.is_admin) return;
  if (!els.adminOrdersList || !els.adminOrdersEmpty) return;
  if (els.adminOrdersStatus) {
    els.adminOrdersStatus.classList.add("hidden");
  }
  const { data, error } = await db
    .from(ORDERS_TABLE)
    .select("id,user_id,status,items,created_at")
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) {
    console.error(error);
    state.adminOrders = [];
    state.adminOrdersAvailable = false;
    els.adminOrdersEmpty.textContent =
      "Orders could not load. Deploy orders RLS (see supabase migrations) and try refresh.";
    els.adminOrdersEmpty.classList.remove("hidden");
    els.adminOrdersList.classList.add("hidden");
    if (els.adminOrdersStatus) {
      els.adminOrdersStatus.textContent = error.message || "";
      els.adminOrdersStatus.classList.remove("hidden");
    }
    renderAdminDashboard();
    return;
  }
  state.adminOrdersAvailable = true;
  state.adminOrders = data || [];
  renderAdminOrders();
  renderAdminDashboard();
}

function getCartKey() {
  return `blfsc_cart_${state.session?.user?.id || "guest"}`;
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0);
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateSummary() {
  const total = getCartTotal();
  const count = cartCount();
  els.cartTotal.textContent = money(total);
  els.cartTotalSummary.textContent = money(total);
  els.cartCountInline.textContent = String(count);
  els.productsCount.textContent = String(state.products.length);
  els.cartBadge.textContent = String(count);
  els.cartBadge.classList.toggle("hidden", count === 0);
}

function saveCart() {
  localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
}

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getCartKey()) || "[]");
    state.cart = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.cart = [];
  }
  renderCart();
}

function syncPasswordUsername(value) {
  if (els.passwordUsername) {
    els.passwordUsername.value = value || "";
  }
}

function normalizeProduct(product) {
  return {
    ...buildNormalizedPortalProduct(product, PORTAL_LOGO_URL),
    fieldId: productFieldId(product),
  };
}

function getVisibleCategories() {
  const set = new Set(state.products.map((product) => product.displayCategory).filter(Boolean));
  const ordered = ["shirts", "outerwear", "pants", "accessories", "other"].filter((category) =>
    set.has(category),
  );
  return ["all", ...ordered];
}

function filteredProducts() {
  return state.activeCategory === "all"
    ? state.products
    : state.products.filter((product) => product.displayCategory === state.activeCategory);
}

function renderShopCategoryTabs() {
  const categories = getVisibleCategories();
  if (!categories.includes(state.activeCategory)) {
    state.activeCategory = "all";
  }

  els.shopCategoryTabs.innerHTML = categories
    .map(
      (category) => `
    <button class="shop-category-tab${category === state.activeCategory ? " is-active" : ""}" type="button" data-shop-category="${escapeHtml(category)}">
      ${escapeHtml(getCategoryLabel(category))}
    </button>
  `,
    )
    .join("");

  els.shopCategoryTabs.querySelectorAll("[data-shop-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.shopCategory || "all";
      renderProducts();
      initReveal();
    });
  });
}

function renderShopSummary() {
  const count = filteredProducts().length;
  const detail =
    state.activeCategory === "all"
      ? `${state.products.length} live product${state.products.length === 1 ? "" : "s"} available across the current drop.`
      : `${count} ${getCategoryLabel(state.activeCategory).toLowerCase()} item${count === 1 ? "" : "s"} showing in this category.`;
  els.shopSummary.innerHTML = `<strong>${escapeHtml(getCategoryLabel(state.activeCategory))}</strong><br>${escapeHtml(detail)}`;
}

function renderProducts() {
  els.productsLoading.classList.add("hidden");
  els.productGrid.innerHTML = "";
  renderShopCategoryTabs();
  renderShopSummary();

  if (!state.products.length) {
    els.productsEmpty.textContent = "No merch is live right now. Check back after the next drop.";
    els.productsEmpty.classList.remove("hidden");
    els.productGrid.classList.add("hidden");
    updateSummary();
    return;
  }

  const visibleProducts = filteredProducts();
  if (!visibleProducts.length) {
    els.productsEmpty.textContent = "No live merch matches this category right now.";
    els.productsEmpty.classList.remove("hidden");
    els.productGrid.classList.add("hidden");
    updateSummary();
    return;
  }

  els.productsEmpty.classList.add("hidden");
  els.productGrid.classList.remove("hidden");

  visibleProducts.forEach((product) => {
    const sizesHtml = product.hasSizes
      ? `
      <label class="field field-compact" for="${product.fieldId}">
        <span class="field-label">Size</span>
        <select id="${product.fieldId}" class="input">
          <option value="S">Small (S)</option>
          <option value="M">Medium (M)</option>
          <option value="L" selected>Large (L)</option>
          <option value="XL">X-Large (XL)</option>
          <option value="XXL">2X-Large (XXL)</option>
          <option value="3XL">3X-Large (3XL)</option>
          <option value="4XL">4X-Large (4XL)</option>
          <option value="5XL">5X-Large (5XL)</option>
        </select>
      </label>
    `
      : "";

    const card = document.createElement("article");
    card.className = "portal-product-card portal-surface";
    card.innerHTML = `
      <img src="${escapeHtml(product.displayImage)}" alt="${escapeHtml(product.name || "Club item")}" class="portal-product-image" onerror="this.onerror=null;this.src='${PORTAL_LOGO_URL}'">
      <div class="portal-product-body">
        <div class="portal-product-meta">
          <div>
            <div class="field-label">${escapeHtml(getCategoryLabel(product.displayCategory))}</div>
            <h3 class="brand-font portal-product-title">${escapeHtml(product.name || "Club item")}</h3>
          </div>
          <div class="portal-price">${money(product.price)}</div>
        </div>
        <p class="portal-product-description">${escapeHtml(product.displayDescription || "Official club item.")}</p>
        <div class="portal-product-actions">
          ${sizesHtml}
          <button class="button button-primary button-full add-btn" type="button">Add to cart</button>
        </div>
      </div>
    `;
    card.querySelector(".add-btn").addEventListener("click", () => addToCart(product));
    els.productGrid.appendChild(card);
  });

  updateSummary();
}

function renderCart() {
  els.cartItems.innerHTML = "";
  updateSummary();
  if (!state.cart.length) {
    const empty = document.createElement("div");
    empty.className = "portal-cart-empty";
    empty.textContent = "Your cart is empty.";
    els.cartItems.appendChild(empty);
    return;
  }

  state.cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "portal-cart-item";
    row.innerHTML = `
      <div class="portal-cart-row">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="portal-cart-image" onerror="this.onerror=null;this.src='${PORTAL_LOGO_URL}'">
        <div class="portal-cart-meta">
          <div class="portal-cart-headline">
            <div>
              <div class="portal-item-name">${escapeHtml(item.name)}</div>
              ${item.size ? `<div class="portal-item-size">Size: ${escapeHtml(item.size)}</div>` : ""}
            </div>
            <div class="portal-item-price">${money(item.price * item.qty)}</div>
          </div>
          <div class="portal-qty-controls">
            <button class="button button-secondary button-small minus-btn" type="button" aria-label="Decrease quantity">-</button>
            <div class="portal-qty-value">${item.qty}</div>
            <button class="button button-secondary button-small plus-btn" type="button" aria-label="Increase quantity">+</button>
            <button class="button button-danger button-small remove-btn" type="button">Remove</button>
          </div>
        </div>
      </div>
    `;
    row.querySelector(".minus-btn").addEventListener("click", () => updateQty(index, item.qty - 1));
    row.querySelector(".plus-btn").addEventListener("click", () => updateQty(index, item.qty + 1));
    row.querySelector(".remove-btn").addEventListener("click", () => updateQty(index, 0));
    els.cartItems.appendChild(row);
  });
}

function renderChatMessages() {
  els.chatList.innerHTML = "";
  if (!state.chatAvailable) {
    els.chatEmpty.classList.add("hidden");
    return;
  }
  if (!state.chatMessages.length) {
    els.chatEmpty.classList.remove("hidden");
    return;
  }

  els.chatEmpty.classList.add("hidden");
  state.chatMessages.forEach((message) => {
    const own = message.user_id === state.session?.user?.id;
    const item = document.createElement("article");
    item.className = `portal-chat-item${own ? " is-own" : ""}`;
    item.innerHTML = `
      <div class="portal-chat-meta">
        <div>
          <div class="portal-chat-name">${escapeHtml(message.display_name || "Member")}</div>
          <div class="portal-chat-email">${escapeHtml(message.user_email || "Member account")}</div>
        </div>
        <div class="portal-chat-time">${escapeHtml(formatDateTime(message.created_at))}</div>
      </div>
      <p class="portal-chat-message">${escapeHtml(message.message || "")}</p>
      ${own ? '<div class="portal-chat-actions"><span class="portal-card-copy portal-card-copy-tight">Your message</span><button class="button button-secondary button-small chat-delete-btn" type="button">Delete</button></div>' : ""}
    `;
    item
      .querySelector(".chat-delete-btn")
      ?.addEventListener("click", () => deleteChatMessage(message.id));
    els.chatList.appendChild(item);
  });
}

function cloneMerchAdminDefaults() {
  return {
    id: "",
    name: "",
    category: "shirts",
    price: "",
    image_url: "",
    description: "",
    hasSizes: false,
    active: true,
  };
}

function merchFileExtension(file) {
  const fromName = String(file?.name || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (fromName && fromName !== String(file?.name || "").toLowerCase())
    return fromName.replace(/[^a-z0-9]+/g, "") || "jpg";
  const fromType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return fromType[file?.type] || "jpg";
}

function merchOutputMimeType(file) {
  if (file?.type === "image/png") return "image/png";
  if (file?.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

function blobToFile(blob, name, type) {
  return new File([blob], name, { type, lastModified: Date.now() });
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the selected image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not prepare the merch image for upload."));
      },
      type,
      quality,
    );
  });
}

async function prepareMerchImageFile(file) {
  const outputType = merchOutputMimeType(file);
  const extension =
    outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : "jpg";
  const image = await loadImageFromBlob(file);
  const cropSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const sourceX = Math.max(0, Math.round(((image.naturalWidth || image.width) - cropSize) / 2));
  const sourceY = Math.max(0, Math.round(((image.naturalHeight || image.height) - cropSize) / 2));
  const outputSize = Math.min(1600, cropSize);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the merch image for upload.");
  }
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, outputSize, outputSize);
  const blob = await canvasToBlob(
    canvas,
    outputType,
    outputType === "image/jpeg" ? 0.9 : undefined,
  );
  const safeName = `${safeId(String(file.name || "merch-image").replace(/\.[^.]+$/, "")) || "merch-image"}.${extension}`;
  return blobToFile(blob, safeName, outputType);
}

function merchStoragePathForFile(file) {
  const stem = safeId(String(file?.name || "merch-image").replace(/\.[^.]+$/, "")) || "merch-image";
  const extension = merchFileExtension(file);
  return `products/${state.session?.user?.id || "admin"}-${Date.now()}-${stem}.${extension}`;
}

function extractMerchStoragePath(imageUrl) {
  const value = String(imageUrl || "").trim();
  if (!value) return "";
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${MERCH_IMAGE_BUCKET}/`;
  if (value.startsWith(prefix)) {
    return decodeURIComponent(value.slice(prefix.length));
  }
  return "";
}

async function removeMerchStorageObject(path) {
  if (!path) return;
  const { error } = await db.storage.from(MERCH_IMAGE_BUCKET).remove([path]);
  if (error) {
    console.error(error);
  }
}

async function uploadMerchImage(file) {
  if (!file) return null;
  if (!MERCH_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Use a JPG, PNG, WEBP, or GIF image.");
  }
  if (file.size > MERCH_IMAGE_MAX_BYTES) {
    throw new Error("Image files must be 10 MB or smaller.");
  }

  const preparedFile = await prepareMerchImageFile(file);
  const path = merchStoragePathForFile(preparedFile);
  const { data, error } = await db.storage.from(MERCH_IMAGE_BUCKET).upload(path, preparedFile, {
    cacheControl: "3600",
    upsert: false,
    contentType: preparedFile.type,
  });
  if (error) {
    throw new Error(error.message || "Could not upload the merch image.");
  }

  const { data: publicUrlData } = db.storage.from(MERCH_IMAGE_BUCKET).getPublicUrl(data.path);
  return {
    path: data.path,
    publicUrl:
      publicUrlData?.publicUrl ||
      `${SUPABASE_URL}/storage/v1/object/public/${MERCH_IMAGE_BUCKET}/${data.path}`,
  };
}

function fillMerchAdminForm(product = cloneMerchAdminDefaults()) {
  const category =
    normalizePortalCategory(product.category || product.displayCategory || "shirts") || "shirts";
  els.merchAdminId.value = product.id ? String(product.id) : "";
  els.merchAdminName.value = product.name || "";
  els.merchAdminCategory.value = PRODUCT_CATEGORY_OPTIONS.includes(category) ? category : "other";
  els.merchAdminPrice.value =
    product.price === "" || product.price == null ? "" : String(product.price);
  els.merchAdminImageUrl.value = product.image_url || product.image || "";
  merchPendingFile = null;
  if (els.merchAdminImageFile) {
    els.merchAdminImageFile.value = "";
  }
  els.merchAdminDescription.value = product.description || product.desc || "";
  els.merchAdminHasSizes.checked = Boolean(product.hasSizes);
  els.merchAdminActive.checked = product.active !== false;
  els.saveMerchBtn.textContent = product.id ? "Save merch changes" : "Add merch item";
  setMerchDropActive(false);
  setMerchImagePreview(els.merchAdminImageUrl.value.trim() || "");
}

function clearMerchAdminForm(message) {
  fillMerchAdminForm();
  if (message) {
    setMerchAdminStatus(message);
  }
}

function readMerchAdminForm() {
  const id = Number(els.merchAdminId.value || 0);
  const name = els.merchAdminName.value.trim();
  const price = Number(els.merchAdminPrice.value);
  if (!name) {
    throw new Error("Add a merch name before saving.");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Add a valid price before saving.");
  }

  return {
    id: id > 0 ? id : null,
    name,
    category: normalizePortalCategory(els.merchAdminCategory.value) || "other",
    price: Number(price.toFixed(2)),
    image_url: normalizeSiteImagePath(els.merchAdminImageUrl.value.trim(), ""),
    description: els.merchAdminDescription.value.trim(),
    hasSizes: els.merchAdminHasSizes.checked,
    active: els.merchAdminActive.checked,
  };
}

function clearSelectedMerchImage() {
  merchPendingFile = null;
  if (els.merchAdminImageFile) {
    els.merchAdminImageFile.value = "";
  }
  setMerchDropActive(false);
  syncMerchPreviewFromInputs();
  showToast("Selected image cleared.");
}

function buildMerchPayload(product, { includeCategory = true } = {}) {
  const payload = {
    name: product.name,
    description: product.description || null,
    price: product.price,
    image_url: product.image_url || null,
    hasSizes: product.hasSizes,
    active: product.active,
  };
  if (includeCategory) {
    payload.category = product.category;
  }
  return payload;
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || "").toLowerCase();
  const needle = String(columnName || "").toLowerCase();
  return Boolean(
    needle &&
    (message.includes(`column "${needle}"`) ||
      message.includes(`'${needle}'`) ||
      message.includes(` ${needle} `)) &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      error?.code === "PGRST204"),
  );
}

function renderAdminProducts() {
  const liveCount = state.adminProducts.filter((product) => product.active !== false).length;
  const hiddenCount = state.adminProducts.length - liveCount;

  els.merchAdminSummary.innerHTML = `
    <article class="broadcast-metric"><span>Total items</span><strong>${state.adminProducts.length}</strong></article>
    <article class="broadcast-metric"><span>Live in shop</span><strong>${liveCount}</strong></article>
    <article class="broadcast-metric"><span>Hidden</span><strong>${hiddenCount}</strong></article>
  `;
  els.merchAdminSummary.classList.toggle("hidden", !state.adminProducts.length);

  if (!state.adminProducts.length) {
    els.merchAdminList.innerHTML = "";
    els.merchAdminList.classList.add("hidden");
    els.merchAdminEmpty.textContent =
      "No merch items yet. Add your first product here and it can go live straight away.";
    els.merchAdminEmpty.classList.remove("hidden");
    return;
  }

  els.merchAdminEmpty.classList.add("hidden");
  els.merchAdminList.classList.remove("hidden");
  els.merchAdminList.innerHTML = state.adminProducts
    .map(
      (product) => `
    <article class="admin-merch-item">
      <img src="${escapeHtml(product.displayImage)}" alt="${escapeHtml(product.name || "Club merch")}" class="admin-merch-image" onerror="this.onerror=null;this.src='${PORTAL_LOGO_URL}'">
      <div class="admin-merch-body">
        <div class="broadcast-item-head">
          <div>
            <strong>${escapeHtml(product.name || "Club merch")}</strong>
            <div class="invite-link-meta">${escapeHtml(formatDateTime(product.created_at, "Recently added"))}</div>
          </div>
          <span class="broadcast-chip">${escapeHtml(product.active !== false ? "Live" : "Hidden")}</span>
        </div>
        <p class="portal-card-copy portal-card-copy-tight">${escapeHtml(product.displayDescription || "No product description added yet.")}</p>
        <div class="broadcast-tags">
                <span class="broadcast-tag">${escapeHtml(getCategoryLabel(product.displayCategory))}</span>
          <span class="broadcast-tag">${escapeHtml(product.hasSizes ? "Sizes on" : "No sizes")}</span>
          <span class="broadcast-tag">${escapeHtml(money(product.price))}</span>
        </div>
        <div class="merch-admin-actions">
          <button class="button button-secondary button-small" type="button" data-merch-edit="${product.id}">Edit</button>
          <button class="button button-secondary button-small" type="button" data-merch-toggle="${product.id}">${product.active !== false ? "Hide from shop" : "Make live"}</button>
          <button class="button button-danger button-small" type="button" data-merch-delete="${product.id}">Delete</button>
        </div>
      </div>
    </article>
  `,
    )
    .join("");

  els.merchAdminList.querySelectorAll("[data-merch-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.merchEdit);
      const product = state.adminProducts.find((item) => Number(item.id) === id);
      if (!product) return;
      fillMerchAdminForm(product);
      setMerchAdminStatus(`Editing ${escapeHtml(product.name)}. Save when you are ready.`);
      setActivePane("admin");
      els.merchAdminForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  els.merchAdminList.querySelectorAll("[data-merch-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.merchToggle);
      const product = state.adminProducts.find((item) => Number(item.id) === id);
      if (!product) return;
      await toggleMerchVisibility(product);
    });
  });

  els.merchAdminList.querySelectorAll("[data-merch-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.merchDelete);
      const product = state.adminProducts.find((item) => Number(item.id) === id);
      if (!product) return;
      await deleteMerchItem(product);
    });
  });
}

function addToCart(product) {
  const size = product.hasSizes ? document.getElementById(product.fieldId)?.value || "" : "";
  const existing = state.cart.find((item) => item.id === product.id && item.size === size);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      image: product.displayImage,
      size,
      qty: 1,
    });
  }
  saveCart();
  renderCart();
  track("portal_add_to_cart", {
    product_id: product.id,
    category: product.displayCategory,
    has_size: Boolean(size),
  });
  showToast(`${product.name} added to cart.`);
}

function updateQty(index, nextQty) {
  if (nextQty <= 0) state.cart.splice(index, 1);
  else state.cart[index].qty = nextQty;
  saveCart();
  renderCart();
}

function openCart() {
  els.cartOverlay.classList.remove("hidden");
  els.cartDrawer.classList.remove("hidden");
  document.body.classList.add("cart-open");
}

function closeCart() {
  els.cartOverlay.classList.add("hidden");
  els.cartDrawer.classList.add("hidden");
  document.body.classList.remove("cart-open");
}

/** Hidden panes never intersect at init, so [data-reveal] stays opacity:0 until we open the pane. */
function revealPaneRevealNodes(paneId) {
  const root = document.getElementById(`pane-${paneId}`);
  if (!root) return;
  if (root.hasAttribute("data-reveal") && !root.classList.contains("is-visible")) {
    root.classList.add("is-visible");
  }
  root.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((node) => {
    node.classList.add("is-visible");
  });
}

function setActivePane(nextPane, updateHash = true) {
  const allowed = new Set(["shop", "account", "chat", "admin"]);
  let pane = allowed.has(nextPane) ? nextPane : "shop";
  if (pane === "admin" && !state.profile?.is_admin) pane = "shop";
  state.activePane = pane;

  document.querySelectorAll("[data-portal-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.portalTab === pane);
  });
  document.querySelectorAll(".portal-pane").forEach((section) => {
    const active = section.id === `pane-${pane}`;
    section.classList.toggle("is-active", active);
    section.classList.toggle("hidden", !active);
  });
  if (updateHash) history.replaceState(null, "", `#${pane}`);
  revealPaneRevealNodes(pane);
}

function activatePaneFromHash() {
  setActivePane(window.location.hash.replace(/^#/, "") || "shop", false);
}

function jumpToAdminSection(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!state.profile?.is_admin) {
    setAdminAccessBanner(ADMIN_LOCKED_MESSAGE);
    showToast("Admin tools are locked for this account.", true);
    return;
  }

  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  const focusTarget =
    target.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href]',
    ) || target;

  setActivePane("admin");
  document.querySelectorAll(".admin-jump-target.is-targeted").forEach((section) => {
    section.classList.remove("is-targeted");
  });
  target.classList.add("is-targeted");
  window.clearTimeout(adminJumpHighlightTimer);
  adminJumpHighlightTimer = window.setTimeout(() => {
    target.classList.remove("is-targeted");
  }, 1800);

  if (focusTarget === target && !target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }

  target.scrollIntoView({ behavior, block: "start" });
  window.setTimeout(
    () => {
      if (typeof focusTarget.focus === "function") {
        focusTarget.focus({ preventScroll: true });
      }
    },
    behavior === "smooth" ? 220 : 0,
  );
  track("portal_admin_jump", { target: targetId });
}

function toggleAdminTab(visible) {
  els.adminTab.classList.toggle("is-locked", !visible);
  els.adminTab.setAttribute("aria-disabled", visible ? "false" : "true");
  els.adminTab.title = visible ? "Open admin tools" : "Admin access required";
  if (!visible && state.activePane === "admin") setActivePane("shop");
}

function startChatPolling() {
  stopChatPolling();
  chatPollTimer = window.setInterval(() => {
    if (!state.session || document.hidden || !state.chatAvailable) return;
    fetchChatMessages({ silent: true });
  }, CHAT_REFRESH_MS);
}

function stopChatPolling() {
  if (chatPollTimer) {
    window.clearInterval(chatPollTimer);
    chatPollTimer = 0;
  }
}

function isMissingTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("schema cache")
  );
}

function cloneSiteContentDefaults() {
  return cloneSiteContent(SITE_CONTENT_DEFAULTS);
}

function normalizeSiteContentContent(payload) {
  return mergeSiteContent(payload);
}

function formatAdvancedSiteContent(content) {
  return JSON.stringify(pickSiteContentAdvanced(content), null, 2);
}

function fillSiteContentForm(payload = cloneSiteContentDefaults()) {
  const content = normalizeSiteContentContent(payload);
  els.siteAnnouncementEnabled.checked = content.announcement.enabled;
  els.siteAnnouncementTitle.value = content.announcement.title;
  els.siteAnnouncementMessage.value = content.announcement.message;
  els.siteAnnouncementLinkLabel.value = content.announcement.linkLabel;
  els.siteAnnouncementLinkHref.value = content.announcement.linkHref;
  els.siteHeroTitle.value = content.hero.title;
  els.siteHeroDescription.value = content.hero.description;
  els.siteHeroNoticeTitle.value = content.hero.noticeTitle;
  els.siteHeroNoticeCopy.value = content.hero.noticeCopy;
  els.siteStoryTitle.value = content.story.title;
  els.siteStoryParagraphOne.value = content.story.paragraphOne;
  els.siteStoryParagraphTwo.value = content.story.paragraphTwo;
  els.siteContactEmail.value = content.contact.email;
  els.siteContactPhone.value = content.contact.phone;
  els.siteInstagramUrl.value = content.contact.instagramUrl;
  els.siteFacebookUrl.value = content.contact.facebookUrl;
  els.siteTiktokUrl.value = content.contact.tiktokUrl;
  els.siteFooterTitle.value = content.footer.title;
  els.siteFooterCopy.value = content.footer.copy;
  els.siteFooterNote.value = content.footer.note;
  if (els.siteAdvancedJson) {
    els.siteAdvancedJson.value = formatAdvancedSiteContent(content);
  }
}

function readSiteContentForm() {
  let advancedPayload = {};
  const advancedText = els.siteAdvancedJson?.value?.trim() || "";
  if (advancedText) {
    try {
      advancedPayload = JSON.parse(advancedText);
    } catch {
      throw new Error("Advanced website JSON is not valid. Fix the JSON and try again.");
    }
    if (!advancedPayload || typeof advancedPayload !== "object" || Array.isArray(advancedPayload)) {
      throw new Error("Advanced website JSON must be a single JSON object.");
    }
  }

  return normalizeSiteContentContent({
    ...advancedPayload,
    announcement: {
      enabled: els.siteAnnouncementEnabled.checked,
      title: els.siteAnnouncementTitle.value,
      message: els.siteAnnouncementMessage.value,
      linkLabel: els.siteAnnouncementLinkLabel.value,
      linkHref: els.siteAnnouncementLinkHref.value,
    },
    hero: {
      title: els.siteHeroTitle.value,
      description: els.siteHeroDescription.value,
      noticeTitle: els.siteHeroNoticeTitle.value,
      noticeCopy: els.siteHeroNoticeCopy.value,
    },
    story: {
      title: els.siteStoryTitle.value,
      paragraphOne: els.siteStoryParagraphOne.value,
      paragraphTwo: els.siteStoryParagraphTwo.value,
    },
    contact: {
      email: els.siteContactEmail.value,
      phone: els.siteContactPhone.value,
      instagramUrl: els.siteInstagramUrl.value,
      facebookUrl: els.siteFacebookUrl.value,
      tiktokUrl: els.siteTiktokUrl.value,
    },
    footer: {
      title: els.siteFooterTitle.value,
      copy: els.siteFooterCopy.value,
      note: els.siteFooterNote.value,
    },
  });
}

function supabasePublicApiHost() {
  try {
    return new URL(SUPABASE_URL).hostname;
  } catch {
    return "invalid-url";
  }
}

function fillProfileForm(profile = {}) {
  els.profileFullName.value =
    profile.full_name || deriveDisplayName(state.session?.user?.email || "");
  els.profilePhone.value = profile.phone || "";
  els.profileEmail.value = profile.email || state.session?.user?.email || "";
  els.profileNotifyEmail.checked = profile.notify_email ?? true;
  els.profileNotifySms.checked = profile.notify_sms ?? false;
  const orderName = document.getElementById("order-name");
  const orderPhone = document.getElementById("order-phone");
  if (orderName && !orderName.value.trim()) orderName.value = els.profileFullName.value;
  if (orderPhone && !orderPhone.value.trim()) orderPhone.value = els.profilePhone.value;
}

function renderProfileMeta() {
  if (!state.profileAvailable || !state.profile) {
    els.profileMeta.innerHTML = "";
    els.profileMeta.classList.add("hidden");
    return;
  }
  const chips = [
    state.profile.approved ? "Approved member" : "Approval pending",
    state.profile.is_admin ? "Admin access enabled" : "Member access",
    state.profile.notify_email ? "Email notices on" : "Email notices off",
    state.profile.notify_sms ? "SMS notices on" : "SMS notices off",
  ];
  const uid = state.profile.user_id || state.session?.user?.id || "";
  const apiHost = supabasePublicApiHost();
  const adminFlag = coerceMemberIsAdmin(state.profile.is_admin);
  const approvedFlag = Boolean(state.profile.approved === true || state.profile.approved === "t");
  els.profileMeta.innerHTML = `${chips
    .map((chip) => `<span class="profile-chip">${escapeHtml(chip)}</span>`)
    .join("")}
    <div class="profile-diagnostics portal-lock-note" role="status">
      <p class="profile-diagnostics-title">Access diagnostics (this device)</p>
      <ul class="profile-diagnostics-list">
        <li><strong>Supabase API host</strong> ${escapeHtml(apiHost)} — must match the project where you edit <code>member_profiles</code>.</li>
        <li><strong>Member user_id</strong> <code>${escapeHtml(uid || "—")}</code></li>
        <li><strong>is_admin</strong> ${adminFlag ? "true" : "false"}, <strong>approved</strong> ${approvedFlag ? "true" : "false"} — if both are true but Admin looks empty, reload the portal once; if the tab stays locked, fix flags in Supabase for this <code>user_id</code> on this host.</li>
      </ul>
    </div>`;
  els.profileMeta.classList.remove("hidden");
}

function memberDirectoryQuery() {
  return els.memberDirectorySearch?.value?.trim() || "";
}

function memberDirectoryFilterValue() {
  const value = String(els.memberDirectoryFilter?.value || "all");
  return ["all", "approved", "pending", "admins"].includes(value) ? value : "all";
}

function visibleMemberDirectory() {
  return filterPortalMembers(
    state.memberDirectory,
    memberDirectoryQuery(),
    memberDirectoryFilterValue(),
  );
}

function renderMemberDirectory() {
  if (!state.profile?.is_admin || !state.memberDirectoryAvailable) {
    els.memberDirectorySummary.innerHTML = "";
    els.memberDirectorySummary.classList.add("hidden");
    els.memberDirectoryList.innerHTML = "";
    els.memberDirectoryList.classList.add("hidden");
    els.memberDirectoryEmpty.classList.remove("hidden");
    return;
  }

  const stats = buildMemberDirectoryStats(state.memberDirectory);
  els.memberDirectorySummary.innerHTML = `
    <article class="broadcast-metric"><span>Total members</span><strong>${stats.total}</strong></article>
    <article class="broadcast-metric"><span>Approved</span><strong>${stats.approved}</strong></article>
    <article class="broadcast-metric"><span>Pending</span><strong>${stats.pending}</strong></article>
    <article class="broadcast-metric"><span>Admins</span><strong>${stats.admins}</strong></article>
  `;
  els.memberDirectorySummary.classList.toggle("hidden", !stats.total);

  if (!state.memberDirectory.length) {
    els.memberDirectoryList.innerHTML = "";
    els.memberDirectoryList.classList.add("hidden");
    els.memberDirectoryEmpty.textContent =
      "No member records have been created yet. Invite a member or sign in with a member account to populate the directory.";
    els.memberDirectoryEmpty.classList.remove("hidden");
    return;
  }

  const visibleMembers = visibleMemberDirectory();
  if (!visibleMembers.length) {
    els.memberDirectoryList.innerHTML = "";
    els.memberDirectoryList.classList.add("hidden");
    els.memberDirectoryEmpty.textContent =
      "No members match this search or filter yet. Try a different name, email, or directory filter.";
    els.memberDirectoryEmpty.classList.remove("hidden");
    return;
  }

  els.memberDirectoryEmpty.classList.add("hidden");
  els.memberDirectoryList.classList.remove("hidden");
  els.memberDirectoryList.innerHTML = visibleMembers
    .map((member) => {
      const approvalLock = getMemberApprovalLockReason(member, state.memberDirectory);
      const adminLock = getMemberAdminLockReason(member, state.memberDirectory);
      const updatedAt = formatDateTime(member.updatedAt || member.createdAt, "Recently created");
      const approvalLabel = member.approved ? "Mark pending" : "Approve member";
      const adminLabel = member.isAdmin ? "Remove admin" : "Grant admin";
      const notificationSummary = member.notifyEmail
        ? member.notifySms
          ? "Email + SMS"
          : "Email only"
        : member.notifySms
          ? "SMS only"
          : "Off";
      const tags = [
        member.approved ? "Approved" : "Pending",
        member.isAdmin ? "Admin access" : "Member access",
        member.notifyEmail ? "Email notices on" : "Email notices off",
        member.notifySms ? "SMS notices on" : "SMS notices off",
      ];

      return `
        <article class="broadcast-item member-directory-item">
          <div class="member-directory-item-head">
            <div class="member-directory-primary">
              <strong>${escapeHtml(member.fullName)}</strong>
              <div class="member-directory-meta">${escapeHtml(member.email || "No email on record")}</div>
              <div class="member-directory-meta">Updated ${escapeHtml(updatedAt)}</div>
            </div>
            <span class="broadcast-chip">${escapeHtml(member.isAdmin ? "Admin" : member.approved ? "Approved" : "Pending")}</span>
          </div>
          <div class="broadcast-tags">
            ${tags.map((tag) => `<span class="broadcast-tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="member-directory-fields">
            <div class="member-directory-field">
              <span>Phone</span>
              <strong>${escapeHtml(member.phone || "Not saved")}</strong>
            </div>
            <div class="member-directory-field">
              <span>Notifications</span>
              <strong>${escapeHtml(notificationSummary)}</strong>
            </div>
          </div>
          <div class="member-directory-actions">
            <button
              class="button button-secondary button-small"
              type="button"
              data-member-approval="${escapeHtml(member.userId)}"
              ${approvalLock ? `disabled title="${escapeHtml(approvalLock)}"` : ""}
            >
              ${escapeHtml(approvalLabel)}
            </button>
            <button
              class="button button-secondary button-small"
              type="button"
              data-member-admin="${escapeHtml(member.userId)}"
              ${adminLock ? `disabled title="${escapeHtml(adminLock)}"` : ""}
            >
              ${escapeHtml(adminLabel)}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  els.memberDirectoryList.querySelectorAll("[data-member-approval]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.memberApproval || "";
      const member = state.memberDirectory.find((item) => item.userId === userId);
      if (!member) return;
      button.disabled = true;
      await toggleMemberApproval(member);
    });
  });

  els.memberDirectoryList.querySelectorAll("[data-member-admin]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.memberAdmin || "";
      const member = state.memberDirectory.find((item) => item.userId === userId);
      if (!member) return;
      button.disabled = true;
      await toggleMemberAdmin(member);
    });
  });
}

function renderBroadcastHistory() {
  if (!state.profile?.is_admin || !state.broadcastsAvailable) {
    els.broadcastMetrics.classList.add("hidden");
    els.broadcastHistoryList.classList.add("hidden");
    els.broadcastHistoryEmpty.classList.remove("hidden");
    return;
  }

  els.broadcastMetrics.innerHTML = `
    <article class="broadcast-metric"><span>Recent notices</span><strong>${state.broadcasts.length}</strong></article>
    <article class="broadcast-metric"><span>Sent or partial</span><strong>${state.broadcasts.filter((item) => ["sent", "partial"].includes(item.status)).length}</strong></article>
    <article class="broadcast-metric"><span>Draft or failed</span><strong>${state.broadcasts.filter((item) => ["draft", "queued", "sending", "failed"].includes(item.status)).length}</strong></article>
  `;

  if (!state.broadcasts.length) {
    els.broadcastMetrics.classList.add("hidden");
    els.broadcastHistoryList.classList.add("hidden");
    els.broadcastHistoryEmpty.textContent =
      "No broadcast notices have been saved yet. Send a draft or live notice to populate this history.";
    els.broadcastHistoryEmpty.classList.remove("hidden");
    return;
  }

  els.broadcastMetrics.classList.remove("hidden");
  els.broadcastHistoryEmpty.classList.add("hidden");
  els.broadcastHistoryList.classList.remove("hidden");
  els.broadcastHistoryList.innerHTML = state.broadcasts
    .map((item) => {
      const statusLabel = String(item.status || "draft")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const deliveryTags = [];
      if (item.deliveryCounts?.sent) deliveryTags.push(`${item.deliveryCounts.sent} sent`);
      if (item.deliveryCounts?.failed) deliveryTags.push(`${item.deliveryCounts.failed} failed`);
      if (item.deliveryCounts?.skipped) deliveryTags.push(`${item.deliveryCounts.skipped} skipped`);
      return `
      <article class="broadcast-item">
        <div class="broadcast-item-head">
          <div>
            <strong>${escapeHtml(item.subject || "Broadcast notice")}</strong>
            <div class="portal-card-copy portal-card-copy-tight">${escapeHtml(formatDateTime(item.sent_at || item.created_at, "Just created"))}</div>
          </div>
          <span class="broadcast-chip">${escapeHtml(statusLabel)}</span>
        </div>
        <p class="portal-card-copy portal-card-copy-tight">${escapeHtml(item.message || "")}</p>
        <div class="broadcast-tags">
          <span class="broadcast-tag">${escapeHtml(Array.isArray(item.channels) ? item.channels.join(" + ").toUpperCase() : "EMAIL")}</span>
          <span class="broadcast-tag">${escapeHtml(String(item.audience || "approved_members").replaceAll("_", " "))}</span>
          ${deliveryTags.map((tag) => `<span class="broadcast-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </article>
    `;
    })
    .join("");
}

function summarizeDashboardMessage(value, fallback) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return fallback;
  return text.length > 140 ? `${text.slice(0, 137).trimEnd()}...` : text;
}

function renderAdminDashboard() {
  const hasAdmin = Boolean(state.profile?.is_admin);
  const memberStats = buildMemberDirectoryStats(state.memberDirectory);
  const approvedAdminCount = countApprovedAdmins(state.memberDirectory);
  const systems = [
    {
      label: "Admin account",
      status: hasAdmin ? "ready" : "blocked",
      detail: hasAdmin
        ? "Admin permissions are active for this signed-in member."
        : "This account is not marked as an admin in member_profiles.",
    },
    {
      label: "Member directory",
      status: !hasAdmin ? "blocked" : state.memberDirectoryAvailable ? "ready" : "blocked",
      detail: !hasAdmin
        ? "Requires the admin account."
        : state.memberDirectoryAvailable
          ? `${memberStats.total} member${memberStats.total === 1 ? "" : "s"} loaded, ${memberStats.pending} pending approval, ${memberStats.admins} admin${memberStats.admins === 1 ? "" : "s"}.`
          : "Run supabase/member_notifications.sql so member approvals and admin access can load.",
    },
    {
      label: "Backup admin coverage",
      status: !hasAdmin
        ? "blocked"
        : !state.memberDirectoryAvailable
          ? "blocked"
          : approvedAdminCount >= 2
            ? "ready"
            : "pending",
      detail: !hasAdmin
        ? "Requires the admin account."
        : !state.memberDirectoryAvailable
          ? "The member directory must load before backup-admin coverage can be checked."
          : approvedAdminCount >= 2
            ? `${approvedAdminCount} approved admin accounts are available.`
            : "Only one approved admin is active. Promote one backup admin from the member directory.",
    },
    {
      label: "Merch manager",
      status: !hasAdmin ? "blocked" : state.merchAdminAvailable ? "ready" : "blocked",
      detail: !hasAdmin
        ? "Requires the admin account."
        : state.merchAdminAvailable
          ? `${state.adminProducts.length} merch item${state.adminProducts.length === 1 ? "" : "s"} synced and editable.`
          : "Run supabase/product_admin.sql to enable product admin controls.",
    },
    {
      label: "Website editor",
      status: !hasAdmin ? "blocked" : state.siteContentAvailable ? "ready" : "blocked",
      detail: !hasAdmin
        ? "Requires the admin account."
        : state.siteContentAvailable
          ? "Public website content, events, and page copy are connected and ready to edit."
          : "Run supabase/site_content.sql to enable public site editing.",
    },
    {
      label: "Member notices",
      status: !hasAdmin ? "blocked" : state.broadcastsAvailable ? "ready" : "blocked",
      detail: !hasAdmin
        ? "Requires the admin account."
        : state.broadcastsAvailable
          ? `${state.broadcasts.length} recent broadcast${state.broadcasts.length === 1 ? "" : "s"} loaded.`
          : "Run supabase/member_notifications.sql and deploy the member-broadcast function.",
    },
    {
      label: "Invite links",
      status: !hasAdmin
        ? "blocked"
        : state.inviteToolChecked
          ? state.inviteToolHealthy
            ? "ready"
            : "blocked"
          : "pending",
      detail: !hasAdmin
        ? "Requires the admin account."
        : state.inviteToolChecked
          ? state.inviteToolHealthy
            ? summarizeDashboardMessage(
                els.inviteLinksStatus.textContent,
                "Invite links were generated successfully.",
              )
            : summarizeDashboardMessage(
                els.inviteLinksStatus.textContent,
                "The last invite check failed. Review the invite function and try again.",
              )
          : "Not yet verified. Run a small test invite to confirm the member-invite-links function.",
    },
    {
      label: "Member orders",
      status: !hasAdmin ? "blocked" : state.adminOrdersAvailable ? "ready" : "blocked",
      detail: !hasAdmin
        ? "Requires the admin account."
        : state.adminOrdersAvailable
          ? `${state.adminOrders.length} order${state.adminOrders.length === 1 ? "" : "s"} in the queue (latest drops first).`
          : "Orders table or policies missing. Apply supabase/migrations for orders RLS.",
    },
  ];

  const readyCount = systems.filter((item) => item.status === "ready").length;
  const blockedCount = systems.filter((item) => item.status === "blocked").length;
  const pendingCount = systems.filter((item) => item.status === "pending").length;

  els.adminDashboardMetrics.innerHTML = `
    <article class="broadcast-metric"><span>Systems ready</span><strong>${readyCount}/${systems.length}</strong></article>
    <article class="broadcast-metric"><span>Attention needed</span><strong>${blockedCount}</strong></article>
    <article class="broadcast-metric"><span>Verification pending</span><strong>${pendingCount}</strong></article>
  `;

  els.adminDashboardGrid.innerHTML = systems
    .map((item) => {
      const badgeLabel =
        item.status === "ready"
          ? "Ready"
          : item.status === "pending"
            ? "Check"
            : item.label === "Admin account"
              ? "Locked"
              : "Setup";
      return `
        <article class="admin-status-card is-${item.status}">
          <div class="admin-status-card-head">
            <strong>${escapeHtml(item.label)}</strong>
            <span class="admin-status-badge is-${item.status}">${escapeHtml(badgeLabel)}</span>
          </div>
          <p>${escapeHtml(item.detail)}</p>
        </article>
      `;
    })
    .join("");

  const nextSteps = [];
  if (!state.profileAvailable) {
    nextSteps.push(
      "Run supabase/member_notifications.sql so admin roles and member profiles can load.",
    );
  } else if (!hasAdmin) {
    nextSteps.push(
      "If this should be the BLFSC admin login, sign out, refresh the portal, and sign back in so the latest admin permissions load.",
    );
  }
  if (hasAdmin && !state.memberDirectoryAvailable) {
    nextSteps.push("Load the member directory so approvals and backup admins can be managed here.");
  }
  if (hasAdmin && state.memberDirectoryAvailable && approvedAdminCount < 2) {
    nextSteps.push(
      "Invite or approve one more trusted member, then grant them admin access as your backup admin.",
    );
  }
  if (hasAdmin && !state.merchAdminAvailable) {
    nextSteps.push("Run supabase/product_admin.sql to unlock the merch manager.");
  }
  if (hasAdmin && !state.siteContentAvailable) {
    nextSteps.push("Run supabase/site_content.sql to unlock the website editor.");
  }
  if (hasAdmin && !state.broadcastsAvailable) {
    nextSteps.push(
      "Deploy the notification SQL and member-broadcast edge function before sending notices.",
    );
  }
  if (hasAdmin && !state.inviteToolChecked) {
    nextSteps.push("Generate one test invite link to verify the invite function is live.");
  } else if (hasAdmin && state.inviteToolChecked && !state.inviteToolHealthy) {
    nextSteps.push(
      "Review the last invite error, fix the member-invite-links function or secrets, then retry.",
    );
  }
  if (hasAdmin && !state.adminOrdersAvailable) {
    nextSteps.push(
      "Apply the orders table migration in Supabase (or use Refresh orders) so drop fulfillment can load.",
    );
  }

  els.adminDashboardNext.innerHTML = nextSteps.length
    ? `<strong>Next steps</strong><br>${nextSteps.map((step) => escapeHtml(step)).join("<br>")}`
    : "All core admin systems have been checked. You are ready to manage members, merch, notices, website content, and invite links from this panel.";
}

function inviteRedirectDefault() {
  return MEMBERS_PORTAL_URL;
}

function splitInviteLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeInviteEmails(text) {
  const unique = [];
  const seen = new Set();
  splitInviteLines(text).forEach((email) => {
    const normalized = email.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  });
  return unique;
}

function emailLooksValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizeInvitePhones(text) {
  return splitInviteLines(text);
}

function normalizePhoneNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : "";
  }
  if (/^0?4\d{8}$/.test(digits)) {
    const local = digits.startsWith("0") ? digits.slice(1) : digits;
    return `+61${local}`;
  }
  if (/^61\d{9}$/.test(digits)) {
    return `+${digits}`;
  }
  return /^\d{8,15}$/.test(digits) ? `+${digits}` : "";
}

function normalizeInviteRecipients(emailText, phoneText) {
  const emails = normalizeInviteEmails(emailText);
  const phones = normalizeInvitePhones(phoneText);
  const seen = new Set();
  const recipients = [];
  const invalidEmails = [];
  const invalidPhones = [];
  const extraPhones = [];

  emails.forEach((email, index) => {
    if (!emailLooksValid(email)) {
      invalidEmails.push(email);
      return;
    }

    if (seen.has(email)) return;
    seen.add(email);

    const phoneRaw = phones[index] || "";
    const phone = normalizePhoneNumber(phoneRaw);
    if (phoneRaw && !phone) {
      invalidPhones.push(phoneRaw);
    }

    recipients.push({
      email,
      phone,
    });
  });

  phones.slice(emails.length).forEach((phone) => {
    if (phone) extraPhones.push(phone);
  });

  return {
    recipients,
    invalidEmails,
    invalidPhones,
    extraPhones,
  };
}

function inviteCsv() {
  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["email", "phone", "status", "sms_status", "invite_link", "note"],
    ...state.inviteResults.map((item) => [
      item.email,
      item.phone || "",
      item.status,
      item.sms_status || "",
      item.action_link || "",
      item.error || item.note || "",
    ]),
  ];
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

async function copyInviteLink(link) {
  try {
    await navigator.clipboard.writeText(link);
    showToast("Invite link copied.");
  } catch {
    showToast("Could not copy the invite link.", true);
  }
}

function downloadInviteCsv() {
  if (!state.inviteResults.length) return;
  const blob = new Blob([inviteCsv()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `blfsc-member-invites-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function renderInviteResults() {
  els.downloadInviteLinksBtn.disabled = !state.inviteResults.length;

  if (!state.inviteResults.length) {
    els.inviteResultsList.innerHTML = "";
    els.inviteResultsList.classList.add("hidden");
    els.inviteResultsEmpty.classList.remove("hidden");
    return;
  }

  els.inviteResultsEmpty.classList.add("hidden");
  els.inviteResultsList.classList.remove("hidden");
  els.inviteResultsList.innerHTML = state.inviteResults
    .map(
      (item, index) => `
    <article class="broadcast-item">
      <div class="broadcast-item-head">
        <div>
          <strong>${escapeHtml(item.email)}</strong>
          <div class="invite-link-meta">${escapeHtml(item.phone ? `Phone: ${item.phone}` : "Email delivery only")}</div>
        </div>
        <span class="broadcast-chip">${escapeHtml(item.status === "ready" ? "Ready" : item.status === "exists" ? "Needs review" : "Error")}</span>
      </div>
      ${item.action_link ? `<div class="invite-link-url">${escapeHtml(item.action_link)}</div>` : `<div class="portal-lock-note">${escapeHtml(item.error || item.note || "No invite link was returned for this email.")}</div>`}
      <div class="invite-link-actions">
        <div class="invite-link-meta">${escapeHtml(item.note || (item.action_link ? "Single-use invite link generated." : "Review this address before trying again."))}${item.sms_status ? ` SMS: ${escapeHtml(item.sms_status)}` : ""}${item.sms_error ? ` (${escapeHtml(item.sms_error)})` : ""}</div>
        ${item.action_link ? `<button class="button button-secondary button-small" type="button" data-copy-invite-index="${index}">Copy link</button>` : ""}
      </div>
    </article>
  `,
    )
    .join("");

  els.inviteResultsList.querySelectorAll("[data-copy-invite-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.copyInviteIndex);
      const item = state.inviteResults[index];
      if (item?.action_link) {
        copyInviteLink(item.action_link);
      }
    });
  });
}

function resetChatState() {
  state.chatMessages = [];
  state.chatAvailable = true;
  chatFetchInFlight = false;
  els.chatList.innerHTML = "";
  els.chatEmpty.classList.add("hidden");
  els.chatForm.reset();
  setChatComposerEnabled(false);
  setChatStatus("Signed-in members can post updates, quick notices, and club chatter here.");
}

function resetProfileState() {
  state.profile = null;
  state.profileAvailable = false;
  toggleAdminTab(false);
  setAdminAccessBanner("");
  els.profileForm.reset();
  els.profileEmail.value = state.session?.user?.email || "";
  setProfileFormEnabled(false);
  setProfileStatus("Sign in to load your member profile and notification preferences.");
  renderProfileMeta();
  renderAdminDashboard();
}

function resetBroadcastState() {
  state.broadcasts = [];
  state.broadcastsAvailable = false;
  els.broadcastMetrics.innerHTML = "";
  els.broadcastMetrics.classList.add("hidden");
  els.broadcastHistoryList.innerHTML = "";
  els.broadcastHistoryList.classList.add("hidden");
  els.broadcastHistoryEmpty.textContent =
    "Broadcast history will appear here once the notification tables are deployed.";
  els.broadcastHistoryEmpty.classList.remove("hidden");
  els.adminAccessNote.textContent = "";
  els.adminAccessNote.classList.add("hidden");
  setBroadcastFormEnabled(false);
  setBroadcastStatus(
    "Notifications will be sent only when the admin session, function, and member tables are configured.",
  );
  renderAdminDashboard();
}

function resetMerchAdminState() {
  state.adminProducts = [];
  state.merchAdminAvailable = false;
  fillMerchAdminForm();
  setMerchAdminEnabled(false);
  els.merchAdminSummary.innerHTML = "";
  els.merchAdminSummary.classList.add("hidden");
  els.merchAdminList.innerHTML = "";
  els.merchAdminList.classList.add("hidden");
  els.merchAdminEmpty.textContent = "Your merch list will appear here when admin access is active.";
  els.merchAdminEmpty.classList.remove("hidden");
  setMerchAdminStatus("Merch manager will load here for the admin account.");
  renderAdminDashboard();
}

function resetMemberDirectoryState() {
  state.memberDirectory = [];
  state.memberDirectoryAvailable = false;
  if (els.memberDirectorySearch) {
    els.memberDirectorySearch.value = "";
  }
  if (els.memberDirectoryFilter) {
    els.memberDirectoryFilter.value = "all";
  }
  setMemberDirectoryEnabled(false);
  els.memberDirectorySummary.innerHTML = "";
  els.memberDirectorySummary.classList.add("hidden");
  els.memberDirectoryList.innerHTML = "";
  els.memberDirectoryList.classList.add("hidden");
  els.memberDirectoryEmpty.textContent =
    "Member records will appear here after the admin directory loads.";
  els.memberDirectoryEmpty.classList.remove("hidden");
  setMemberDirectoryStatus(
    "Member directory access will load here once the admin account is ready.",
  );
  renderAdminDashboard();
}

function resetInviteState() {
  state.inviteResults = [];
  state.inviteToolChecked = false;
  state.inviteToolHealthy = false;
  if (els.inviteForm) {
    els.inviteForm.reset();
  }
  els.inviteRedirect.value = inviteRedirectDefault();
  els.inviteResultsList.innerHTML = "";
  els.inviteResultsList.classList.add("hidden");
  els.inviteResultsEmpty.textContent =
    "Generated invite links will appear here after you run the tool.";
  els.inviteResultsEmpty.classList.remove("hidden");
  setInviteFormEnabled(false);
  setInviteStatus(
    "Invite links will appear here once the admin account and invite function are configured.",
  );
  renderAdminDashboard();
}

function resetSiteContentState() {
  state.siteContentAvailable = false;
  if (els.siteContentForm) {
    fillSiteContentForm();
  }
  setSiteContentFormEnabled(false);
  setSiteContentStatus(
    "Website content controls will load here once the admin account and site content table are ready.",
  );
  renderAdminDashboard();
}

function resetPortalState() {
  state.products = [];
  state.activeCategory = "all";
  state.cart = [];
  els.productGrid.innerHTML = "";
  els.productGrid.classList.add("hidden");
  els.productsEmpty.classList.add("hidden");
  els.productsLoading.textContent = "Loading merchandise...";
  els.productsLoading.classList.remove("hidden");
  els.shopCategoryTabs.innerHTML = "";
  els.shopSummary.textContent = "Loading merchandise...";
  renderCart();
  resetMemberOrdersUI();
}

async function fetchProducts() {
  if (!state.session) return;
  els.productsLoading.textContent = "Loading merchandise...";
  els.productsLoading.classList.remove("hidden");
  els.productsEmpty.classList.add("hidden");
  els.productGrid.classList.add("hidden");
  const { data, error } = await db
    .from(PRODUCT_TABLE)
    .select("*")
    .or("active.is.null,active.eq.true")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    state.products = [];
    els.productsLoading.textContent = "Failed to load merchandise.";
    renderShopSummary();
    updateSummary();
    showToast("Could not load products.", true);
    return;
  }
  state.products = (data || []).map(normalizeProduct);
  renderProducts();
}

async function loadMemberDirectory() {
  if (!state.session || !state.profile?.is_admin) return;
  state.memberDirectoryAvailable = false;
  setMemberDirectoryEnabled(false);
  els.memberDirectorySummary.innerHTML = "";
  els.memberDirectorySummary.classList.add("hidden");
  els.memberDirectoryList.innerHTML = "";
  els.memberDirectoryList.classList.add("hidden");
  els.memberDirectoryEmpty.textContent = "Loading member records...";
  els.memberDirectoryEmpty.classList.remove("hidden");
  setMemberDirectoryStatus("Loading member directory...");

  const { data, error } = await db
    .from(PROFILE_TABLE)
    .select(MEMBER_DIRECTORY_SELECTION)
    .order("is_admin", { ascending: false })
    .order("approved", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    state.memberDirectory = [];
    state.memberDirectoryAvailable = false;
    setMemberDirectoryStatus(error.message || "Could not load the member directory.", true);
    renderMemberDirectory();
    renderAdminDashboard();
    return;
  }

  state.memberDirectory = sortPortalMembers(
    (data || []).map((member) => normalizePortalMember(member)),
  );
  state.memberDirectoryAvailable = true;
  setMemberDirectoryEnabled(true);
  renderMemberDirectory();

  const approvedAdminCount = countApprovedAdmins(state.memberDirectory);
  setMemberDirectoryStatus(
    `Member directory ready. ${state.memberDirectory.length} member${state.memberDirectory.length === 1 ? "" : "s"} loaded, including ${approvedAdminCount} approved admin${approvedAdminCount === 1 ? "" : "s"}.`,
  );
  renderAdminDashboard();
}

async function toggleMemberApproval(member) {
  if (!state.session || !state.profile?.is_admin) {
    return showToast("Only the admin account can manage member approval.", true);
  }

  const lockReason = getMemberApprovalLockReason(member, state.memberDirectory);
  if (lockReason) {
    setMemberDirectoryStatus(lockReason, true);
    return showToast(lockReason, true);
  }

  const nextApproved = !member.approved;
  const question = nextApproved
    ? `Approve ${member.fullName} for the portal?`
    : `Move ${member.fullName} back to pending approval?`;
  if (!window.confirm(question)) {
    renderMemberDirectory();
    return;
  }

  setMemberDirectoryStatus(
    nextApproved
      ? `Approving ${escapeHtml(member.fullName)}...`
      : `Marking ${escapeHtml(member.fullName)} as pending...`,
  );

  const { error } = await db
    .from(PROFILE_TABLE)
    .update({ approved: nextApproved })
    .eq("user_id", member.userId);

  if (error) {
    console.error(error);
    setMemberDirectoryStatus(error.message || "Could not update member approval.", true);
    renderMemberDirectory();
    return showToast("Could not update member approval.", true);
  }

  await loadMemberDirectory();
  if (member.userId === state.session.user.id) {
    await loadMemberProfile();
  }

  setMemberDirectoryStatus(
    nextApproved
      ? `${escapeHtml(member.fullName)} is now approved for the members portal.`
      : `${escapeHtml(member.fullName)} is now pending approval again.`,
  );
  showToast(nextApproved ? "Member approved." : "Member moved to pending.");
}

async function toggleMemberAdmin(member) {
  if (!state.session || !state.profile?.is_admin) {
    return showToast("Only the admin account can manage admin access.", true);
  }

  const lockReason = getMemberAdminLockReason(member, state.memberDirectory);
  if (lockReason) {
    setMemberDirectoryStatus(lockReason, true);
    return showToast(lockReason, true);
  }

  const nextIsAdmin = !member.isAdmin;
  const question = nextIsAdmin
    ? `Grant admin access to ${member.fullName}?`
    : `Remove admin access from ${member.fullName}?`;
  if (!window.confirm(question)) {
    renderMemberDirectory();
    return;
  }

  setMemberDirectoryStatus(
    nextIsAdmin
      ? `Granting admin access to ${escapeHtml(member.fullName)}...`
      : `Removing admin access from ${escapeHtml(member.fullName)}...`,
  );

  const { error } = await db
    .from(PROFILE_TABLE)
    .update({ is_admin: nextIsAdmin })
    .eq("user_id", member.userId);

  if (error) {
    console.error(error);
    setMemberDirectoryStatus(error.message || "Could not update admin access.", true);
    renderMemberDirectory();
    return showToast("Could not update admin access.", true);
  }

  await loadMemberDirectory();
  if (member.userId === state.session.user.id) {
    await loadMemberProfile();
  }

  setMemberDirectoryStatus(
    nextIsAdmin
      ? `${escapeHtml(member.fullName)} now has admin access.`
      : `${escapeHtml(member.fullName)} no longer has admin access.`,
  );
  showToast(nextIsAdmin ? "Admin access granted." : "Admin access removed.");
}

async function loadAdminProducts() {
  if (!state.session || !state.profile?.is_admin) return;
  state.merchAdminAvailable = false;
  setMerchAdminEnabled(false);
  fillMerchAdminForm();
  setMerchAdminStatus("Loading merch manager...");

  const { data, error } = await db
    .from(PRODUCT_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    state.adminProducts = [];
    state.merchAdminAvailable = false;
    renderAdminProducts();
    setMerchAdminStatus(error.message || "Could not load the merch list.", true);
    renderAdminDashboard();
    return;
  }

  state.adminProducts = (data || []).map(normalizeProduct);
  state.merchAdminAvailable = true;
  renderAdminProducts();
  fillMerchAdminForm();
  setMerchAdminEnabled(true);
  setMerchAdminStatus(
    "Merch manager ready. Add new items, update live products, or hide old merch from the shop.",
  );
  renderAdminDashboard();
}

async function fetchChatMessages({ silent = false } = {}) {
  if (!state.session || chatFetchInFlight) return;
  chatFetchInFlight = true;
  if (!silent) setChatStatus("Loading member chat...");
  const { data, error } = await db
    .from(CHAT_TABLE)
    .select("id,user_id,user_email,display_name,message,created_at")
    .order("created_at", { ascending: true })
    .limit(CHAT_LIMIT);
  chatFetchInFlight = false;
  if (error) {
    console.error(error);
    state.chatMessages = [];
    state.chatAvailable = false;
    setChatComposerEnabled(false);
    renderChatMessages();
    setChatStatus(
      "Member chat is not configured yet. Run the chat SQL setup and refresh the portal.",
      true,
    );
    return;
  }
  state.chatAvailable = true;
  state.chatMessages = data || [];
  setChatComposerEnabled(true);
  renderChatMessages();
  if (!silent)
    setChatStatus("Member chat is live. Messages refresh automatically every 15 seconds.");
}

async function deleteChatMessage(messageId) {
  if (!state.session || !messageId) return;
  const { error } = await db.from(CHAT_TABLE).delete().eq("id", messageId);
  if (error) {
    console.error(error);
    showToast(error.message || "Could not delete message.", true);
    return;
  }
  await fetchChatMessages({ silent: true });
  showToast("Message removed from member chat.");
}

async function loadMemberProfile() {
  if (!state.session) return;
  state.profile = null;
  state.profileAvailable = false;
  toggleAdminTab(false);
  fillProfileForm({ email: state.session.user.email || "" });
  setProfileStatus("Loading your member profile and notification preferences...");
  setProfileFormEnabled(false);

  const { data: bootstrapResult, error: bootstrapAdminError } = await db.rpc(
    "ensure_bootstrap_portal_admin",
  );
  let bootstrapDiagnostic = "";
  if (bootstrapAdminError) {
    console.warn("ensure_bootstrap_portal_admin:", bootstrapAdminError);
    bootstrapDiagnostic = ` Admin unlock could not run: ${bootstrapAdminError.message || String(bootstrapAdminError)}.`;
  } else if (bootstrapResult && typeof bootstrapResult === "object") {
    console.info("ensure_bootstrap_portal_admin:", bootstrapResult);
    if (bootstrapResult.skipped && bootstrapResult.reason === "email_not_allowlisted") {
      bootstrapDiagnostic = ` Admin unlock skipped: database saw sign-in email "${bootstrapResult.resolved_email || "?"}", which is not the allowlisted owner address. Use the exact allowlisted email in Supabase Auth, or add your address to NEXT_PUBLIC_PORTAL_BOOTSTRAP_ADMIN_EMAILS / the migration allowlist.`;
    } else if (bootstrapResult.ok === false && bootstrapResult.detail) {
      bootstrapDiagnostic = ` Admin unlock failed: ${bootstrapResult.detail}`;
    } else if (bootstrapResult.ok === false && bootstrapResult.reason === "no_email") {
      bootstrapDiagnostic =
        " Admin unlock failed: no email on this session (JWT/auth.users). Try signing out and signing in with email/password.";
    }
  }

  let result = await db
    .from(PROFILE_TABLE)
    .select(MEMBER_DIRECTORY_SELECTION)
    .eq("user_id", state.session.user.id)
    .maybeSingle();
  if (result.error && isMissingTableError(result.error)) {
    setAdminAccessBanner(
      "Admin tools are unavailable until the member profiles table is configured in Supabase.",
    );
    setProfileStatus(
      "Member profiles are not configured yet. Run the notification setup SQL to enable saved contact details and event preferences.",
      true,
    );
    fillProfileForm({
      email: state.session.user.email || "",
      full_name: deriveDisplayName(state.session.user.email || ""),
    });
    renderAdminDashboard();
    return;
  }
  if (result.error) {
    console.error(result.error);
    setAdminAccessBanner("Admin tools are unavailable until the member profile can be loaded.");
    setProfileStatus(result.error.message || "Could not load your member profile.", true);
    fillProfileForm({ email: state.session.user.email || "" });
    renderAdminDashboard();
    return;
  }
  if (!result.data) {
    result = await db
      .from(PROFILE_TABLE)
      .upsert(
        {
          user_id: state.session.user.id,
          email: state.session.user.email || "",
          full_name: deriveDisplayName(state.session.user.email || ""),
          phone: "",
          notify_email: true,
          notify_sms: false,
        },
        { onConflict: "user_id" },
      )
      .select(MEMBER_DIRECTORY_SELECTION)
      .maybeSingle();
    if (result.error) {
      console.error(result.error);
      setProfileStatus(result.error.message || "Could not create your member profile.", true);
      fillProfileForm({ email: state.session.user.email || "" });
      renderAdminDashboard();
      return;
    }
  }

  if (
    bootstrapResult?.action === "upserted" &&
    result.data &&
    !coerceMemberIsAdmin(result.data.is_admin)
  ) {
    const retry = await db
      .from(PROFILE_TABLE)
      .select(MEMBER_DIRECTORY_SELECTION)
      .eq("user_id", state.session.user.id)
      .maybeSingle();
    if (!retry.error && retry.data) {
      result = retry;
    }
  }

  const sessionEmailNorm = String(state.session.user.email || "")
    .trim()
    .toLowerCase();
  const profileEmailNorm = String(result.data?.email || "")
    .trim()
    .toLowerCase();
  let selfPromoteDiagnostic = "";
  if (
    result.data &&
    !coerceMemberIsAdmin(result.data.is_admin) &&
    (sessionEmailNorm === portalOwnerEmailNormalized ||
      profileEmailNorm === portalOwnerEmailNormalized)
  ) {
    const { error: promoteErr } = await db
      .from(PROFILE_TABLE)
      .update({ is_admin: true, approved: true })
      .eq("user_id", state.session.user.id);
    if (promoteErr) {
      console.warn("portal owner self-promote:", promoteErr);
      selfPromoteDiagnostic = ` Could not unlock admin via profile update: ${promoteErr.message || String(promoteErr)}.`;
    } else {
      const promoted = await db
        .from(PROFILE_TABLE)
        .select(MEMBER_DIRECTORY_SELECTION)
        .eq("user_id", state.session.user.id)
        .maybeSingle();
      if (!promoted.error && promoted.data) {
        result = promoted;
      }
    }
  }

  const rawProfile = result.data;
  const isAdminEffective = coerceMemberIsAdmin(rawProfile.is_admin);
  state.profile = { ...rawProfile, is_admin: isAdminEffective };
  state.profileAvailable = true;
  fillProfileForm(state.profile);
  setProfileFormEnabled(true);
  renderProfileMeta();
  syncPasswordUsername(state.profile.email || state.session.user.email || "");
  toggleAdminTab(Boolean(state.profile.is_admin));
  if (state.profile.is_admin) {
    setAdminAccessBanner("");
  } else {
    setAdminAccessBanner(
      [ADMIN_LOCKED_MESSAGE, bootstrapDiagnostic, selfPromoteDiagnostic].filter(Boolean).join(""),
    );
  }
  if (state.profile.is_admin) {
    setInviteFormEnabled(true);
    if (!els.inviteRedirect.value) {
      els.inviteRedirect.value = inviteRedirectDefault();
    }
  } else {
    resetMemberDirectoryState();
    resetInviteState();
    resetSiteContentState();
  }
  const profileStatusError =
    Boolean(bootstrapDiagnostic && !state.profile.is_admin) ||
    Boolean(selfPromoteDiagnostic && !state.profile.is_admin);
  setProfileStatus(
    `${state.profile.approved ? "Approved member access is active." : "Your profile is waiting for approval."}${state.profile.is_admin ? " Admin tools are enabled on your account." : " Admin tools are locked for this account. Sign out, refresh, and sign back in if this should be the BLFSC admin login."}${bootstrapDiagnostic}${selfPromoteDiagnostic}`,
    profileStatusError,
  );
  if (state.profile.full_name) {
    els.chatDisplayName.value = loadDisplayName();
  }
  renderAdminDashboard();
  if (state.profile.is_admin) {
    await Promise.all([
      fetchBroadcastHistory(),
      loadSiteContent(),
      loadAdminProducts(),
      loadMemberDirectory(),
      fetchAdminOrders(),
    ]);
  } else {
    resetBroadcastState();
    resetMemberDirectoryState();
    resetMerchAdminState();
    resetAdminOrdersState();
  }
}

let lastMemberProfileRefetchMs = 0;

async function refetchMemberProfileIfSession(minGapMs = 0) {
  if (!state.session) return;
  const now = Date.now();
  if (minGapMs > 0 && now - lastMemberProfileRefetchMs < minGapMs) return;
  lastMemberProfileRefetchMs = now;
  const { data } = await db.auth.getSession();
  if (!data.session) return;
  state.session = data.session;
  await loadMemberProfile();
}

async function loadSiteContent() {
  if (!state.session || !state.profile?.is_admin) return;
  fillSiteContentForm();
  setSiteContentFormEnabled(false);
  setSiteContentStatus("Loading public site content...");

  let result = await db
    .from(SITE_CONTENT_TABLE)
    .select("id,content,updated_at")
    .eq("id", SITE_CONTENT_RECORD_ID)
    .maybeSingle();

  if (result.error && isMissingTableError(result.error)) {
    state.siteContentAvailable = false;
    setSiteContentStatus(
      "Website editing is not configured yet. Run supabase/site_content.sql to enable the public website editor.",
      true,
    );
    renderAdminDashboard();
    return;
  }
  if (result.error) {
    console.error(result.error);
    state.siteContentAvailable = false;
    setSiteContentStatus(result.error.message || "Could not load website content.", true);
    renderAdminDashboard();
    return;
  }

  if (!result.data) {
    result = await db
      .from(SITE_CONTENT_TABLE)
      .upsert(
        {
          id: SITE_CONTENT_RECORD_ID,
          content: cloneSiteContentDefaults(),
          updated_by: state.session.user.id,
        },
        { onConflict: "id" },
      )
      .select("id,content,updated_at")
      .single();
    if (result.error) {
      console.error(result.error);
      state.siteContentAvailable = false;
      setSiteContentStatus(
        result.error.message || "Could not create the default website content record.",
        true,
      );
      renderAdminDashboard();
      return;
    }
  }

  state.siteContentAvailable = true;
  fillSiteContentForm(result.data.content);
  setSiteContentFormEnabled(true);
  setSiteContentStatus(
    `Website editor ready. Last saved ${escapeHtml(formatDateTime(result.data.updated_at, "just now"))}. This panel now controls home, about, events, contact, merch, privacy, and terms content from one place.`,
  );
  renderAdminDashboard();
}

async function fetchBroadcastHistory() {
  if (!state.session || !state.profile?.is_admin) return;
  setBroadcastFormEnabled(false);
  setBroadcastStatus("Loading recent broadcasts...");
  const { data, error } = await db
    .from(BROADCAST_TABLE)
    .select("id,subject,message,channels,audience,status,created_at,sent_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) {
    console.error(error);
    state.broadcasts = [];
    state.broadcastsAvailable = false;
    els.adminAccessNote.textContent =
      "Run member_notifications.sql and deploy the member-broadcast edge function before using the admin notice sender.";
    els.adminAccessNote.classList.remove("hidden");
    setBroadcastStatus("Broadcast tables are not configured yet for this portal.", true);
    renderBroadcastHistory();
    renderAdminDashboard();
    return;
  }

  const ids = (data || []).map((item) => item.id);
  const deliveryCounts = {};
  if (ids.length) {
    const deliveries = await db
      .from(BROADCAST_DELIVERIES_TABLE)
      .select("broadcast_id,status")
      .in("broadcast_id", ids);
    if (!deliveries.error) {
      (deliveries.data || []).forEach((row) => {
        const key = String(row.broadcast_id);
        if (!deliveryCounts[key]) deliveryCounts[key] = { sent: 0, failed: 0, skipped: 0 };
        if (row.status === "sent") deliveryCounts[key].sent += 1;
        if (row.status === "failed") deliveryCounts[key].failed += 1;
        if (row.status === "skipped") deliveryCounts[key].skipped += 1;
      });
    }
  }

  state.broadcastsAvailable = true;
  state.broadcasts = (data || []).map((item) => ({
    ...item,
    deliveryCounts: deliveryCounts[String(item.id)] || { sent: 0, failed: 0, skipped: 0 },
  }));
  els.adminAccessNote.classList.add("hidden");
  setBroadcastFormEnabled(true);
  setBroadcastStatus(
    "Admin notifications are ready. Drafts and history are live. Email sending needs Resend or SMTP, and SMS needs Twilio.",
  );
  renderBroadcastHistory();
  renderAdminDashboard();
}

async function setAuthedUI(session) {
  state.session = session;
  syncPasswordUsername(
    session?.user?.email || document.getElementById("email")?.value.trim() || "",
  );
  if (session) {
    clearAuthMessage();
    els.authScreen.classList.add("hidden");
    els.memberApp.classList.remove("hidden");
    els.memberEmailDisplay.textContent = session.user.email || "Member";
    els.profileEmail.value = session.user.email || "";
    els.chatDisplayName.value = loadDisplayName();
    setChatComposerEnabled(true);
    loadCart();
    await Promise.all([fetchProducts(), fetchMemberOrders()]);
    await loadMemberProfile();
    await fetchChatMessages();
    startChatPolling();
    activatePaneFromHash();
    return;
  }

  stopChatPolling();
  els.memberApp.classList.add("hidden");
  els.authScreen.classList.remove("hidden");
  els.memberEmailDisplay.textContent = "";
  closeCart();
  resetPortalState();
  resetProfileState();
  resetBroadcastState();
  resetSiteContentState();
  resetMerchAdminState();
  resetMemberDirectoryState();
  resetInviteState();
  resetChatState();
}

async function handleSignIn(event) {
  event.preventDefault();
  clearAuthMessage();
  const btn = document.getElementById("signin-btn");
  btn.disabled = true;
  btn.textContent = "Signing in...";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  syncPasswordUsername(email);
  const { error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = "Access members area";
  if (error) {
    track("portal_signin_failed", { reason: error.message || "unknown" });
    showAuthMessage(error.message, true);
    return;
  }
  track("portal_signin_success", { email_domain: email.split("@")[1] || "unknown" });
  showAuthMessage("Access granted. Loading members area...");
}

async function handleSetPassword(event) {
  event.preventDefault();
  if (!state.session) return showToast("You must be signed in first.", true);
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  if (newPassword.length < 8) return showToast("Password must be at least 8 characters.", true);
  if (newPassword !== confirmPassword) return showToast("Passwords do not match.", true);
  const btn = document.getElementById("set-password-btn");
  btn.disabled = true;
  btn.textContent = "Saving...";
  const { error } = await db.auth.updateUser({ password: newPassword });
  btn.disabled = false;
  btn.textContent = "Save password";
  if (error) return showToast(error.message, true);
  document.getElementById("set-password-form").reset();
  syncPasswordUsername(state.session.user.email || "");
  showToast("Password updated successfully.");
}

async function handleProfileSave(event) {
  event.preventDefault();
  if (!state.session) return showToast("You must be signed in first.", true);
  if (!state.profileAvailable) return showToast("Member profiles are not configured yet.", true);
  const fullName = els.profileFullName.value.trim();
  const phone = els.profilePhone.value.trim();
  const notifyEmail = els.profileNotifyEmail.checked;
  const notifySms = els.profileNotifySms.checked;
  if (notifySms && !phone)
    return showToast("Add a phone number before enabling SMS notices.", true);
  const btn = els.saveProfileBtn;
  btn.disabled = true;
  btn.textContent = "Saving...";
  const { data, error } = await db
    .from(PROFILE_TABLE)
    .upsert(
      {
        user_id: state.session.user.id,
        email: state.session.user.email || "",
        full_name: fullName || deriveDisplayName(state.session.user.email || ""),
        phone,
        notify_email: notifyEmail,
        notify_sms: notifySms,
        sms_opted_in_at: notifySms ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" },
    )
    .select(
      "user_id,email,full_name,phone,is_admin,approved,notify_email,notify_sms,sms_opted_in_at,updated_at",
    )
    .single();
  btn.disabled = false;
  btn.textContent = "Save profile";
  if (error) {
    console.error(error);
    setProfileStatus(error.message || "Could not save your member profile.", true);
    return showToast("Profile save failed.", true);
  }
  state.profile = data;
  fillProfileForm(data);
  renderProfileMeta();
  setProfileStatus(
    `Profile saved. Notification preferences updated ${escapeHtml(formatDateTime(data.updated_at, "just now"))}.`,
  );
  if (fullName) {
    els.chatDisplayName.value = fullName;
    saveDisplayName(fullName);
  }
  showToast("Member profile updated.");
}

async function invokeOrderNotify(orderId) {
  if (!state.session?.access_token || orderId == null) return;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${ORDER_NOTIFY_FUNCTION}`, {
      method: "POST",
      headers: {
        apikey: SAFE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${state.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order_id: orderId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn("order-notify:", payload.error || response.status);
      track("portal_order_notify_failed", {
        order_id: orderId,
        status: response.status,
      });
      return;
    }
    if (payload.sent === false && payload.skipped) {
      track("portal_order_notify_skipped", { order_id: orderId });
      return;
    }
    track("portal_order_notify_sent", { order_id: orderId });
  } catch (err) {
    console.warn("order-notify failed", err);
    track("portal_order_notify_failed", { order_id: orderId, status: "network" });
  }
}

async function handleSubmitOrder(event) {
  event.preventDefault();
  if (!state.session) return showToast("You must be signed in.", true);
  if (!state.cart.length) return showToast("Your order is empty.", true);
  const customerName = document.getElementById("order-name").value.trim();
  if (!customerName) return showToast("Add your name before submitting the order.", true);
  const btn = document.getElementById("submit-order-btn");
  btn.disabled = true;
  btn.textContent = "Submitting...";
  const payload = {
    user_id: state.session.user.id,
    status: "submitted",
    items: {
      member_email: state.session.user.email || "",
      customer_name: customerName,
      customer_phone: document.getElementById("order-phone").value.trim(),
      state: document.getElementById("order-state").value,
      notes: document.getElementById("order-notes").value.trim(),
      total: getCartTotal(),
      line_items: state.cart,
    },
  };
  const { data: inserted, error } = await db
    .from(ORDERS_TABLE)
    .insert([payload])
    .select("id,created_at")
    .single();
  btn.disabled = false;
  btn.textContent = "Submit order";
  if (error) {
    console.error(error);
    track("portal_order_submit_failed", { reason: error.message || "unknown" });
    return showToast(error.message || "Could not submit order.", true);
  }
  state.cart = [];
  saveCart();
  renderCart();
  closeCart();
  document.getElementById("order-form").reset();
  if (state.profile?.full_name)
    document.getElementById("order-name").value = state.profile.full_name;
  if (state.profile?.phone) document.getElementById("order-phone").value = state.profile.phone;
  track("portal_order_submitted", {
    order_id: inserted?.id,
    item_count: payload.items.line_items.length,
    total: payload.items.total,
  });
  await fetchMemberOrders();
  if (state.profile?.is_admin) {
    await fetchAdminOrders();
  }
  if (inserted?.id != null) {
    await invokeOrderNotify(inserted.id);
  }
  const orderLabel = inserted?.id != null ? `Order #${inserted.id} submitted.` : "Order submitted.";
  showToast(orderLabel);
}

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!state.session) return showToast("You must be signed in to use member chat.", true);
  if (!state.chatAvailable) return showToast("Member chat is not configured yet.", true);
  const displayName = els.chatDisplayName.value.trim();
  const message = els.chatMessage.value.trim();
  if (!displayName) return showToast("Add a display name before posting.", true);
  if (!message) return showToast("Write a message before posting.", true);
  const btn = els.chatSendBtn;
  btn.disabled = true;
  btn.textContent = "Sending...";
  const { error } = await db.from(CHAT_TABLE).insert([
    {
      user_id: state.session.user.id,
      user_email: state.session.user.email || "",
      display_name: displayName,
      message,
    },
  ]);
  btn.disabled = false;
  btn.textContent = "Send message";
  if (error) {
    console.error(error);
    return showToast(error.message || "Could not post message.", true);
  }
  saveDisplayName(displayName);
  els.chatMessage.value = "";
  await fetchChatMessages({ silent: true });
  setChatStatus("Message posted. Member chat refreshes automatically every 15 seconds.");
  showToast("Message posted to member chat.");
}

async function handleBroadcastSubmit(event) {
  event.preventDefault();
  if (!state.session || !state.profile?.is_admin)
    return showToast("Only the admin account can send notifications.", true);
  const subject = els.broadcastSubject.value.trim();
  const message = els.broadcastMessage.value.trim();
  const channels = [
    els.broadcastEmail.checked ? "email" : null,
    els.broadcastSms.checked ? "sms" : null,
  ].filter(Boolean);
  if (!subject) return showToast("Add a subject before sending.", true);
  if (!message) return showToast("Write a notification message first.", true);
  if (!channels.length) return showToast("Choose at least one delivery channel.", true);
  const btn = els.sendBroadcastBtn;
  btn.disabled = true;
  btn.textContent = els.broadcastDryRun.checked ? "Saving draft..." : "Sending...";

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${BROADCAST_FUNCTION}`, {
      method: "POST",
      headers: {
        apikey: SAFE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${state.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject,
        message,
        channels,
        audience: els.broadcastAudience.value,
        dryRun: els.broadcastDryRun.checked,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        payload.error || `Notification request failed with status ${response.status}.`,
      );
    const dryRun = Boolean(payload.dry_run);
    const resultMessage = dryRun
      ? `Draft saved. ${payload.recipients || 0} recipient${payload.recipients === 1 ? "" : "s"} matched this audience.`
      : `Notification processed. ${payload.successful_deliveries || 0} sent, ${payload.failed_deliveries || 0} failed, ${payload.skipped_deliveries || 0} skipped.`;
    const providerMessage = deliveryProviderSummary(payload);
    const issueMessage =
      Array.isArray(payload.error_summary) && payload.error_summary.length
        ? ` Issue: ${escapeHtml(payload.error_summary[0])}.`
        : "";
    const statusMessage = `${resultMessage}${providerMessage}${issueMessage}`;
    setBroadcastStatus(statusMessage);
    if (!dryRun) els.broadcastMessage.value = "";
    els.broadcastDryRun.checked = false;
    await fetchBroadcastHistory();
    setBroadcastStatus(statusMessage);
    track("portal_broadcast_submit", {
      dry_run: dryRun,
      recipients: payload.recipients || 0,
      sent: payload.successful_deliveries || 0,
      failed: payload.failed_deliveries || 0,
    });
    showToast(dryRun ? "Broadcast draft saved." : "Broadcast request completed.");
  } catch (error) {
    console.error(error);
    const messageText = error instanceof Error ? error.message : "Could not send the notification.";
    track("portal_broadcast_failed", { reason: messageText });
    setBroadcastStatus(messageText, true);
    els.adminAccessNote.textContent =
      "If this keeps failing, check the provider status above and set Resend or SMTP email secrets, plus Twilio if you want SMS.";
    els.adminAccessNote.classList.remove("hidden");
    showToast(messageText, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Send notification";
  }
}

async function handleInviteSubmit(event) {
  event.preventDefault();
  if (!state.session || !state.profile?.is_admin) {
    return showToast("Only the admin account can generate invite links.", true);
  }

  const { recipients, invalidEmails, invalidPhones, extraPhones } = normalizeInviteRecipients(
    els.inviteEmails.value,
    els.invitePhones?.value || "",
  );
  const redirectTo = els.inviteRedirect.value.trim() || inviteRedirectDefault();

  if (!recipients.length) {
    return showToast("Add at least one valid member email.", true);
  }

  const warningParts = [];
  if (invalidEmails.length) {
    warningParts.push(
      `Some emails were skipped because they do not look valid: ${invalidEmails.join(", ")}`,
    );
  }
  if (invalidPhones.length) {
    warningParts.push(
      `Some phone numbers were skipped because they do not look valid: ${invalidPhones.join(", ")}`,
    );
  }
  if (extraPhones.length) {
    warningParts.push(
      `Extra phone numbers were ignored because they do not have matching emails: ${extraPhones.join(", ")}`,
    );
  }
  if (warningParts.length) {
    setInviteStatus(warningParts.join(" "), true);
  }

  const btn = els.generateInviteLinksBtn;
  btn.disabled = true;
  btn.textContent = "Generating...";
  setInviteStatus(
    `Generating one-time invite links for ${recipients.length} member${recipients.length === 1 ? "" : "s"}...`,
  );

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${INVITE_FUNCTION}`, {
      method: "POST",
      headers: {
        apikey: SAFE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${state.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients,
        redirectTo,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Invite generation failed with status ${response.status}.`);
    }

    state.inviteResults = Array.isArray(payload.results) ? payload.results : [];
    state.inviteToolChecked = true;
    state.inviteToolHealthy = true;
    renderInviteResults();
    setInviteFormEnabled(true);
    const smsDelivered = payload.sms_sent || 0;
    const smsSkipped = payload.sms_skipped || 0;
    const smsFailed = payload.sms_failed || 0;
    setInviteStatus(
      `Generated ${payload.generated || 0} invite link${payload.generated === 1 ? "" : "s"} from ${payload.requested || recipients.length} requested member${recipients.length === 1 ? "" : "s"}.${smsDelivered ? ` SMS sent to ${smsDelivered} phone${smsDelivered === 1 ? "" : "s"}.` : ""}${smsSkipped ? ` SMS skipped for ${smsSkipped} phone${smsSkipped === 1 ? "" : "s"}.` : ""}${smsFailed ? ` SMS failed for ${smsFailed} phone${smsFailed === 1 ? "" : "s"}.` : ""}`,
    );
    track("portal_invite_links_generated", {
      requested: payload.requested || recipients.length,
      generated: payload.generated || 0,
      sms_sent: smsDelivered,
      sms_failed: smsFailed,
    });
    renderAdminDashboard();
    showToast("Invite links generated.");
  } catch (error) {
    console.error(error);
    state.inviteResults = [];
    state.inviteToolChecked = true;
    state.inviteToolHealthy = false;
    renderInviteResults();
    const messageText = error instanceof Error ? error.message : "Could not generate invite links.";
    track("portal_invite_links_failed", { reason: messageText });
    setInviteStatus(messageText, true);
    renderAdminDashboard();
    showToast(messageText, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate invite links";
  }
}

async function handleSiteContentSave(event) {
  event.preventDefault();
  if (!state.session || !state.profile?.is_admin) {
    return showToast("Only the admin account can edit the public website content.", true);
  }

  const btn = document.getElementById("save-site-content-btn");
  let payload;
  try {
    payload = readSiteContentForm();
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Check the website editor and try again.";
    setSiteContentStatus(messageText, true);
    return showToast(messageText, true);
  }
  btn.disabled = true;
  btn.textContent = "Saving...";
  setSiteContentStatus("Saving website content...");

  const { data, error } = await db
    .from(SITE_CONTENT_TABLE)
    .upsert(
      {
        id: SITE_CONTENT_RECORD_ID,
        content: payload,
        updated_by: state.session.user.id,
      },
      { onConflict: "id" },
    )
    .select("updated_at")
    .single();

  btn.disabled = false;
  btn.textContent = "Save website content";

  if (error) {
    console.error(error);
    setSiteContentStatus(error.message || "Could not save website content.", true);
    return showToast("Website content save failed.", true);
  }

  state.siteContentAvailable = true;
  setSiteContentFormEnabled(true);
  fillSiteContentForm(payload);
  setSiteContentStatus(
    `Website content saved ${escapeHtml(formatDateTime(data.updated_at, "just now"))}. Home, events, merch, about, contact, and legal pages will refresh on the live site within about a minute.`,
  );
  showToast("Website content updated.");
}

async function handleMerchAdminSave(event) {
  event.preventDefault();
  if (!state.session || !state.profile?.is_admin) {
    return showToast("Only the admin account can manage merch.", true);
  }

  let product;
  try {
    product = readMerchAdminForm();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check the merch form and try again.";
    setMerchAdminStatus(message, true);
    return showToast(message, true);
  }

  const btn = els.saveMerchBtn;
  btn.disabled = true;
  btn.textContent = product.id ? "Saving..." : "Adding...";
  setMerchAdminStatus(product.id ? "Saving merch changes..." : "Adding merch item...");

  const currentProduct = product.id
    ? state.adminProducts.find((item) => Number(item.id) === Number(product.id)) || null
    : null;
  const selectedFile = getSelectedMerchImageFile();
  let uploadedImage = null;

  const saveWithPayload = async (includeCategory) => {
    const payload = buildMerchPayload(product, { includeCategory });
    return product.id
      ? db.from(PRODUCT_TABLE).update(payload).eq("id", product.id).select("*").single()
      : db.from(PRODUCT_TABLE).insert([payload]).select("*").single();
  };

  try {
    if (selectedFile) {
      setMerchAdminStatus("Uploading merch image...");
      uploadedImage = await uploadMerchImage(selectedFile);
      product.image_url = uploadedImage.publicUrl;
    }

    let result = await saveWithPayload(true);
    if (result.error && isMissingColumnError(result.error, "category")) {
      result = await saveWithPayload(false);
    }
    if (result.error) {
      throw result.error;
    }

    const previousPath = extractMerchStoragePath(
      currentProduct?.image_url || currentProduct?.image || "",
    );
    if (uploadedImage?.path && previousPath && previousPath !== uploadedImage.path) {
      await removeMerchStorageObject(previousPath);
    }

    await Promise.all([loadAdminProducts(), fetchProducts()]);
    clearMerchAdminForm(
      product.id
        ? "Merch item updated. The members shop is refreshed right away and the public merch page updates within about a minute."
        : "New merch item added. It is live in the members shop now and will appear on the public merch page within about a minute.",
    );
    showToast(product.id ? "Merch item updated." : "Merch item added.");
  } catch (error) {
    console.error(error);
    if (uploadedImage?.path) {
      await removeMerchStorageObject(uploadedImage.path);
    }
    const message = error instanceof Error ? error.message : "Could not save the merch item.";
    setMerchAdminStatus(message, true);
    showToast("Merch save failed.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = product.id ? "Save merch changes" : "Add merch item";
  }
}

async function toggleMerchVisibility(product) {
  if (!state.session || !state.profile?.is_admin) {
    return showToast("Only the admin account can manage merch.", true);
  }

  const nextActive = product.active === false;
  const question = nextActive
    ? `Make ${product.name} live in the members shop again?`
    : `Hide ${product.name} from the members shop?`;
  if (!window.confirm(question)) return;

  const { error } = await db
    .from(PRODUCT_TABLE)
    .update({ active: nextActive })
    .eq("id", product.id);

  if (error) {
    console.error(error);
    setMerchAdminStatus(error.message || "Could not update merch visibility.", true);
    return showToast("Could not update merch visibility.", true);
  }

  await Promise.all([loadAdminProducts(), fetchProducts()]);
  setMerchAdminStatus(
    `${escapeHtml(product.name)} is now ${nextActive ? "live in" : "hidden from"} the members shop.`,
  );
  showToast(nextActive ? "Merch item is live." : "Merch item hidden.");
}

async function deleteMerchItem(product) {
  if (!state.session || !state.profile?.is_admin) {
    return showToast("Only the admin account can manage merch.", true);
  }
  if (!window.confirm(`Delete ${product.name} permanently? This cannot be undone.`)) return;

  const { error } = await db.from(PRODUCT_TABLE).delete().eq("id", product.id);
  if (error) {
    console.error(error);
    setMerchAdminStatus(error.message || "Could not delete the merch item.", true);
    return showToast("Could not delete merch.", true);
  }

  const storagePath = extractMerchStoragePath(product.image_url || product.image || "");
  if (storagePath) {
    await removeMerchStorageObject(storagePath);
  }
  await Promise.all([loadAdminProducts(), fetchProducts()]);
  clearMerchAdminForm("Merch item deleted.");
  showToast("Merch item deleted.");
}

function handleMerchFormReset() {
  clearMerchAdminForm("Merch form cleared. You can add a new item now.");
  showToast("Merch form cleared.");
}

function resetSiteContentFormToDefaults() {
  fillSiteContentForm(cloneSiteContentDefaults());
  setSiteContentStatus(
    "Default website content loaded into the form. Save to publish it to blfsc.com.",
  );
  showToast("Loaded default website content.");
}

async function copyWebsiteLink() {
  try {
    await navigator.clipboard.writeText(PUBLIC_SITE_URL);
    setSiteContentStatus("Website link copied. Open blfsc.com to review your changes.");
    showToast("Website link copied.");
  } catch (error) {
    console.error(error);
    showToast("Could not copy the website link.", true);
  }
}

function initReveal() {
  const revealNodes = document.querySelectorAll("[data-reveal]");
  if (!revealNodes.length) return;
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
  ) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 },
  );
  revealNodes.forEach((node) => observer.observe(node));
}

document.getElementById("signin-form").addEventListener("submit", handleSignIn);
document.getElementById("set-password-form").addEventListener("submit", handleSetPassword);
document.getElementById("order-form").addEventListener("submit", handleSubmitOrder);
els.profileForm.addEventListener("submit", handleProfileSave);
els.merchAdminForm.addEventListener("submit", handleMerchAdminSave);
els.broadcastForm.addEventListener("submit", handleBroadcastSubmit);
els.siteContentForm.addEventListener("submit", handleSiteContentSave);
els.inviteForm.addEventListener("submit", handleInviteSubmit);
els.chatForm.addEventListener("submit", handleChatSubmit);
els.clearMerchImageBtn.addEventListener("click", clearSelectedMerchImage);
els.resetMerchFormBtn.addEventListener("click", handleMerchFormReset);
document
  .getElementById("reset-site-content-btn")
  ?.addEventListener("click", resetSiteContentFormToDefaults);
document.getElementById("copy-website-link-btn")?.addEventListener("click", copyWebsiteLink);
document.getElementById("toggle-cart").addEventListener("click", openCart);
document.getElementById("close-cart").addEventListener("click", closeCart);
els.cartOverlay.addEventListener("click", closeCart);
els.chatRefreshBtn.addEventListener("click", () => fetchChatMessages());
els.downloadInviteLinksBtn.addEventListener("click", downloadInviteCsv);
els.memberDirectorySearch?.addEventListener("input", renderMemberDirectory);
els.memberDirectoryFilter?.addEventListener("change", renderMemberDirectory);
els.refreshMemberDirectoryBtn?.addEventListener("click", () => loadMemberDirectory());
els.refreshMemberOrdersBtn?.addEventListener("click", () => fetchMemberOrders());
els.refreshAdminOrdersBtn?.addEventListener("click", () => fetchAdminOrders());

document.getElementById("signout-btn").addEventListener("click", async () => {
  await db.auth.signOut();
  showToast("Signed out.");
});

document.getElementById("email").addEventListener("input", (event) => {
  if (!state.session) syncPasswordUsername(event.target.value.trim());
});

els.merchAdminImageFile.addEventListener("change", () => {
  merchPendingFile = null;
  syncMerchPreviewFromInputs();
});
els.merchAdminImageUrl.addEventListener("input", () => {
  if (!getSelectedMerchImageFile()) {
    syncMerchPreviewFromInputs();
  }
});
els.merchAdminDropzone?.addEventListener("click", pickMerchImage);
els.merchAdminDropzone?.addEventListener("keydown", handleMerchDropzoneKeydown);
els.merchAdminDropzone?.addEventListener("dragenter", handleMerchDropzoneHover);
els.merchAdminDropzone?.addEventListener("dragover", handleMerchDropzoneHover);
els.merchAdminDropzone?.addEventListener("dragleave", handleMerchDropzoneLeave);
els.merchAdminDropzone?.addEventListener("drop", handleMerchDropzoneDrop);

els.chatDisplayName.addEventListener("change", (event) => {
  const value = event.target.value.trim();
  if (value) saveDisplayName(value);
});

document.querySelectorAll("[data-portal-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const pane = button.dataset.portalTab || "shop";
    if (pane === "admin" && !state.profile?.is_admin) {
      setAdminAccessBanner(ADMIN_LOCKED_MESSAGE);
      showToast("Admin tools are locked for this account.", true);
      return;
    }
    setActivePane(pane);
  });
});

document.querySelectorAll("[data-admin-target]").forEach((button) => {
  button.addEventListener("click", () => {
    jumpToAdminSection(button.dataset.adminTarget || "");
  });
});

window.addEventListener("hashchange", () => {
  if (state.session) activatePaneFromHash();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  void refetchMemberProfileIfSession(2000);
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) void refetchMemberProfileIfSession(0);
});

window.addEventListener("online", () => {
  void refetchMemberProfileIfSession(0);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCart();
});

db.auth.onAuthStateChange((_event, session) => {
  setAuthedUI(session);
});

(async function init() {
  loadPosthogClient();
  initReveal();
  track("portal_page_opened", { path: window.location.pathname });
  resetPortalState();
  resetProfileState();
  resetBroadcastState();
  resetSiteContentState();
  resetInviteState();
  resetChatState();
  renderAdminDashboard();
  const { data } = await db.auth.getSession();
  setAuthedUI(data.session);
})();
