import React, { useMemo } from "react";
import ExpandableCard2 from "./ExpandableCard2";
import InputBox from "./InputBox";
import "../assets/css/filterSearch.css";
import IdFilter from "./IdFilter";
import { ServiceResponse } from "../util/Models";

type CheckedState = { [key: string]: boolean };

interface Props {
  servicesData: ServiceResponse | null;
  sortBasedOnPrice: boolean;
  setSortBasedOnPrice: (sortBasedOnPrice: boolean) => void;
  checkedState: CheckedState;
  setCheckedState: React.Dispatch<React.SetStateAction<CheckedState>>;
  originState: CheckedState;
  setOriginState: React.Dispatch<React.SetStateAction<CheckedState>>;
  destinationState: CheckedState;
  setDestinationState: React.Dispatch<React.SetStateAction<CheckedState>>;
}

const FilterSearch = ({
  servicesData,
  sortBasedOnPrice,
  setSortBasedOnPrice,
  checkedState,
  setCheckedState,
  originState,
  setOriginState,
  destinationState,
  setDestinationState,
}: Props) => {
  // The filter lists are worked out from the search result, so they are not kept in state:
  // every company and terminal that appears in the result, once, as id -> name.
  const { companyData, originData, destinationData } = useMemo(() => {
    const companyData = new Map<string, string>();
    const originData = new Map<string, string>();
    const destinationData = new Map<string, string>();

    servicesData?.Items.forEach((item) => {
      companyData.set(item.CompanyId.toString(), item.CompanyPersianName);
      originData.set(item.OriginTerminalCode, item.OriginTerminalPersianName);
      destinationData.set(item.DestinationTerminalCode, item.DestinationTerminalPersianName);
    });

    return { companyData, originData, destinationData };
  }, [servicesData]);

  return (
    <div className="filter-search">
      <ExpandableCard2 title="مرتب سازی بر اساس">
        <InputBox
          type="radio"
          name="sort"
          id="s1"
          checked={!sortBasedOnPrice}
          onChange={() => setSortBasedOnPrice(false)}>
          ساعت
        </InputBox>
        <InputBox
          type="radio"
          name="sort"
          id="s2"
          checked={sortBasedOnPrice}
          onChange={() => setSortBasedOnPrice(true)}>
          قیمت
        </InputBox>
      </ExpandableCard2>
      <ExpandableCard2 title="فیلتر بر اساس شرکت">
        <IdFilter
          allElementTitle="همه شرکت ها"
          elements={companyData}
          id="company"
          checkedState={checkedState}
          setCheckedState={setCheckedState}
        />
      </ExpandableCard2>
      <ExpandableCard2 title="فیلتر بر اساس پایانه" direction="row">
        <div className="end-start-point">
          <p>پایانه مبداء</p>
          <IdFilter
            allElementTitle="همه پایانه های مبداء"
            elements={originData}
            id="origin"
            checkedState={originState}
            setCheckedState={setOriginState}
          />
        </div>
        <div className="end-start-point">
          <p>پایانه مقصد</p>
          <IdFilter
            allElementTitle="همه پایانه های مقصد"
            elements={destinationData}
            id="destination"
            checkedState={destinationState}
            setCheckedState={setDestinationState}
          />
        </div>
      </ExpandableCard2>
    </div>
  );
};

export default FilterSearch;
