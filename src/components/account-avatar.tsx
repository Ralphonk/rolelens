import type { User } from "@/lib/types";

export function AccountAvatar({
  user,
  className = "",
}: {
  user: User;
  className?: string;
}) {
  return user.avatarDataUrl ? (
    <img className={`avatar ${className}`} src={user.avatarDataUrl} alt="" />
  ) : (
    <span className={`avatar ${className}`}>
      {user.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
