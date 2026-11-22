import { useMemo, useState } from "react";
import { Gavel, TrendingUp, Timer, Trophy, CheckCircle2 } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { auctions as seedAuctions, listingById, buyerById, pgById, packhouseById } from "../data/seed";
import type { Auction, Bid } from "../data/types";
import { formatDateTime } from "../lib/format";

const auctionStatusTone = { Scheduled: "neutral", Open: "good", Closed: "orange" } as const;
const bidStatusTone: Record<Bid["status"], "good" | "warn" | "bad" | "neutral"> = {
  Active: "neutral",
  Outbid: "warn",
  Winning: "good",
  Won: "good",
  Lost: "bad",
};

function highestBid(a: Auction): Bid | undefined {
  return [...a.bids].sort((x, y) => y.amount_per_qtl - x.amount_per_qtl)[0];
}

export default function AuctionModule() {
  const { role } = useRole();
  const isBuyer = role.id === "buyer";
  const buyerId = role.scopedBuyerId ?? "BYR-001";
  const isSellSide = role.id === "pg_manager" || role.id === "packhouse";

  const [, forceRender] = useState(0);
  const [bidAmount, setBidAmount] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const auctions = useMemo(() => {
    let list = seedAuctions;
    if (isSellSide) {
      list = list.filter((a) => {
        const listing = listingById(a.listing_id);
        if (!listing) return false;
        if (role.id === "pg_manager") return listing.pg_id === (role.scopedPgId ?? "PG-001");
        return listing.packhouse_id === (role.scopedPackhouseId ?? "PH-01");
      });
    }
    return [...list].sort((a, b) => (a.status === "Open" ? -1 : b.status === "Open" ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, seedAuctions.length]);

  const placeBid = (auction: Auction) => {
    const listing = listingById(auction.listing_id);
    if (!listing) return;
    const high = highestBid(auction);
    const minNext = (high?.amount_per_qtl ?? listing.reserve_price_per_qtl ?? 0) + 5;
    const amount = parseFloat(bidAmount[auction.auction_id] ?? "");
    if (!amount || amount < minNext) {
      flash(`Bid must be at least Rs ${minNext} per Qtl.`);
      return;
    }
    auction.bids.forEach((b) => {
      if (b.status === "Winning") b.status = "Outbid";
    });
    auction.bids.push({
      bid_id: `BID-NEW-${Math.floor(Math.random() * 9000 + 1000)}`,
      listing_id: auction.listing_id,
      buyer_id: buyerId,
      amount_per_qtl: amount,
      placed_at: new Date().toISOString(),
      status: "Winning",
    });
    setBidAmount({ ...bidAmount, [auction.auction_id]: "" });
    forceRender((n) => n + 1);
    flash(`Bid of Rs ${amount}/Qtl placed on ${auction.crop} auction.`);
  };

  const closeAuction = (auction: Auction) => {
    if (auction.bids.length === 0) {
      flash("No bids received - nothing to close.");
      return;
    }
    const high = highestBid(auction)!;
    auction.bids.forEach((b) => {
      b.status = b.bid_id === high.bid_id ? "Won" : "Lost";
    });
    auction.status = "Closed";
    auction.winning_bid_id = high.bid_id;
    const listing = listingById(auction.listing_id);
    if (listing) listing.status = "Matched";
    forceRender((n) => n + 1);
    flash(`Auction closed. Winning bid Rs ${high.amount_per_qtl}/Qtl by ${buyerById(high.buyer_id)?.name ?? high.buyer_id}.`);
  };

  return (
    <div>
      <PageHeader
        title="Auctions & Bulk Bidding"
        subtitle="Bulk-bidding format proven on Kinnow listings - bid list, current highest bid, close auction"
        icon={<Gavel size={20} />}
      />

      {auctions.length === 0 ? (
        <Card>
          <EmptyState icon={<Gavel size={22} />} title="No auctions currently running" body="Auction-format listings (e.g. Kinnow bulk lots) will appear here with live bidding." />
        </Card>
      ) : (
        <div className="space-y-4">
          {auctions.map((a) => {
            const listing = listingById(a.listing_id);
            const high = highestBid(a);
            const sellerName = listing?.pg_id ? pgById(listing.pg_id)?.name : listing?.packhouse_id ? packhouseById(listing.packhouse_id)?.name : "-";
            return (
              <Card key={a.auction_id}>
                <SectionHeader
                  title={`${a.crop} Bulk Lot · ${a.auction_id}`}
                  subtitle={`${listing?.quantity_available_qtl ?? 0} Qtl · ${listing?.grade ?? ""} · ${sellerName}`}
                  right={<Badge tone={auctionStatusTone[a.status]}>{a.status}</Badge>}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <div className="subtle text-[11px]">Reserve Price</div>
                    <div className="font-semibold text-ink">Rs {listing?.reserve_price_per_qtl}/Qtl</div>
                  </div>
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <div className="subtle text-[11px]">Current Highest Bid</div>
                    <div className="font-semibold text-good inline-flex items-center gap-1">
                      <TrendingUp size={13} /> {high ? `Rs ${high.amount_per_qtl}/Qtl` : "No bids yet"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <div className="subtle text-[11px]">Opens</div>
                    <div className="font-medium text-ink text-xs">{formatDateTime(a.opens_at)}</div>
                  </div>
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <div className="subtle text-[11px] inline-flex items-center gap-1"><Timer size={11} /> Closes</div>
                    <div className="font-medium text-ink text-xs">{formatDateTime(a.closes_at)}</div>
                  </div>
                </div>

                {a.bids.length === 0 ? (
                  <p className="subtle text-xs mb-3">No bids placed yet.</p>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Bidder</Th>
                        <Th>Amount / Qtl</Th>
                        <Th>Placed At</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...a.bids]
                        .sort((x, y) => y.amount_per_qtl - x.amount_per_qtl)
                        .map((b) => (
                          <tr key={b.bid_id}>
                            <Td className="font-medium">{buyerById(b.buyer_id)?.name ?? b.buyer_id}</Td>
                            <Td>Rs {b.amount_per_qtl}</Td>
                            <Td className="text-xs">{formatDateTime(b.placed_at)}</Td>
                            <Td>
                              <Badge tone={bidStatusTone[b.status]}>
                                {b.status === "Won" && <Trophy size={11} />} {b.status}
                              </Badge>
                            </Td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                )}

                {isBuyer && a.status === "Open" && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      className="input !w-40"
                      type="number"
                      placeholder={`Min Rs ${(high?.amount_per_qtl ?? listing?.reserve_price_per_qtl ?? 0) + 5}`}
                      value={bidAmount[a.auction_id] ?? ""}
                      onChange={(e) => setBidAmount({ ...bidAmount, [a.auction_id]: e.target.value })}
                    />
                    <button className="btn-orange" onClick={() => placeBid(a)}>
                      <Gavel size={15} /> Place Bid
                    </button>
                  </div>
                )}

                {isSellSide && a.status !== "Closed" && (
                  <div className="mt-3">
                    <button className="btn-primary" onClick={() => closeAuction(a)}>
                      <CheckCircle2 size={15} /> Close Auction
                    </button>
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
