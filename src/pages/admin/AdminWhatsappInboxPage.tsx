import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Inbox,
  Search,
  Send,
  Lock,
  FileText,
  Paperclip,
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
} from 'lucide-react';
import {
  adminWhatsappInboxApi,
  type InboxConversation,
  type InboxEntry,
  type InboxFilter,
  type InboxReplyCapability,
} from '@/api/admin/whatsappInbox';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

const FILTERS: InboxFilter[] = ['all', 'unread', 'awaiting', 'replied'];

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/**
 * Le nom affiché d'un fil.
 *
 * Trois niveaux, dans cet ordre : l'agent ENREGISTRÉ (la seule identité que
 * nous ayons vérifiée), puis le nom de profil WhatsApp (choisi par la personne
 * elle-même, donc indicatif), puis le numéro. Inverser les deux premiers
 * ferait passer un pseudonyme pour une identité officielle.
 */
const threadName = (c: InboxConversation) => c.authority?.name || c.contact_name || c.phone;

/** Accusés d'un message sortant : envoyé, remis, lu. */
const DeliveryTicks = ({ status }: { status: string | null }) => {
  const { t } = useTranslation();
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: 'var(--qayed-erreur)' }}>
        <AlertTriangle className="h-3 w-3" /> {t('whatsappInbox.status.failed')}
      </span>
    );
  }
  if (status === 'read') {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: 'var(--qayed-cachet)' }}>
        <CheckCheck className="h-3 w-3" /> {t('whatsappInbox.status.read')}
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-1 text-gray-400">
        <CheckCheck className="h-3 w-3" /> {t('whatsappInbox.status.delivered')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-gray-400">
      <Check className="h-3 w-3" /> {t('whatsappInbox.status.sent')}
    </span>
  );
};

/** Une fiche de police dans la chronologie : un événement, pas une bulle. */
const FicheBubble = ({ entry }: { entry: Extract<InboxEntry, { kind: 'fiche' }> }) => {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-ee-sm border border-gray-200 bg-white p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--qayed-cachet)' }}>
          <FileText className="h-3.5 w-3.5" />
          {entry.is_test ? t('whatsappInbox.testFiche') : t('whatsappInbox.ficheSent')}
        </p>
        {entry.guest && <p className="mt-1 text-sm font-semibold text-gray-800">{entry.guest}</p>}
        {entry.establishment && <p className="text-xs text-gray-500">{entry.establishment}</p>}
        {entry.error && (
          <p className="mt-1 text-xs" style={{ color: 'var(--qayed-erreur)' }}>
            {entry.error}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
          <span>{formatTime(entry.at)}</span>
          <DeliveryTicks status={entry.error ? 'failed' : entry.delivery_status} />
          {entry.read_at && <span>{t('whatsappInbox.readAt', { at: formatTime(entry.read_at) })}</span>}
        </div>
      </div>
    </div>
  );
};

/** Un texte : réponse d'un agent (à gauche) ou de l'administration (à droite). */
const MessageBubble = ({ entry }: { entry: Extract<InboxEntry, { kind: 'message' }> }) => {
  const { t } = useTranslation();
  const inbound = entry.direction === 'inbound';

  return (
    <div className={inbound ? 'flex justify-start' : 'flex justify-end'}>
      <div
        className={`max-w-[80%] rounded-2xl p-3 ${inbound ? 'rounded-ss-sm' : 'rounded-ee-sm'}`}
        style={
          inbound
            ? { background: 'var(--qayed-gris-100, #f3f4f6)' }
            : { background: 'var(--qayed-cachet)', color: '#fff' }
        }
      >
        {entry.body ? (
          <p className="whitespace-pre-wrap break-words text-sm">{entry.body}</p>
        ) : (
          // Aucun texte inventé pour un média : le type est ce qu'on sait.
          <p className="flex items-center gap-1.5 text-sm italic opacity-80">
            <Paperclip className="h-3.5 w-3.5" />
            {t(`whatsappInbox.mediaType.${entry.type}`, { defaultValue: entry.type })}
            {entry.media_filename ? ` · ${entry.media_filename}` : ''}
          </p>
        )}
        <div
          className={`mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] ${inbound ? 'text-gray-400' : 'text-white/70'}`}
        >
          <span>{formatTime(entry.at)}</span>
          {!inbound && <DeliveryTicks status={entry.error ? 'failed' : entry.status} />}
          {entry.sent_by && <span>{entry.sent_by}</span>}
        </div>
        {entry.error && !inbound && <p className="mt-1 text-[11px] text-white/90">{entry.error}</p>}
      </div>
    </div>
  );
};

