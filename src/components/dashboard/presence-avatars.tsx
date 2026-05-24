import type { PresencePeer } from "@/lib/use-projects-presence";
import { formatRelativeShort } from "@/lib/use-projects-presence";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PresenceAvatars({ peers, max = 3 }: { peers: PresencePeer[]; max?: number }) {
  if (!peers || peers.length === 0) return null;
  const shown = peers.slice(0, max);
  const extra = peers.length - shown.length;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex -space-x-1.5" aria-label={`${peers.length} viewer(s) online`}>
        {shown.map((p) => (
          <Tooltip key={p.user_id}>
            <TooltipTrigger asChild>
              <div
                className="size-6 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-semibold text-white cursor-default"
                style={{ background: p.color || "#64748b" }}
              >
                {(p.name || "?").slice(0, 2).toUpperCase()}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="font-medium">{p.name}</div>
              <div className="text-muted-foreground">
                {p.page ? `On ${p.page}` : "Online"} · active {formatRelativeShort(p.online_at)}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {extra > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="size-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-semibold cursor-default">
                +{extra}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {peers.slice(max).map((p) => (
                <div key={p.user_id}>{p.name}</div>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
