import React, { useMemo } from "react";
import ExpandableCard2 from "./ExpandableCard2";
import InputBox from "./InputBox";
import "../assets/css/filterSearch.css";
import IdFilter from "./IdFilter";
import { ServiceResponse } from "../util/Models";
import { useLocale } from "../util/useLocale";

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
  const { t, name } = useLocale();
  // The filter lists are worked out from the search result, so they are not kept in state:
  // every company and terminal that appears in the result, once, as id -> name.
  const { companyData, originData, destinationData } = useMemo(() => {
    const companyData = new Map<string, string>();
    const originData = new Map<string, string>();
    const destinationData = new Map<string, string>();

    servicesData?.Items.forEach((item) => {
      companyData.set(item.CompanyId.toString(), name(item.CompanyPersianName, item.CompanyName));
      originData.set(item.OriginTerminalCode, name(item.OriginTerminalPersianName, item.OriginTerminalName));
      destinationData.set(item.DestinationTerminalCode, name(item.DestinationTerminalPersianName, item.DestinationTerminalName));
    });

    return { companyData, originData, destinationData };
  }, [servicesData, name]);

  return (
    <div className="filter-search">
      <ExpandableCard2 title={t("results.sortBy")}>
        <InputBox
          type="radio"
          name="sort"
          id="s1"
          checked={!sortBasedOnPrice}
          onChange={() => setSortBasedOnPrice(false)}>
          {t("results.sortTime")}
        </InputBox>
        <InputBox
          type="radio"
          name="sort"
          id="s2"
          checked={sortBasedOnPrice}
          onChange={() => setSortBasedOnPrice(true)}>
          {t("results.sortPrice")}
        </InputBox>
      </ExpandableCard2>
      <ExpandableCard2 title={t("results.filterCompany")}>
        <IdFilter
          allElementTitle={t("results.allCompanies")}
          elements={companyData}
          id="company"
          checkedState={checkedState}
          setCheckedState={setCheckedState}
        />
      </ExpandableCard2>
      <ExpandableCard2 title={t("results.filterTerminal")} direction="row">
        <div className="end-start-point">
          <p>{t("results.originTerminal")}</p>
          <IdFilter
            allElementTitle={t("results.allOriginTerminals")}
            elements={originData}
            id="origin"
            checkedState={originState}
            setCheckedState={setOriginState}
          />
        </div>
        <div className="end-start-point">
          <p>{t("results.destinationTerminal")}</p>
          <IdFilter
            allElementTitle={t("results.allDestinationTerminals")}
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
