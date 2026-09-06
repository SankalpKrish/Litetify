/** Reusable loading/error/empty state displays for data views */

interface LoadingProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-desc">{message}</div>
    </div>
  );
}

interface ErrorProps {
  title?: string;
  message?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
}: ErrorProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{message ?? 'Try again later.'}</div>
    </div>
  );
}
