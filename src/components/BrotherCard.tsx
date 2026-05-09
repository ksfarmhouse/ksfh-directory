import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import {
  daysUntilBirthday,
  formatBirthdayCountdown,
  formatBirthdayShort,
  formatPhone,
} from "@/lib/format";
import type { CardEmphasis } from "@/lib/sort";
import { formatLocation } from "@/lib/states";

type Profile = {
  id: string;
  full_name: string;
  pledge_class?: string;
  employment_status: string | null;
  position: string | null;
  university: string | null;
  year_in_school: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  birthday: string | null;
};

type Props = {
  profile: Profile;
  avatarUrl: string | null;
  emphasis?: CardEmphasis;
  showPledgeClass?: boolean;
};

export function BrotherCard({
  profile,
  avatarUrl,
  emphasis = "default",
  showPledgeClass = false,
}: Props) {
  return (
    <Link
      href={`/profile/${profile.id}`}
      className="flex items-start gap-3 bg-fh-green rounded-lg p-4 hover:bg-fh-green/85 hover:shadow-md transition group"
    >
      <Avatar url={avatarUrl} name={profile.full_name} size={44} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h2 className="font-bold text-white truncate">{profile.full_name}</h2>
          {showPledgeClass && profile.pledge_class && (
            <span className="text-xs font-semibold text-fh-gold tracking-wide shrink-0">
              {profile.pledge_class}
            </span>
          )}
        </div>
        <CardLines profile={profile} emphasis={emphasis} />
      </div>
      <span
        aria-hidden="true"
        className="text-fh-gold text-xl font-bold self-center shrink-0 group-hover:translate-x-1 transition-transform"
      >
        →
      </span>
    </Link>
  );
}

function CardLines({
  profile,
  emphasis,
}: {
  profile: Profile;
  emphasis: CardEmphasis;
}) {
  if (emphasis === "default") {
    const status = profile.employment_status;
    const isStudent = status === "student";
    const isPostgrad = status === "postgrad";
    const role = isStudent
      ? studentRole(profile.year_in_school, profile.university)
      : isPostgrad
        ? profile.university
        : profile.position;
    const emptyLabel = isStudent
      ? "No school listed"
      : isPostgrad
        ? "No school listed"
        : "No job listed";
    const loc = formatLocation(profile.city, profile.state);
    return (
      <>
        <p className="text-sm text-white/90 truncate">
          {role || <Empty>{emptyLabel}</Empty>}
        </p>
        <p className="text-sm text-white/75 mt-0.5 truncate">
          {loc || <Empty>No location listed</Empty>}
        </p>
        <p className="text-sm text-white/75 mt-0.5 truncate">
          {profile.phone ? (
            formatPhone(profile.phone)
          ) : (
            <Empty>No phone listed</Empty>
          )}
        </p>
      </>
    );
  }

  const big = "text-base font-semibold text-fh-gold truncate";

  if (emphasis === "city" || emphasis === "state") {
    const loc = formatLocation(profile.city, profile.state);
    return loc ? (
      <p className={big}>{loc}</p>
    ) : (
      <p className="text-sm truncate">
        <Empty>No location listed</Empty>
      </p>
    );
  }

  if (emphasis === "birthday") {
    const short = formatBirthdayShort(profile.birthday);
    return short ? (
      <p className={big}>{short}</p>
    ) : (
      <p className="text-sm truncate">
        <Empty>No birthday listed</Empty>
      </p>
    );
  }

  // next-birthday — keep two lines either way for consistent card height.
  const short = formatBirthdayShort(profile.birthday);
  const days = daysUntilBirthday(profile.birthday);
  if (!short || days === null) {
    return (
      <>
        <p className={big}>—</p>
        <p className="text-sm truncate">
          <Empty>No birthday listed</Empty>
        </p>
      </>
    );
  }
  return (
    <>
      <p className={big}>{short}</p>
      <p className="text-sm text-white/85 truncate">
        {formatBirthdayCountdown(days)}
      </p>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-white/40 italic">{children}</span>;
}

function studentRole(year: string | null, university: string | null): string | null {
  if (year && university) return `${year} at ${university}`;
  return year || university;
}
