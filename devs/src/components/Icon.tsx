import React from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBars,
  FaCalendar,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaExchangeAlt,
  FaExclamationCircle,
  FaMapMarkerAlt,
  FaSearch,
  FaShare,
  FaSpinner,
  FaSyncAlt,
  FaTicketAlt,
  FaTimes,
  FaUniversity,
} from "react-icons/fa";
import {
  TbArmchair,
  TbBasket,
  TbBus,
  TbCalendar,
  TbCoin,
  TbDiamond,
  TbDiscount2,
  TbFileText,
  TbHeadset,
  TbMapPin,
  TbMoodSmile,
  TbRoute,
  TbSearch,
  TbTicket,
} from "react-icons/tb";

// Every icon of the site is an SVG that travels inside the JavaScript, so none is fetched
// from another host and none can go missing offline. They come from the react-icons package:
// - the solid ones are Font Awesome 5 Free (icons under CC BY 4.0),
// - the line ones are Tabler Icons (MIT).
// Only the icons named here end up in the bundle. (written 2026-10-13)

const solid = {
  "arrow-left": FaArrowLeft,
  "arrow-right": FaArrowRight,
  bars: FaBars,
  calendar: FaCalendar,
  "calendar-alt": FaCalendarAlt,
  "check-circle": FaCheckCircle,
  "chevron-down": FaChevronDown,
  "chevron-left": FaChevronLeft,
  "chevron-right": FaChevronRight,
  "exchange-alt": FaExchangeAlt,
  "exclamation-circle": FaExclamationCircle,
  "map-marker-alt": FaMapMarkerAlt,
  search: FaSearch,
  share: FaShare,
  spinner: FaSpinner,
  "sync-alt": FaSyncAlt,
  "ticket-alt": FaTicketAlt,
  times: FaTimes,
  university: FaUniversity,
};

const line = {
  smile: TbMoodSmile,
  sit: TbArmchair,
  bus: TbBus,
  direction: TbRoute,
  paper: TbFileText,
  magnifier: TbSearch,
  "circle-dollar": TbCoin,
  discount: TbDiscount2,
  basket: TbBasket,
  headphone: TbHeadset,
  diamond: TbDiamond,
  location: TbMapPin,
  date: TbCalendar,
  ticket: TbTicket,
};

export type SolidIconName = keyof typeof solid;
export type LineIconName = keyof typeof line;

interface Props extends React.HTMLAttributes<HTMLElement> {
  name: SolidIconName;
}

// A solid icon inside an <i>. The <i> keeps the class names the icon font used to need
// (`fas fa-search`), because the stylesheets place and colour icons through them; the size
// comes from the font-size and the colour from the text colour, as with a font. Anything
// else given (onClick, role, aria-label, style) goes to the <i>.
const Icon = React.forwardRef<HTMLElement, Props>(({ name, className = "", children, ...rest }, ref) => {
  const Shape = solid[name];
  return (
    <i ref={ref} className={`fas fa-${name}${className ? ` ${className}` : ""}`} {...rest}>
      <Shape aria-hidden="true" focusable="false" />
      {children}
    </i>
  );
});
Icon.displayName = "Icon";

// A line icon by itself, for the places that already have their own <i class="icon ...">.
export const LineIcon = ({ name }: { name: LineIconName }) => {
  const Shape = line[name];
  return <Shape aria-hidden="true" focusable="false" />;
};

export default Icon;
