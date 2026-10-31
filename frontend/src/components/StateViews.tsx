import {
  ArrowClockwiseRegular,
  BookRegular,
  WarningRegular,
} from "@fluentui/react-icons";
import {
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Skeleton,
  SkeletonItem,
  Text,
  Title3,
} from "@fluentui/react-components";
import { useTranslation } from "react-i18next";

interface LoadingStateProps {
  label: string;
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  title?: string;
}

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <Card className="state-card" aria-label={label}>
      <div className="state-heading">
        <BookRegular />
        <Text weight="semibold">{label}</Text>
      </div>
      <Skeleton aria-label={label}>
        <div className="skeleton-row">
          <SkeletonItem shape="circle" size={32} />
          <SkeletonItem shape="rectangle" size={20} />
        </div>
        <SkeletonItem shape="rectangle" size={14} />
        <SkeletonItem shape="rectangle" size={14} />
      </Skeleton>
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
  title,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <MessageBar intent="error" className="error-message">
      <WarningRegular />
      <MessageBarBody>
        <MessageBarTitle>{title ?? t("state.walkingUnavailable")}</MessageBarTitle>
        <Text>{message} {t("state.checkAgain")}</Text>
        <Button
          appearance="secondary"
          icon={<ArrowClockwiseRegular />}
          onClick={onRetry}
        >
          {t("state.retry")}
        </Button>
      </MessageBarBody>
    </MessageBar>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="empty-state">
      <BookRegular className="empty-state-icon" />
      <Title3>{title}</Title3>
      <Text>{message}</Text>
      <Button
        appearance="primary"
        icon={<ArrowClockwiseRegular />}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </Card>
  );
}
