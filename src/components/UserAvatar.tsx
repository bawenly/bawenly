type Props = {
  name: string;
  avatarUrl: string | null;
  className?: string;
};

export function UserAvatar({ name, avatarUrl, className = 'avatar' }: Props) {
  if (avatarUrl) {
    return <img className={className} src={avatarUrl} alt={`Аватар ${name || 'пользователя'}`} />;
  }

  return (
    <span className={`${className} ${className}--fallback`} aria-hidden="true">
      {name.charAt(0).toUpperCase() || '•'}
    </span>
  );
}
