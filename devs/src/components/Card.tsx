import React from "react";
import { LineIcon, LineIconName } from "./Icon";

interface Props {
  iconClass: LineIconName;
  title: string;
  children: React.ReactNode;
}

const Card = ({ iconClass, title, children }: Props) => {
  return (
    <div className="block">
      <i className={"icon " + iconClass}>
        <LineIcon name={iconClass} />
      </i>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
};

export default Card;
