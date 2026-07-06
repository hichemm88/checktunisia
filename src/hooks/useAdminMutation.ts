import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
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
    onSuccess: (data, variables, context) => {
      if (successMessage) toast(successMessage, 'success');
      onSuccess?.(data, variables, context);
    },
    onError: (err, variables, context) => {
      toast(extractErrors(err), 'error');
      onError?.(err, variables, context);
    },
  });
}
