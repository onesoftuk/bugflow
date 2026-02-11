import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ticket } from "@shared/schema";
import { STATUS_LABELS, APP_LABELS, PRIORITY_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { Bug, Sparkles, Search, ShieldCheck, Inbox, AlertTriangle, UserCheck } from "lucide-react";
import { useState, useMemo } from "react";
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

type TicketWithUser = Ticket & { user: { username: string; email: string } };

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");

  if (user?.role !== "admin" && user?.role !== "dev") {
    return <Redirect to="/" />;
  }

  const { data: allTickets, isLoading } = useQuery<TicketWithUser[]>({
    queryKey: ["/api/admin/tickets"],
  });

  const filteredTickets = useMemo(() => {
    if (!allTickets) return [];
    return allTickets.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.user.username.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      const matchesApp = appFilter === "all" || t.app === appFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesApp;
    });
  }, [allTickets, search, statusFilter, priorityFilter, appFilter]);

  const stats = useMemo(() => {
    if (!allTickets) return { total: 0, open: 0, critical: 0, resolved: 0 };
    return {
      total: allTickets.length,
      open: allTickets.filter((t) => t.status === "open").length,
      critical: allTickets.filter((t) => t.priority === "critical").length,
      resolved: allTickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
    };
  }, [allTickets]);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await apiRequest("PATCH", `/api/tickets/${ticketId}/status`, {
        status: newStatus,
        comment: `Status changed to ${STATUS_LABELS[newStatus]}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Status updated" });
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-admin-title">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {user?.role === "dev" ? "Dev Panel" : "Admin Panel"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.role === "dev" ? "Manage your assigned tickets" : "Manage all tickets and update their statuses"}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary"><Inbox className="h-4 w-4" /></div>
                <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Tickets</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400"><Bug className="h-4 w-4" /></div>
                <div><p className="text-2xl font-bold">{stats.open}</p><p className="text-xs text-muted-foreground">Open</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400"><AlertTriangle className="h-4 w-4" /></div>
                <div><p className="text-2xl font-bold">{stats.critical}</p><p className="text-xs text-muted-foreground">Critical</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/10 text-green-600 dark:text-green-400"><Sparkles className="h-4 w-4" /></div>
                <div><p className="text-2xl font-bold">{stats.resolved}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tickets or users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-admin-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-admin-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-admin-priority"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-admin-app"><SelectValue placeholder="App" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              {Object.entries(APP_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-20" /></TableCell>)}</TableRow>
                    ))
                  ) : filteredTickets.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12"><p className="text-muted-foreground">No tickets found</p></TableCell></TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell>
                          <Link href={`/tickets/${ticket.id}`}>
                            <span className="font-medium text-sm hover:underline cursor-pointer" data-testid={`link-ticket-${ticket.id}`}>{ticket.title}</span>
                          </Link>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{APP_LABELS[ticket.app]}</Badge></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{ticket.user.username}</span></TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {ticket.type === "bug" ? <span className="flex items-center gap-1"><Bug className="h-3 w-3" /> Bug</span> : <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Feature</span>}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${priorityColors[ticket.priority]}`}>{PRIORITY_LABELS[ticket.priority]}</Badge></TableCell>
                        <TableCell>
                          {ticket.assignedToName ? (
                            <span className="text-sm flex items-center gap-1"><UserCheck className="h-3 w-3" />{ticket.assignedToName}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${statusColors[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</Badge></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span></TableCell>
                        <TableCell>
                          <Select value={ticket.status} onValueChange={(value) => handleStatusChange(ticket.id, value)}>
                            <SelectTrigger className="w-[140px] h-8 text-xs" data-testid={`select-status-${ticket.id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
