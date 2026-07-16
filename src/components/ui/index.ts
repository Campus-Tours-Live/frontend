/**
 * UI primitive library — reusable, design-system-backed building blocks.
 * Import from "@/components/ui". Styles live in globals.css; these components
 * own structure, props (variant/size/asChild) and behaviour only.
 */
export { Slot } from "./utils/Slot";
export {
  Button,
  buttonClasses,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./actions/Button";
export { Link, type LinkProps } from "./actions/Link";
export { Badge, StatusBadge, type BadgeVariant, type StatusVariant } from "./data-display/Badge";
export { Rating, type RatingProps, type RatingSize } from "./data-display/Rating";
export {
  RatingStar,
  type RatingStarProps,
  type RatingStarVariant,
} from "./data-display/RatingStar";
export { Alert, type AlertProps, type AlertVariant } from "./feedback/Alert";
export { Banner, type BannerProps, type BannerVariant } from "./feedback/Banner";
export { Nudge, type NudgeProps } from "./feedback/Nudge";
export { Snack, type SnackProps, type SnackAction } from "./feedback/Snack";
export { SnackbarProvider, SnackbarContext, type SnackOptions } from "./feedback/SnackbarProvider";
export { useSnackbar } from "./feedback/useSnackbar";
export { Card, type CardProps, type CardSize } from "./layout/Card";
export { CardMedia, type CardMediaProps } from "./layout/CardMedia";
export { CardHeader, type CardHeaderProps } from "./layout/CardHeader";
export { CardContent, type CardContentProps } from "./layout/CardContent";
export { CardActions, type CardActionsProps } from "./layout/CardActions";
export { Panel, PanelHeader, type PanelProps, type PanelHeaderProps } from "./layout/Panel";
export {
  MemberCard,
  type MemberCardProps,
  type MemberCardItem,
  type MemberCardHighlight,
  type MemberRole,
} from "./data-display/MemberCard";
export { SectionHeading, type SectionHeadingProps } from "./layout/SectionHeading";
export { PageContainer, type PageContainerProps, type PageWidth } from "./layout/PageContainer";
export { PageHeader, type PageHeaderProps } from "./layout/PageHeader";
export { InlineLoading, type InlineLoadingProps } from "./feedback/InlineLoading";
export { Chip, type ChipProps } from "./actions/Chip";
export { Switch, type SwitchProps } from "./forms/Switch";
export { Checkbox, type CheckboxProps } from "./forms/Checkbox";
export { Radio, type RadioProps } from "./forms/Radio";
export { Breadcrumb, type BreadcrumbProps } from "./navigation/Breadcrumb";
export { BreadcrumbItem, type BreadcrumbItemProps } from "./navigation/BreadcrumbItem";
export { Tag, type TagProps, type TagColor, type TagVariant } from "./data-display/Tag";
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentOption,
} from "./forms/SegmentedControl";
export { ButtonGroup, type ButtonGroupProps } from "./actions/ButtonGroup";
export { ButtonRow, type ButtonRowProps, type ButtonRowAlign } from "./actions/ButtonRow";
export {
  Field,
  TextField,
  Textarea,
  SelectField,
  type FieldProps,
  type FieldSize,
  type TextFieldProps,
  type TextareaProps,
  type SelectFieldProps,
} from "./forms/Field";
export { FormLabel, type FormLabelProps, type FormLabelSize } from "./forms/FormLabel";
export { FormHelperText, type FormHelperTextProps } from "./forms/FormHelperText";
export { FormGroup, type FormGroupProps } from "./forms/FormGroup";
export { FocusTrap, type FocusTrapProps } from "./utils/FocusTrap";
export { FocusGuard, type FocusGuardProps } from "./utils/FocusGuard";
export { GoogleMark } from "./utils/GoogleMark";
export { Heading, type HeadingProps, type HeadingSize } from "./typography/Heading";
export { Display, type DisplayProps, type DisplaySize } from "./typography/Display";
export { Body, type BodyProps, type BodySize } from "./typography/Body";
export { Caption, type CaptionProps } from "./typography/Caption";
export { type TextWeight, type TextColor } from "./typography/typography";
export { Divider, type DividerProps } from "./layout/Divider";
export { Grid, type GridProps } from "./layout/Grid";
export { GridColumn, type GridColumnProps, type GridColumnSpan } from "./layout/GridColumn";
export { List, type ListProps } from "./layout/List";
export { ListItem, type ListItemProps } from "./layout/ListItem";
export { Icon, type IconProps, type IconName } from "./utils/Icon";
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from "./actions/IconButton";
export { Spinner, type SpinnerProps } from "./feedback/Spinner";
export { Skeleton, type SkeletonProps, type SkeletonVariant } from "./feedback/Skeleton";
export { SkeletonText, type SkeletonTextProps } from "./feedback/SkeletonText";
export { VisuallyHidden, type VisuallyHiddenProps } from "./utils/VisuallyHidden";
export { Collapse, type CollapseProps } from "./utils/Collapse";
export {
  WizardFooter,
  type WizardFooterProps,
  type WizardFooterButtonProps,
} from "./navigation/WizardFooter";
export { MenuItem, type MenuItemProps, type MenuItemVariant } from "./overlays/MenuItem";
export { MenuSection, type MenuSectionProps } from "./overlays/Menu";
export { Modal, type ModalProps } from "./overlays/Modal";
export { Drawer, type DrawerProps, type DrawerSide, type DrawerSize } from "./overlays/Drawer";
export { TimePicker, type TimePickerProps, type TimeParts } from "./pickers/TimePicker";
export { Calendar, type CalendarProps, type CalendarDay, type Weekday } from "./pickers/Calendar";
export { Popover, type PopoverProps, type PopoverAlign } from "./overlays/Popover";
export { LineClamp, type LineClampProps } from "./utils/LineClamp";
export { MonthYearPicker, type MonthYearPickerProps } from "./pickers/MonthYearPicker";
