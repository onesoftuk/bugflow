import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Users, Shield } from "lucide-react";
import { format } from "date-fns";

type SafeUser = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-700 dark:text-red-300",
  dev: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  user: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (user?.role !== "admin") return <Redirect to="/" />;

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-users-title">
            <Users className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user roles and access</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-20" /></TableCell>)}</TableRow>
                    ))
                  ) : !users || users.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><p className="text-muted-foreground">No users found</p></TableCell></TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{u.name || u.username}</p>
                              <p className="text-xs text-muted-foreground">@{u.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-sm">{u.email}</span></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${roleColors[u.role]}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(u.createdAt), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs" data-testid={`select-role-${u.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="dev">Dev</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
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
