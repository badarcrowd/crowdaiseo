"use client";

import { useTransition, useState } from "react";
import { Copy, ExternalLink, Trash2, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeReportShareAction } from "./actions";

type Share = {
  id: string;
  token: string;
  viewCount: number;
  expiresAt: Date | string | null;
  revokedAt: Date | string | null;
  createdAt: Date | string;
  lastViewedAt: Date | string | null;
};

type Props = {
  shares: Share[];
  workspaceId: string;
  shareBaseUrl: string;
};

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(share: Share) {
  if (!share.expiresAt) return false;
  return new Date(share.expiresAt) < new Date();
}

function isRevoked(share: Share) {
  return share.revokedAt !== null;
}

function shareStatus(share: Share) {
  if (isRevoked(share))
    return <Badge variant="destructive">Revoked</Badge>;
  if (isExpired(share))
    return <Badge variant="warning">Expired</Badge>;
  return <Badge variant="success">Active</Badge>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors"
      aria-label="Copy link"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function RevokeButton({
  shareId,
  workspaceId,
  disabled,
}: {
  shareId: string;
  workspaceId: string;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          await revokeReportShareAction({ workspaceId, shareId });
        })
      }
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Revoke share link"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ShareTable({ shares, workspaceId, shareBaseUrl }: Props) {
  if (shares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-medium">No share links yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Share links are created when generating a report with "Create
          shareable link" enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-[11px] uppercase tracking-wider">
            <th className="px-5 py-3 font-medium">Link</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium tabular-nums">Views</th>
            <th className="hidden px-3 py-3 font-medium md:table-cell">
              Last viewed
            </th>
            <th className="hidden px-3 py-3 font-medium lg:table-cell">
              Expires
            </th>
            <th className="hidden px-3 py-3 font-medium lg:table-cell">
              Created
            </th>
            <th className="px-5 py-3 text-right font-medium" />
          </tr>
        </thead>
        <tbody>
          {shares.map((share) => {
            const url = `${shareBaseUrl}/reports/share/${share.token}`;
            const inactive = isRevoked(share) || isExpired(share);
            return (
              <tr
                key={share.id}
                className="border-b transition-colors last:border-0 hover:bg-secondary/40"
              >
                <td className="px-5 py-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    …{share.token.slice(-12)}
                  </span>
                </td>
                <td className="px-3 py-4">{shareStatus(share)}</td>
                <td className="px-3 py-4 tabular-nums">{share.viewCount}</td>
                <td className="hidden px-3 py-4 text-muted-foreground text-xs md:table-cell">
                  {formatDate(share.lastViewedAt)}
                </td>
                <td className="hidden px-3 py-4 text-muted-foreground text-xs lg:table-cell">
                  {formatDate(share.expiresAt)}
                </td>
                <td className="hidden px-3 py-4 text-muted-foreground text-xs lg:table-cell">
                  {formatDate(share.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    {!inactive && <CopyButton text={url} />}
                    {!inactive && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors"
                        aria-label="Open share link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <RevokeButton
                      shareId={share.id}
                      workspaceId={workspaceId}
                      disabled={inactive}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
