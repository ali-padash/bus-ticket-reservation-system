import React from "react";
import InputBox from "./InputBox"; // Assuming InputBox is in the same directory

interface Props {
  allElementTitle: string;
  elements: Map<string, string>; // This should be id to name mapping
  id: string; // Contextual ID for distinguishing different filters
  // Which boxes are ticked: `all`, or some element ids. The page owns it and puts it back
  // to `{ all: true }` when a new search starts. (updated 2026-10-12)
  checkedState: { [key: string]: boolean };
  setCheckedState: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}

const IdFilter = ({ elements, id, allElementTitle, checkedState, setCheckedState }: Props) => {
  const handleCheckboxChange = (elementId: string) => {
    if (elementId === `all`) {
      setCheckedState({ all: true });
    } else {
      const newState = {
        ...checkedState,
        [elementId]: !checkedState[elementId],
        [`all`]: false,
      };

      const areAllUnchecked = Array.from(elements.keys()).every((key) => !newState[key]);
      if (areAllUnchecked) {
        newState[`all`] = true;
      }
      setCheckedState(newState);
    }
  };

  return (
    <>
      <InputBox
        type="checkbox"
        name={`${id}_all`}
        id={`${id}_all`}
        checked={checkedState[`all`]}
        disabled={checkedState[`all`]}
        onChange={() => handleCheckboxChange(`all`)}>
        {allElementTitle}
      </InputBox>
      {Array.from(elements.entries()).map(([elementId, name]) => (
        <InputBox
          key={elementId}
          type="checkbox"
          name={`${id}_${elementId}`}
          id={`${id}_${elementId}`}
          checked={!!checkedState[elementId]}
          onChange={() => handleCheckboxChange(elementId)}>
          {name}
        </InputBox>
      ))}
    </>
  );
};

export default IdFilter;
