import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { TicketCard, TicketCardSkeleton } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Bug, Sparkles, CheckCircle, Clock, Search, Inbox } from "lucide-react";
import { Link } from "wouter";
import type { Ticket } from "@shared/schema";
import { APP_LABELS, STATUS_LABELS } from "@shared/schema";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesApp = appFilter === "all" || t.app === appFilter;
      return matchesSearch && matchesType && matchesStatus && matchesApp;
    });
  }, [tickets, search, typeFilter, statusFilter, appFilter]);

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, bugs: 0, features: 0, open: 0, resolved: 0 };
    return {
      total: tickets.length,
      bugs: tickets.filter((t) => t.type === "bug").length,
      features: tickets.filter((t) => t.type === "feature_request").length,
      open: tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_on_user").length,
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

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-type-filter"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bugs</SelectItem>
              <SelectItem value="feature_request">Features</SelectItem>
            </SelectContent>
          </Select>
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-app-filter"><SelectValue placeholder="App" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              {Object.entries(APP_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
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
                {search || typeFilter !== "all" || statusFilter !== "all" || appFilter !== "all"
                  ? "Try adjusting your filters" : "Create your first ticket to get started"}
              </p>
              {!search && typeFilter === "all" && statusFilter === "all" && appFilter === "all" && (
                <Link href="/tickets/new">
                  <Button variant="outline" data-testid="button-empty-new-ticket"><PlusCircle className="h-4 w-4 mr-2" />Create Ticket</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{filteredTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
        )}
      </div>
    </div>
  );
}
