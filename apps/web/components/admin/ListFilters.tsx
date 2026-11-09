export function ListFilters({ kind, params }: { kind: string; params: URLSearchParams }) {
  return (
    <>
      {kind === "activity" ? (
        <>
          <label>
            Actor account ID
            <input
              className="admin-control"
              name="actorUserId"
              maxLength={128}
              defaultValue={params.get("actorUserId") ?? ""}
            />
          </label>
          <label>
            Owner account ID
            <input
              className="admin-control"
              name="ownerId"
              maxLength={128}
              defaultValue={params.get("ownerId") ?? ""}
            />
          </label>
          <Select
            name="kind"
            title="Activity type"
            value={params.get("kind")}
            options={[
              ["visit", "Visit"],
              ["login", "Sign-in"],
              ["account.created", "Account created"],
              ["account.converted", "Guest converted"],
              ["tournament.created", "Tournament created"],
              ["business.action", "Business action"]
            ]}
          />
        </>
      ) : kind === "users" ? (
        <>
          <label>
            Search name, email or ID
            <input
              className="admin-control"
              type="search"
              name="q"
              maxLength={254}
              defaultValue={params.get("q") ?? ""}
            />
          </label>
          <Select
            name="accountType"
            title="Account type"
            value={params.get("accountType")}
            options={[
              ["registered", "Registered"],
              ["guest", "Guest"]
            ]}
          />
          <Select
            name="verification"
            title="Email verification"
            value={params.get("verification")}
            options={[
              ["verified", "Verified"],
              ["unverified", "Unverified"]
            ]}
          />
        </>
      ) : kind === "tournaments" ? (
        <>
          <label>
            Owner account ID
            <input
              className="admin-control"
              name="ownerId"
              maxLength={128}
              defaultValue={params.get("ownerId") ?? ""}
            />
          </label>
          <Select
            name="mode"
            title="Mode"
            value={params.get("mode")}
            options={[
              ["AMERICANO", "Americano"],
              ["MEXICANO", "Mexicano"],
              ["KING_OF_THE_COURT", "King of the Court"]
            ]}
          />
          <Select
            name="variant"
            title="Variant"
            value={params.get("variant")}
            options={[
              ["CLASSIC", "Classic"],
              ["MIXED", "Mixed"],
              ["TEAM", "Team"]
            ]}
          />
          <Select
            name="status"
            title="Status"
            value={params.get("status")}
            options={[
              ["completed", "Completed"],
              ["in-progress", "In progress"],
              ["not-started", "Not started"]
            ]}
          />
        </>
      ) : null}
    </>
  );
}
export function Select({
  name,
  title,
  value,
  options,
  onChange
}: {
  name: string;
  title: string;
  value: string | null;
  options: string[][];
  onChange?(value: string): void;
}) {
  return (
    <label>
      {title}
      <select
        name={name}
        className="admin-control"
        defaultValue={value ?? ""}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {name !== "sort" && name !== "period" ? <option value="">All</option> : null}
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
