import type { TrekContext } from "@/lib/types";

type TrekContextFormProps = {
  context: TrekContext;
  onChange: (context: TrekContext) => void;
  disabled?: boolean;
};

export function TrekContextForm({
  context,
  onChange,
  disabled = false,
}: TrekContextFormProps) {
  return (
    <section className="panel p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-storm-900">Trek Context</h2>
        <p className="mt-1 text-sm text-storm-600">
          These fields improve representative scenery search quality and make the day
          summaries read closer to the actual trek.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-storm-800">Trek / route name</span>
          <input
            type="text"
            disabled={disabled}
            value={context.routeDisplayName}
            onChange={(event) =>
              onChange({
                ...context,
                routeDisplayName: event.target.value,
              })
            }
            className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-storm-800">Region</span>
            <input
              type="text"
              disabled={disabled}
              value={context.region}
              onChange={(event) =>
                onChange({
                  ...context,
                  region: event.target.value,
                })
              }
              className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-storm-800">Country</span>
            <input
              type="text"
              disabled={disabled}
              value={context.country}
              onChange={(event) =>
                onChange({
                  ...context,
                  country: event.target.value,
                })
              }
              className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-storm-800">Season / month</span>
          <input
            type="text"
            disabled={disabled}
            value={context.season}
            onChange={(event) =>
              onChange({
                ...context,
                season: event.target.value,
              })
            }
            placeholder="October, post-monsoon"
            className="rounded-2xl border border-storm-200 bg-white px-4 py-3 text-sm text-storm-900 outline-none transition disabled:bg-storm-50 disabled:text-storm-500 focus:border-ridge-500"
          />
        </label>
      </div>
    </section>
  );
}
