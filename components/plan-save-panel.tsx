import type { PlanOwnerMode } from "@/lib/types";

type PlanSavePanelProps = {
  title: string;
  onTitleChange: (title: string) => void;
  ownerMode: PlanOwnerMode;
  isAuthenticated: boolean;
  currentPath: string;
  dirty: boolean;
  lastSavedAt: string | null;
  planId: string | null;
  shareToken: string | null;
  isSaving: boolean;
  isDeleting: boolean;
  message: string | null;
  error: string | null;
  onSave: () => void;
  onSaveAsCopy: () => void;
  onDelete: () => void;
};

function formatSavedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PlanSavePanel({
  title,
  onTitleChange,
  ownerMode,
  isAuthenticated,
  currentPath,
  dirty,
  lastSavedAt,
  planId,
  shareToken,
  isSaving,
  isDeleting,
  message,
  error,
  onSave,
  onSaveAsCopy,
  onDelete,
}: PlanSavePanelProps) {
  const isReadOnly = ownerMode === "shared-readonly";
  const sharePath = shareToken ? `/share/${shareToken}` : null;
  const canPersist = isAuthenticated && !isReadOnly;

  return (
    <section className="panel p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-storm-900">Plan Persistence</h2>
          <p className="mt-1 text-sm text-storm-600">
            Save private drafts, reopen them later, and publish read-only share links.
          </p>
        </div>
        {dirty ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Unsaved changes
          </span>
        ) : null}
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-storm-800">Plan title</span>
          <input
            type="text"
            disabled={isReadOnly}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
          />
        </label>

        <div className="rounded-[1.5rem] bg-storm-50 px-4 py-3 text-sm text-storm-700">
          {isReadOnly
            ? "This is a public read-only share view. Open the planner separately if you want to make edits."
            : lastSavedAt
              ? `Last saved ${formatSavedAt(lastSavedAt)}`
              : "This plan has not been saved yet."}
        </div>

        {!canPersist ? (
          <div className="rounded-[1.5rem] border border-ridge-200 bg-ridge-50 px-4 py-3 text-sm text-ridge-900">
            {isReadOnly ? (
              "Shared pages do not expose owner-only save controls."
            ) : (
              <>
                Sign in to save this trek plan.{" "}
                <a
                  href={`/login?callbackUrl=${encodeURIComponent(currentPath)}`}
                  className="font-semibold underline"
                >
                  Log in
                </a>{" "}
                or{" "}
                <a
                  href={`/signup?callbackUrl=${encodeURIComponent(currentPath)}`}
                  className="font-semibold underline"
                >
                  create an account
                </a>
                .
              </>
            )}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-[1.5rem] border border-ridge-200 bg-ridge-50 px-4 py-3 text-sm text-ridge-900">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        {canPersist ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={onSave}
              className="rounded-full bg-ridge-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ridge-800 disabled:cursor-not-allowed disabled:bg-storm-300"
            >
              {isSaving ? "Saving..." : planId ? "Save changes" : "Save plan"}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={onSaveAsCopy}
              className="rounded-full border border-storm-200 px-4 py-2 text-sm font-medium text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900 disabled:cursor-not-allowed disabled:text-storm-400"
            >
              Save as copy
            </button>
            {planId ? (
              <button
                type="button"
                disabled={isSaving || isDeleting}
                onClick={onDelete}
                className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
            {sharePath ? (
              <a
                href={sharePath}
                className="rounded-full border border-storm-200 px-4 py-2 text-sm font-medium text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
              >
                Open shared view
              </a>
            ) : null}
          </div>
        ) : sharePath ? (
          <a
            href={sharePath}
            className="inline-flex w-fit rounded-full border border-storm-200 px-4 py-2 text-sm font-medium text-storm-700 transition hover:border-ridge-400 hover:text-ridge-900"
          >
            Open shared view
          </a>
        ) : null}
      </div>
    </section>
  );
}
