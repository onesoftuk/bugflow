import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Settings, Mail, Save, Send } from "lucide-react";
import { useState, useEffect } from "react";

type AppSettings = {
  id: string;
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPass: string;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  adminRecipients: string;
};

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (user?.role !== "admin") return <Redirect to="/" />;

  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/admin/settings"],
  });

  const [form, setForm] = useState({
    smtpEnabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: "",
    smtpPass: "",
    smtpFromName: "",
    smtpFromEmail: "",
    adminRecipients: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        smtpEnabled: settings.smtpEnabled,
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpSecure: settings.smtpSecure,
        smtpUser: settings.smtpUser || "",
        smtpPass: settings.smtpPass || "",
        smtpFromName: settings.smtpFromName || "",
        smtpFromEmail: settings.smtpFromEmail || "",
        adminRecipients: settings.adminRecipients || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/settings", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/settings/test-email");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.success ? "Test email sent" : "Test email failed" });
    },
    onError: (error: Error) => {
      toast({ title: "Test email failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6"><div className="h-8 w-48 bg-muted rounded animate-pulse" /></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-settings-title">
            <Settings className="h-6 w-6 text-primary" />
            Admin Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure email and notification settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications (SendGrid)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Email notifications are sent via the connected SendGrid integration. The SMTP settings below are for optional custom SMTP configuration.
            </p>

            <div className="flex items-center gap-2">
              <Switch
                id="smtp-enabled"
                checked={form.smtpEnabled}
                onCheckedChange={(v) => setForm(f => ({ ...f, smtpEnabled: v }))}
                data-testid="switch-smtp-enabled"
              />
              <Label htmlFor="smtp-enabled">Enable custom SMTP (overrides SendGrid)</Label>
            </div>

            {form.smtpEnabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input value={form.smtpHost} onChange={(e) => setForm(f => ({ ...f, smtpHost: e.target.value }))} placeholder="smtp.example.com" data-testid="input-smtp-host" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input type="number" value={form.smtpPort} onChange={(e) => setForm(f => ({ ...f, smtpPort: parseInt(e.target.value) || 587 }))} data-testid="input-smtp-port" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP User</Label>
                    <Input value={form.smtpUser} onChange={(e) => setForm(f => ({ ...f, smtpUser: e.target.value }))} data-testid="input-smtp-user" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Password</Label>
                    <Input type="password" value={form.smtpPass} onChange={(e) => setForm(f => ({ ...f, smtpPass: e.target.value }))} data-testid="input-smtp-pass" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="smtp-secure" checked={form.smtpSecure} onCheckedChange={(v) => setForm(f => ({ ...f, smtpSecure: v }))} data-testid="switch-smtp-secure" />
                  <Label htmlFor="smtp-secure">Use TLS/SSL</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Name</Label>
                    <Input value={form.smtpFromName} onChange={(e) => setForm(f => ({ ...f, smtpFromName: e.target.value }))} placeholder="BugFlow" data-testid="input-smtp-from-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>From Email</Label>
                    <Input value={form.smtpFromEmail} onChange={(e) => setForm(f => ({ ...f, smtpFromEmail: e.target.value }))} placeholder="noreply@example.com" data-testid="input-smtp-from-email" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Admin Notification Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comma-separated list of email addresses that receive admin notifications (new tickets, status changes, etc.)
            </p>
            <Textarea
              value={form.adminRecipients}
              onChange={(e) => setForm(f => ({ ...f, adminRecipients: e.target.value }))}
              placeholder="admin1@example.com,admin2@example.com"
              className="min-h-[80px] resize-y"
              data-testid="input-admin-recipients"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={() => testEmailMutation.mutate()} disabled={testEmailMutation.isPending} data-testid="button-test-email">
            <Send className="h-4 w-4 mr-2" />
            {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
