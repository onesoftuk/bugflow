import { Link } from "wouter";
import type { Ticket } from "@shared/schema";
import { STATUS_LABELS, APP_LABELS, PRIORITY_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Sparkles, Clock, ArrowRight, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  waiting_on_user: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-300",
  closed: "bg-muted text-muted-foreground",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const isBug = ticket.type === "bug";

  return (
    <Link href={`/tickets/${ticket.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all group" data-testid={`card-ticket-${ticket.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-md shrink-0 ${isBug ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-violet-500/10 text-violet-600 dark:text-violet-400"}`}>
              {isBug ? <Bug className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm truncate" data-testid={`text-ticket-title-${ticket.id}`}>
                  {ticket.title}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {ticket.description}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${statusColors[ticket.status]}`}>
                  {STATUS_LABELS[ticket.status]}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${priorityColors[ticket.priority]}`}>
                  {PRIORITY_LABELS[ticket.priority]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {APP_LABELS[ticket.app]}
                </Badge>
                {ticket.assignedToName && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    {ticket.assignedToName}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground invisible group-hover:visible shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TicketCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-full" />
            <div className="flex gap-2 mt-3">
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-14 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
