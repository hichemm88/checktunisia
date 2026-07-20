import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Save, Eye, Send, MailCheck } from 'lucide-react';
import { adminEmailsApi, EmailTemplateItem } from '@/api/admin/emails';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useAuthStore } from '@/stores/authStore';

const PLACEHOLDER_HINTS: Record<string, string[]> = {
  welcome: ['first_name', 'last_name', 'hotel_name', 'role_label', 'cta_button'],
  account_suspended: ['name', 'reason'],
  payment_received: ['name', 'plan_name', 'expires_at', 'credentials_box'],
  subscription_reminder: ['name', 'plan_name', 'expires_at', 'days_remaining'],
  trial_ending: ['name', 'trial_message', 'cta_button'],
  invoice_available: ['name', 'plan_name', 'invoice_number', 'credentials_box', 'cta_button'],
};

const TemplateCard = ({ template }: { template: EmailTemplateItem }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ subject: template.subject, body_html: template.body_html });
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

  const saveMut = useMutation({
    mutationFn: () => adminEmailsApi.update(template.key, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-emails'] }); toast(t('adminEmails.templateSaved'), 'success'); },
    onError: (err) => setError(extractErrors(err)),
  });

  const sendTestMut = useAdminMutation({
    mutationFn: () => adminEmailsApi.sendTest(template.key),
    successMessage: t('adminEmails.testSent', { email: currentUser?.email ?? '' }),
  });

  const { data: preview, refetch: refetchPreview, isFetching: previewLoading } = useQuery({
    queryKey: ['admin-email-preview', template.key],
    queryFn: () => adminEmailsApi.preview(template.key),
    enabled: false,
  });

  const togglePreview = async () => {
    if (!showPreview) await refetchPreview();
    setShowPreview((s) => !s);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <p className="font-bold text-gray-900">{template.label}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${template.is_custom ? 'bg-[--qayed-cachet-dilue] text-[--qayed-cachet]' : 'bg-gray-100 text-gray-500'}`}>
          {template.is_custom ? t('adminEmails.custom') : t('adminEmails.default')}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <Input label={t('adminEmails.subject')} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        <div className="flex flex-col gap-1.5">
          <label className="label">{t('adminEmails.bodyHtml')}</label>
          <textarea
            className="input-field font-mono text-xs"
            rows={8}
            value={form.body_html}
            onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))}
          />
        </div>
        <p className="text-xs text-gray-400">
          {t('adminEmails.availableVariables')} {PLACEHOLDER_HINTS[template.key]?.map((v) => `{{${v}}}`).join(', ')}
        </p>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <Button size="sm" loading={saveMut.isPending} onClick={() => saveMut.mutate()} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {t('common.save')}</Button>
          <Button size="sm" variant="secondary" loading={previewLoading} onClick={togglePreview} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> {showPreview ? t('adminEmails.hide') : t('adminEmails.preview')}
          </Button>
          <Button size="sm" variant="ghost" loading={sendTestMut.isPending} onClick={() => sendTestMut.mutate()} className="gap-1.5">
            <MailCheck className="h-3.5 w-3.5" /> {t('adminEmails.sendTest')}
          </Button>
        </div>

        {showPreview && preview && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <iframe title={`preview-${template.key}`} srcDoc={preview.html} className="w-full" style={{ height: 480, border: 'none' }} />
          </div>
        )}
      </div>
    </Card>
  );
};

export const AdminEmailsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: templates, isLoading } = useQuery({ queryKey: ['admin-emails'], queryFn: adminEmailsApi.list });

  const remindersMut = useAdminMutation({
    mutationFn: adminEmailsApi.sendReminders,
    onSuccess: (res) => toast(t('adminEmails.remindersSent', { sent: res.sent, candidates: res.candidates }), 'success'),
  });

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900">{t('adminEmails.title')}</h1>
        <Button size="sm" variant="secondary" loading={remindersMut.isPending} onClick={() => remindersMut.mutate()} className="gap-1.5">
          <Send className="h-4 w-4" /> {t('adminEmails.sendRemindersNow')}
        </Button>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        {t('adminEmails.remindersHint')}
      </p>

      {isLoading && <ListSkeleton rows={4} height="h-24" />}
      <div className="flex flex-col gap-4">
        {templates?.map((tpl) => <TemplateCard key={tpl.key} template={tpl} />)}
      </div>
    </div>
  );
};
