import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { EmailLog } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Redirect } from "wouter";
import { Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  sent: { color: "bg-green-500/10 text-green-700 dark:text-green-300", icon: CheckCircle },
  failed: { color: "bg-red-500/10 text-red-700 dark:text-red-300", icon: XCircle },
  queued: { color: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: Clock },
};

export default function AdminEmailLog() {
  const { user } = useAuth();

  if (user?.role !== "admin") return <Redirect to="/" />;

  const { data: logs, isLoading } = useQuery<EmailLog[]>({
    queryKey: ["/api/admin/email-logs"],
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-email-log-title">
            <Mail className="h-6 w-6 text-primary" />
            Email Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track all sent and failed email notifications</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-24" /></TableCell>)}</TableRow>
                    ))
                  ) : !logs || logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><p className="text-muted-foreground">No email logs yet</p></TableCell></TableRow>
                  ) : (
                    logs.map((log) => {
                      const config = statusConfig[log.status] || statusConfig.queued;
                      const StatusIcon = config.icon;
                      return (
                        <TableRow key={log.id} data-testid={`row-email-${log.id}`}>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm truncate max-w-[200px] block">{log.toAddresses}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm truncate max-w-[300px] block">{log.subject}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {log.sentAt ? format(new Date(log.sentAt), "MMM d, yyyy h:mm a") : format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.error ? (
                              <span className="text-xs text-red-600 dark:text-red-400 truncate max-w-[200px] block">{log.error}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
