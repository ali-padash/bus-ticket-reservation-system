import { useMemo, useState } from "react";
import { ServiceResponse } from "../util/Models";
import s from "../assets/css/servicesDisplay.module.css";
import { turnTimeToInteger, turnToDate } from "../util/Function";
import Panel from "./Panel";
import DummyPanel from "./DummyPanel";
import ServicesDisplayTitle from "./ServicesDisplayTitle";

interface Props {
  servicesData: ServiceResponse | null;
  sortBasedOnPrice: boolean;
  checkedState: { [key: string]: boolean };
  originState: { [key: string]: boolean };
  destinationState: { [key: string]: boolean };
  errorFetching: boolean;
  // The search as it stands in the address ("from=1&to=21&date=..."). It is handed on to the
  // booking page, so that page can find its trip again and knows the way back.
  searchQuery: string;
}

const ServicesDisplay = ({
  servicesData,
  sortBasedOnPrice,
  checkedState,
  originState,
  destinationState,
  errorFetching,
  searchQuery,
}: Props) => {
  // Only one trip shows its seat map at a time. Keeping the open trip's ID here, in the
  // parent of all the cards, means opening one card closes the others without any signal.
  const [openTripID, setOpenTripID] = useState<number | null>(null);

  // The list on screen is worked out from the search result and the chosen sort and filters.
  // It is not kept in state, so it can never be out of step with them. (updated 2026-10-12)
  const items = useMemo(() => {
    const filtered = (servicesData?.Items ?? []).filter(
      (item) =>
        (checkedState["all"] || checkedState[item.CompanyId.toString()]) &&
        (originState["all"] || originState[item.OriginTerminalCode]) &&
        (destinationState["all"] || destinationState[item.DestinationTerminalCode])
    );
    // filter() made a new list, so sorting it in place leaves the search result untouched.
    return filtered.sort((a, b) =>
      sortBasedOnPrice ? a.Price - b.Price : turnTimeToInteger(a.DepartureTime) - turnTimeToInteger(b.DepartureTime)
    );
  }, [servicesData, sortBasedOnPrice, checkedState, originState, destinationState]);

  if (!servicesData)
    return errorFetching ? (
      <p className={s["no-service-alert"]}>متاسفانه خطایی رخ داده است.</p>
    ) : (
      <div className={s.service}>
        <div className={s.dummyText} />
        {Array.from({ length: 6 }, (_, index) => (
          <DummyPanel key={index} />
        ))}
      </div>
    );

  if (!servicesData.Items.length)
    return (
      <p className={s["no-service-alert"]}>
        {`متاسفانه بلیط اتوبوس ${servicesData.OriginPersianName} به ${
          servicesData.DestinationPersianName
        } در تاریخ ${turnToDate(servicesData.Date)}
         وجود ندارد.`}
        <br />
        {`برای خرید بلیط اتوبوس و مشاهده قیمت، ساعات حرکت و اتوبوس های مسیر ${servicesData.OriginPersianName} ${servicesData.DestinationPersianName} لطفا روز های دیگر را بررسی کنید.`}
      </p>
    );

  if (!items.length) return <p className={s["no-service-alert"]}>متاسفانه خطایی رخ داده است.</p>;

  // The earliest and latest departure among the trips on screen, for the heading.
  const byTime = [...items].sort((a, b) => turnTimeToInteger(a.DepartureTime) - turnTimeToInteger(b.DepartureTime));
  const minDepartureTime = byTime[0].DepartureTime;
  const maxDepartureTime = byTime[byTime.length - 1].DepartureTime;

  return (
    <div className={s.service}>
      <ServicesDisplayTitle data={servicesData} minDepartureTime={minDepartureTime} maxDepartureTime={maxDepartureTime} />
      {items.map((item, index) => (
        <Panel
          key={item.ID}
          index={index}
          item={item}
          originName={servicesData.OriginPersianName}
          destinationName={servicesData.DestinationPersianName}
          isOpen={item.ID === openTripID}
          setIsOpen={(isOpen) => setOpenTripID(isOpen ? item.ID : null)}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
};

export default ServicesDisplay;
