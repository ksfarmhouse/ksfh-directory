import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import {
  formatBirthdayCountdown,
  formatBirthdayShort,
} from "@/lib/format";

type Props = {
  profileId: string;
  name: string;
  avatarUrl: string | null;
  birthday: string;
  daysUntil: number;
};

export function NextBirthdayCard({
  profileId,
  name,
  avatarUrl,
  birthday,
  daysUntil,
}: Props) {
  return (
    <Link
      href={`/profile/${profileId}`}
      className="flex items-center gap-3 sm:gap-4 bg-fh-green rounded-lg p-3 sm:p-4 hover:bg-fh-green/85 hover:shadow-md transition group"
    >
      <Avatar url={avatarUrl} name={name} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fh-gold font-bold">
          Next birthday
        </p>
        <h2 className="font-bold text-white truncate">{name}</h2>
        <p className="text-sm text-white/85 truncate">
          {formatBirthdayShort(birthday)} ·{" "}
          <span className="font-semibold text-fh-gold">
            {formatBirthdayCountdown(daysUntil)}
          </span>
        </p>
      </div>
      <span
        aria-hidden="true"
        className="text-fh-gold text-xl font-bold shrink-0 group-hover:translate-x-1 transition-transform"
      >
        →
      </span>
    </Link>
  );
}
