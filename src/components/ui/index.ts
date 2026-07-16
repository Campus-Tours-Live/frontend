/**
 * UI primitive library — reusable, design-system-backed building blocks.
 * Import from "@/components/ui". Styles live in globals.css; these components
 * own structure, props (variant/size/asChild) and behaviour only.
 */
export { Slot } from "./slot/Slot";
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
export { Alert, type AlertProps, type AlertVariant } from "./messages/Alert";
export { Banner, type BannerProps, type BannerVariant } from "./messages/Banner";
export { Nudge, type NudgeProps } from "./messages/Nudge";
export { Snack, type SnackProps, type SnackAction } from "./toast/Snack";
export { SnackbarProvider, SnackbarContext, type SnackOptions } from "./toast/SnackbarProvider";
export { useSnackbar } from "./toast/useSnackbar";
export { Card, type CardProps, type CardSize } from "./card/Card";
export { CardMedia, type CardMediaProps } from "./card/CardMedia";
export { CardHeader, type CardHeaderProps } from "./card/CardHeader";
export { CardContent, type CardContentProps } from "./card/CardContent";
export { CardActions, type CardActionsProps } from "./card/CardActions";
export { Panel, PanelHeader, type PanelProps, type PanelHeaderProps } from "./panel/Panel";
export {
  MemberCard,
  type MemberCardProps,
  type MemberCardItem,
  type MemberCardHighlight,
  type MemberRole,
} from "./data-display/MemberCard";
export { SectionHeading, type SectionHeadingProps } from "./page/SectionHeading";
export { PageContainer, type PageContainerProps, type PageWidth } from "./page/PageContainer";
export { PageHeader, type PageHeaderProps } from "./page/PageHeader";
export { InlineLoading, type InlineLoadingProps } from "./loading/InlineLoading";
export { Chip, type ChipProps } from "./actions/Chip";
export { Switch, type SwitchProps } from "./inputs/Switch";
export { Checkbox, type CheckboxProps } from "./inputs/Checkbox";
export { Radio, type RadioProps } from "./inputs/Radio";
export { Breadcrumb, type BreadcrumbProps } from "./navigation/Breadcrumb";
export { BreadcrumbItem, type BreadcrumbItemProps } from "./navigation/BreadcrumbItem";
export { Tag, type TagProps, type TagColor, type TagVariant } from "./data-display/Tag";
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentOption,
} from "./inputs/SegmentedControl";
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
} from "./inputs/Field";
export { FormLabel, type FormLabelProps, type FormLabelSize } from "./form/FormLabel";
export { FormHelperText, type FormHelperTextProps } from "./form/FormHelperText";
export { FormGroup, type FormGroupProps } from "./form/FormGroup";
export { FocusTrap, type FocusTrapProps } from "./focus/FocusTrap";
export { FocusGuard, type FocusGuardProps } from "./focus/FocusGuard";
export { GoogleMark } from "./google-mark/GoogleMark";
export { Heading, type HeadingProps, type HeadingSize } from "./typography/Heading";
export { Display, type DisplayProps, type DisplaySize } from "./typography/Display";
export { Body, type BodyProps, type BodySize } from "./typography/Body";
export { Caption, type CaptionProps } from "./typography/Caption";
export { type TextWeight, type TextColor } from "./typography/typography";
export { Divider, type DividerProps } from "./divider/Divider";
export { Grid, type GridProps } from "./grid/Grid";
export { GridColumn, type GridColumnProps, type GridColumnSpan } from "./grid/GridColumn";
export { List, type ListProps } from "./list/List";
export { ListItem, type ListItemProps } from "./list/ListItem";
export { Icon, type IconProps, type IconName } from "./icon/Icon";
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from "./actions/IconButton";
export { Spinner, type SpinnerProps } from "./loading/Spinner";
export { Skeleton, type SkeletonProps, type SkeletonVariant } from "./loading/Skeleton";
export { SkeletonText, type SkeletonTextProps } from "./loading/SkeletonText";
export { VisuallyHidden, type VisuallyHiddenProps } from "./visually-hidden/VisuallyHidden";
export { Collapse, type CollapseProps } from "./collapse/Collapse";
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
export { LineClamp, type LineClampProps } from "./line-clamp/LineClamp";
export { MonthYearPicker, type MonthYearPickerProps } from "./pickers/MonthYearPicker";
