import { useState } from "react";
import { ShieldAlert, Flag, Eye, Trash2, CheckCircle2 } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "../components/ui";
import { communityPosts, farmerById, pgById } from "../data/seed";
import type { CommunityPost, ModerationStatus } from "../data/types";
import { formatDate } from "../lib/format";

const STATUS_TONE: Record<ModerationStatus, "good" | "warn" | "bad" | "neutral" | "orange"> = {
  Visible: "good",
  Flagged: "warn",
  Removed: "bad",
};

export default function ModerationModule() {
  const [, forceRender] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // Shared seed array, mutated below, so the E-Community feed reflects moderation decisions.
  const posts = communityPosts;

  const flaggedCount = posts.filter((p) => p.moderation_status === "Flagged").length;

  const setStatus = (post: CommunityPost, status: ModerationStatus) => {
    post.moderation_status = status;
    if (status === "Visible") post.flagged_reason = null;
    forceRender((n) => n + 1);
    flash(`${post.post_id} marked as ${status}.`);
  };

  return (
    <div>
      <PageHeader
        title="Content Moderation"
        subtitle="Review, approve or remove community posts flagged for moderator attention"
        icon={<ShieldAlert size={20} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="subtle">Total Posts</div>
          <div className="text-2xl font-bold text-ink mt-1">{posts.length}</div>
        </Card>
        <Card>
          <div className="subtle">Flagged for Review</div>
          <div className="text-2xl font-bold text-warn mt-1">{flaggedCount}</div>
        </Card>
        <Card>
          <div className="subtle">Removed</div>
          <div className="text-2xl font-bold text-bad mt-1">{posts.filter((p) => p.moderation_status === "Removed").length}</div>
        </Card>
      </div>

      {posts.length === 0 ? (
        <Card><EmptyState icon={<ShieldAlert size={22} />} title="Nothing to moderate" body="Community posts will appear here for review." /></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const author = farmerById(p.author_farmer_id);
            return (
              <Card key={p.post_id}>
                <SectionHeader
                  title={p.title}
                  subtitle={`${author?.name ?? "Unknown"} · ${p.pg_id ? pgById(p.pg_id)?.name ?? p.pg_id : p.district} · ${formatDate(p.posted_on)}`}
                  right={<Badge tone={STATUS_TONE[p.moderation_status]}>{p.moderation_status}</Badge>}
                />
                <p className="text-sm text-ink leading-relaxed">{p.body}</p>
                {p.flagged_reason && (
                  <div className="flex items-start gap-2 rounded-lg bg-warn/5 border border-warn/20 p-2.5 mt-3">
                    <Flag size={14} className="text-warn shrink-0 mt-0.5" />
                    <div className="text-xs text-ink">{p.flagged_reason}</div>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  {p.moderation_status !== "Visible" && (
                    <button className="text-xs font-semibold text-good hover:underline inline-flex items-center gap-1" onClick={() => setStatus(p, "Visible")}>
                      <CheckCircle2 size={13} /> Approve / Keep Visible
                    </button>
                  )}
                  {p.moderation_status !== "Flagged" && (
                    <button className="text-xs font-semibold text-warn hover:underline inline-flex items-center gap-1" onClick={() => setStatus(p, "Flagged")}>
                      <Eye size={13} /> Flag for Review
                    </button>
                  )}
                  {p.moderation_status !== "Removed" && (
                    <button className="text-xs font-semibold text-bad hover:underline inline-flex items-center gap-1" onClick={() => setStatus(p, "Removed")}>
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-xs">
          {toast}
        </div>
      )}
    </div>
  );
}
