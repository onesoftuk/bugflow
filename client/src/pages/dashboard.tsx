import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { TicketCard, TicketCardSkeleton } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Bug, Sparkles, CheckCircle, Clock, Search, Inbox, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import type { Ticket } from "@shared/schema";
import { APP_LABELS } from "@shared/schema";
import { useState, useMemo } from "react";

type StatusGroup = "all" | "outstanding" | "in_progress" | "done";

const STATUS_GROUPS: Record<StatusGroup, string[]> = {
  all: [],
  outstanding: ["open", "rejected"],
  in_progress: ["in_progress", "waiting_on_user"],
  done: ["resolved", "closed"],
};

const STATUS_TAB_CONFIG: { id: StatusGroup; label: string; icon: React.ElementType; color: string }[] = [
  { id: "all", label: "All", icon: Inbox, color: "text-foreground" },
  { id: "outstanding", label: "Outstanding", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400" },
  { id: "in_progress", label: "In Progress", icon: Loader2, color: "text-blue-600 dark:text-blue-400" },
  { id: "done", label: "Done", icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusGroup, setStatusGroup] = useState<StatusGroup>("all");
  const [appFilter, setAppFilter] = useState("all");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesApp = appFilter === "all" || t.app === appFilter;
      const matchesStatus =
        statusGroup === "all" || STATUS_GROUPS[statusGroup].includes(t.status);
      return matchesSearch && matchesType && matchesApp && matchesStatus;
    });
  }, [tickets, search, typeFilter, statusGroup, appFilter]);

  const groupCounts = useMemo(() => {
    if (!tickets) return { all: 0, outstanding: 0, in_progress: 0, done: 0 };
    return {
      all: tickets.length,
      outstanding: tickets.filter((t) => STATUS_GROUPS.outstanding.includes(t.status)).length,
      in_progress: tickets.filter((t) => STATUS_GROUPS.in_progress.includes(t.status)).length,
      done: tickets.filter((t) => STATUS_GROUPS.done.includes(t.status)).length,
    };
  }, [tickets]);

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, bugs: 0, features: 0, resolved: 0 };
    return {
      total: tickets.length,
      bugs: tickets.filter((t) => t.type === "bug").length,
      features: tickets.filter((t) => t.type === "feature_request").length,
      resolved: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
    };
  }, [tickets]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
              Welcome, {user?.username}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your bugs and feature requests
            </p>
          </div>
          <Link href="/tickets/new">
            <Button data-testid="button-new-ticket">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary"><Inbox className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400"><Bug className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-bugs">{stats.bugs}</p>
                  <p className="text-xs text-muted-foreground">Bugs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400"><Sparkles className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-features">{stats.features}</p>
                  <p className="text-xs text-muted-foreground">Features</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/10 text-green-600 dark:text-green-400"><CheckCircle className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-resolved">{stats.resolved}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status group tabs */}
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filter by status group">
          {STATUS_TAB_CONFIG.map(({ id, label, icon: Icon, color }) => {
            const count = groupCounts[id];
            const isActive = statusGroup === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                data-testid={`tab-status-${id}`}
                onClick={() => setStatusGroup(id)}
                className={[
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary-foreground" : color}`} />
                {label}
                <span
                  className={[
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and secondary filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bugs</SelectItem>
              <SelectItem value="feature_request">Features</SelectItem>
            </SelectContent>
          </Select>
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-app-filter">
              <SelectValue placeholder="App" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              {Object.entries(APP_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <TicketCardSkeleton key={i} />)}</div>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4"><Inbox className="h-8 w-8 text-muted-foreground" /></div>
              <h3 className="font-semibold mb-1">No tickets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || typeFilter !== "all" || statusGroup !== "all" || appFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first ticket to get started"}
              </p>
              {!search && typeFilter === "all" && statusGroup === "all" && appFilter === "all" && (
                <Link href="/tickets/new">
                  <Button variant="outline" data-testid="button-empty-new-ticket">
                    <PlusCircle className="h-4 w-4 mr-2" />Create Ticket
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
