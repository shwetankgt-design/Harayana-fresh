import { useMemo, useState } from "react";
import { MessagesSquare, Plus, Flag, CheckCircle2, Clock, HelpCircle, MessageCircle } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "../components/ui";
import { useRole } from "../lib/role";
import { communityPosts, farmerById, pgById } from "../data/seed";
import type { CommunityPost, ResolutionStatus } from "../data/types";
import { formatDate } from "../lib/format";

const RESOLUTION_TONE: Record<ResolutionStatus, "good" | "warn" | "bad" | "neutral" | "orange"> = {
  Open: "orange",
  "In Progress": "warn",
  Resolved: "good",
};
const RESOLUTION_ICON: Record<ResolutionStatus, typeof CheckCircle2> = {
  Open: HelpCircle,
  "In Progress": Clock,
  Resolved: CheckCircle2,
};

export default function CommunityModule() {
  const { role } = useRole();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const canPost = role.id === "farmer" || role.id === "pg_manager";

  const allPosts = useMemo(
    () => [...localPosts, ...communityPosts].filter((p) => p.moderation_status !== "Removed"),
    [localPosts]
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    const post: CommunityPost = {
      post_id: `PST-LOCAL-${Date.now()}`,
      type: "Question",
      title: title.trim(),
      body: body.trim(),
      crop: null,
      district: role.scopedPgId ? pgById(role.scopedPgId)?.district ?? "Karnal" : "Karnal",
      pg_id: role.scopedPgId ?? null,
      author_farmer_id: role.scopedFarmerId ?? "HRF-00001",
      posted_on: new Date().toISOString().slice(0, 10),
      resolution_status: "Open",
      moderation_status: "Visible",
      flagged_reason: null,
      replies: [],
    };
    setLocalPosts((p) => [post, ...p]);
    setTitle("");
    setBody("");
    setShowForm(false);
    flash("Question posted to the community space.");
  };

  return (
    <div>
      <PageHeader
        title="E-Community & Stakeholder Collaboration"
        subtitle="Moderated, government-governed space for farmer and PG questions and discussion"
        icon={<MessagesSquare size={20} />}
      />

      {canPost && (
        <div className="mb-4">
          {!showForm ? (
            <button className="btn-orange text-sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Raise a Question
            </button>
          ) : (
            <Card>
              <SectionHeader title="Raise a Question" subtitle="Visible to your PG, PMU/DPMU officials and moderators" />
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-gt-purple/40"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gt-purple/40"
                rows={3}
                placeholder="Describe your question..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-orange text-xs" onClick={submit}>Post Question</button>
                <button className="btn-ghost text-xs" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </Card>
          )}
        </div>
      )}

      {allPosts.length === 0 ? (
        <Card><EmptyState icon={<MessagesSquare size={22} />} title="No community posts yet" body="Questions and discussions from farmers and PGs will appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {allPosts.map((p) => {
            const Icon = RESOLUTION_ICON[p.resolution_status];
            const author = farmerById(p.author_farmer_id);
            return (
              <Card key={p.post_id}>
                <SectionHeader
                  title={p.title}
                  subtitle={`${author?.name ?? "Unknown"} · ${p.pg_id ? pgById(p.pg_id)?.name ?? p.pg_id : p.district} · ${formatDate(p.posted_on)}`}
                  right={
                    <div className="flex items-center gap-2">
                      {p.moderation_status === "Flagged" && <Badge tone="bad"><Flag size={11} /> Flagged</Badge>}
                      <Badge tone={p.type === "Question" ? "neutral" : "orange"}>{p.type}</Badge>
                      {p.type === "Question" && (
                        <Badge tone={RESOLUTION_TONE[p.resolution_status]}>
                          <Icon size={12} /> {p.resolution_status}
                        </Badge>
                      )}
                    </div>
                  }
                />
                <p className="text-sm text-ink leading-relaxed">{p.body}</p>
                {p.replies.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3 space-y-2">
                    {p.replies.map((r) => (
                      <div key={r.reply_id} className="flex gap-2">
                        <MessageCircle size={14} className="text-gt-purple mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-ink">{r.author_name} <span className="text-muted font-normal">· {formatDate(r.posted_on)}</span></div>
                          <p className="text-xs text-muted mt-0.5">{r.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