/**
 * Zone de réponse.
 *
 * Fermée par défaut, et fermée avec sa RAISON : hors des 24 h qui suivent un
 * message entrant, Meta refuse tout texte libre. Afficher un champ de saisie
 * actif serait promettre un envoi qui échouera — et, pour un canal qui porte
 * une obligation légale, laisser croire qu'une consigne est partie.
 */
const ReplyBox = ({
  capability,
  onSend,
  pending,
}: {
  capability: InboxReplyCapability;
  onSend: (message: string) => void;
  pending: boolean;
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  if (!capability.allowed) {
    return (
      <div
        className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
        style={{ background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }}
      >
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">
            {t(
              capability.reason === 'NEVER_REPLIED'
                ? 'whatsappInbox.windowNeverOpened'
                : 'whatsappInbox.windowClosed',
            )}
          </p>
          {/* La méthode autorisée, puisque la libre ne l'est pas. */}
          <p className="mt-0.5 text-xs opacity-90">{t('whatsappInbox.windowClosedHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const message = value.trim();
        if (message === '' || pending) return;
        onSend(message);
        setValue('');
      }}
    >
      <textarea
        className="input min-h-[80px] resize-y"
        maxLength={capability.max_length}
        placeholder={t('whatsappInbox.replyPlaceholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t('whatsappInbox.replyPlaceholder')}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          {t('whatsappInbox.windowOpenUntil', { at: formatTime(capability.window_closes_at) })}
        </p>
        <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={pending || value.trim() === ''}>
          <Send className="h-4 w-4" />
          {t('whatsappInbox.send')}
        </button>
      </div>
    </form>
  );
};

export const AdminWhatsappInboxPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const timelineEnd = useRef<HTMLDivElement>(null);

  // La recherche part au clavier : une requête par frappe interrogerait la
  // base à chaque lettre pour un résultat que personne n'a le temps de lire.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  /*
   * ── Pourquoi cet ecran se rafraichit tout seul ──────────────────────────
   *
   * Il n'interrogeait le serveur qu'au chargement. Verifie sur un message
   * entrant synthetique : la reponse d'une autorite arrivait en base et
   * n'apparaissait JAMAIS a l'ecran — il fallait recharger la page pour la
   * voir. Sur une boite de reception, c'est la fonction meme qui manque.
   *
   * Ce n'est pas qu'un confort. La reponse libre n'est possible que dans les
   * 24 h qui suivent le message de l'agent — regle de Meta, rappelee en
   * en-tete de cet ecran. Une reponse qu'on ne voit pas consomme en silence la
   * fenetre pendant laquelle on pouvait encore y repondre.
   *
   * 30 s : le meme rythme que les autres ecrans de veille du produit
   * (SecurityPage, PendingSetupPage). React Query suspend le rythme quand
   * l'onglet n'est pas au premier plan — le cout reste donc borne aux ecrans
   * reellement regardes.
   */
  const RYTHME_VEILLE_MS = 30_000;

  const { data: list, isLoading } = useQuery({
    queryKey: ['admin-whatsapp-inbox', debounced, filter],
    queryFn: () => adminWhatsappInboxApi.list({ search: debounced || undefined, filter }),
    refetchInterval: RYTHME_VEILLE_MS,
  });

  const { data: thread, isLoading: loadingThread } = useQuery({
    queryKey: ['admin-whatsapp-thread', selected],
    queryFn: () => adminWhatsappInboxApi.thread(selected as string),
    enabled: selected !== null,
    // Le fil ouvert aussi : sans cela, l'operateur qui attend une reponse
    // precise resterait devant une conversation figee.
    refetchInterval: RYTHME_VEILLE_MS,
  });

  useEffect(() => {
    timelineEnd.current?.scrollIntoView({ block: 'end' });
  }, [thread]);

  const reply = useMutation({
    mutationFn: (message: string) => adminWhatsappInboxApi.reply(selected as string, message),
    onSuccess: () => {
      toast(t('whatsappInbox.replySent'));
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-thread', selected] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-inbox'] });
    },
    onError: (error: unknown) => {
      // Le motif vient du serveur : c'est lui qui connaît la règle Meta.
      const message =
        (error as { response?: { data?: { errors?: Array<{ message?: string }> } } })?.response?.data?.errors?.[0]
          ?.message ?? t('whatsappInbox.replyFailed');
      toast(message, 'error');
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-thread', selected] });
    },
  });

  const conversations = list?.data ?? [];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <Inbox className="h-5 w-5" style={{ color: 'var(--qayed-cachet)' }} />
        <h1 className="qayed-display text-xl text-gray-900">{t('whatsappInbox.pageTitle')}</h1>
        {(list?.meta.unread_total ?? 0) > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
            style={{ background: 'var(--qayed-cachet)' }}
          >
            {list?.meta.unread_total}
          </span>
        )}
      </div>

      <p className="-mt-4 text-sm text-gray-500">{t('whatsappInbox.pageHint')}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* ── Liste des fils ─────────────────────────────────────────── */}
        <div className="card flex max-h-[70vh] flex-col p-0">
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input ps-9"
                placeholder={t('whatsappInbox.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('whatsappInbox.searchPlaceholder')}
              />
            </div>
            <div className="mt-2 inline-flex rounded-xl border border-gray-200 bg-white p-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${filter === f ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                  style={filter === f ? { background: 'var(--qayed-cachet)' } : undefined}
                >
                  {t(`whatsappInbox.filter.${f}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && <ListSkeleton rows={5} height="h-16" />}
            {!isLoading && conversations.length === 0 && (
              <EmptyState title={t('whatsappInbox.emptyTitle')} hint={t('whatsappInbox.emptyHint')} />
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                aria-current={selected === c.id}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-gray-50 px-4 py-3 text-start transition-colors hover:bg-gray-50 ${selected === c.id ? 'bg-gray-50' : ''}`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">{threadName(c)}</span>
                  {c.unread_count > 0 && (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: 'var(--qayed-cachet)' }}
                    >
                      {c.unread_count}
                    </span>
                  )}
                </span>
                {c.authority?.organization && (
                  <span className="truncate text-xs text-gray-500">{c.authority.organization}</span>
                )}
                <span className="line-clamp-1 w-full text-xs text-gray-400">
                  {c.last_message_direction === 'outbound' ? '↗ ' : ''}
                  {c.last_message_preview ?? '—'}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  {formatTime(c.last_message_at)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Fil sélectionné ────────────────────────────────────────── */}
        <div className="card flex max-h-[70vh] flex-col p-0">
          {selected === null && (
            <EmptyState title={t('whatsappInbox.noThreadTitle')} hint={t('whatsappInbox.noThreadHint')} />
          )}

          {selected !== null && loadingThread && <ListSkeleton rows={4} height="h-16" />}

          {selected !== null && thread && (
            <>
              <div className="border-b border-gray-100 p-4">
                <p className="text-sm font-bold text-gray-900">{threadName(thread.conversation)}</p>
                <p className="font-mono text-xs text-gray-500">+{thread.conversation.phone}</p>
                {thread.conversation.authority && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[
                      thread.conversation.authority.organization,
                      thread.conversation.authority.rank,
                      thread.conversation.authority.badge_number,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {!thread.conversation.authority && (
                  // Dit explicitement que ce numéro n'est rattaché à aucun agent
                  // enregistré — un fil anonyme ne doit pas passer pour un agent.
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--qayed-vigilance-texte)' }}>
                    {t('whatsappInbox.unknownNumber')}
                  </p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                {thread.timeline.length === 0 && (
                  <EmptyState title={t('whatsappInbox.emptyThreadTitle')} hint={t('whatsappInbox.emptyThreadHint')} />
                )}
                {thread.timeline.map((entry) =>
                  entry.kind === 'fiche' ? (
                    <FicheBubble key={`f-${entry.id}`} entry={entry} />
                  ) : (
                    <MessageBubble key={`m-${entry.id}`} entry={entry} />
                  ),
                )}
                <div ref={timelineEnd} />
              </div>

              <div className="border-t border-gray-100 p-4">
                <ReplyBox
                  capability={thread.reply}
                  pending={reply.isPending}
                  onSend={(message) => reply.mutate(message)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
