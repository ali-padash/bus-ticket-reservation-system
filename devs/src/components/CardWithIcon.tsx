import React from "react";
import "../assets/css/cardWithIcon.css";
import { LineIcon, LineIconName } from "./Icon";

interface Props {
  title: string;
  icon: LineIconName;
  children: React.ReactNode;
}

const CardWithIcon = ({ title, icon, children }: Props) => {
  return (
    <div className="card-with-icon">
      <div className="card-with-icon-content">
        <h4>{title}</h4>
        <p>{children}</p>
      </div>
      <i className={`icon ${icon}`}>
        <LineIcon name={icon} />
      </i>
    </div>
  );
};

export default CardWithIcon;
