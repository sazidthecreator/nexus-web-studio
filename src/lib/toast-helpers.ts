// Canonical toast wrappers — every async action in the app goes through one of these.
// Rule: never call `toast()` directly in a component. Use these helpers so errors,
// optimistic UI, and destructive confirms behave consistently.
import { toast } from "sonner";

type Messages = { loading: string; success: string; error: string };

/** Standard: loading → success | error. Returns the result, or null on failure. */
export async function saveWithToast<T>(
  fn: () => Promise<T>,
  messages: Messages,
): Promise<T | null> {
  const id = toast.loading(messages.loading);
  try {
    const result = await fn();
    toast.success(messages.success, { id, duration: 2000 });
    return result;
  } catch (e) {
    const description = e instanceof Error ? e.message : String(e);
    toast.error(messages.error, {
      id,
      description,
      duration: 4000,
      action: { label: "Dismiss", onClick: () => toast.dismiss(id) },
    });
    return null;
  }
}

/** Optimistic: apply immediately, roll back if the server call fails. */
export async function optimisticWithToast(
  applyFn: () => void,
  rollbackFn: () => void,
  serverFn: () => Promise<unknown>,
  errorMessage: string,
): Promise<void> {
  applyFn();
  try {
    await serverFn();
  } catch (e) {
    rollbackFn();
    const description = e instanceof Error ? e.message : String(e);
    toast.error(errorMessage, { description });
  }
}

/** Destructive: confirm via toast → loading → success/error. */
export async function destructiveWithToast(
  fn: () => Promise<void>,
  messages: { confirm: string; loading: string; success: string; error: string },
): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    const id = toast(messages.confirm, {
      duration: Infinity,
      action: {
        label: "Delete",
        onClick: () => {
          toast.dismiss(id);
          resolve(true);
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.dismiss(id);
          resolve(false);
        },
      },
    });
  });
  if (!confirmed) return;
  await saveWithToast(fn, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}
