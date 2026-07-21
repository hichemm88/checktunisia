import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

interface AdminMutationOptions<TData, TVariables> extends UseMutationOptions<TData, unknown, TVariables> {
  /** Shown as a success toast when the mutation resolves. Omit for silent success (e.g. inline UI already reflects it). */
  successMessage?: string;
}

/**
 * Wraps useMutation for admin "action" mutations (suspend/activate/delete/status-change/
 * mark-paid...) so every one of them surfaces a failure — several of these were failing
 * silently before this hook existed. Not meant for form-creation mutations, which use
 * inline field errors (extractErrors + local state) instead of a toast.
 */
export function useAdminMutation<TData, TVariables = void>(
  options: AdminMutationOptions<TData, TVariables>,
): UseMutationResult<TData, unknown, TVariables> {
  const { toast } = useToast();
  const { successMessage, onSuccess, onError, ...rest } = options;

  return useMutation<TData, unknown, TVariables>({
    ...rest,
    // Rest params : on relaie tous les arguments de rappel quelle que soit leur
    // arité (elle varie selon la version de React Query).
    onSuccess: (...args: Parameters<NonNullable<typeof onSuccess>>) => {
      if (successMessage) toast(successMessage, 'success');
      onSuccess?.(...args);
    },
    onError: (...args: Parameters<NonNullable<typeof onError>>) => {
      toast(extractErrors(args[0]), 'error');
      onError?.(...args);
    },
  });
}
