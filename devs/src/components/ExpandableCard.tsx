import React, { useState } from "react";
import "../assets/css/expandableCard.css";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  title: string;
  children: React.ReactNode;
}

const ExpandableCard = ({ title, children }: Props) => {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="expandable-card">
      <div className={`expandable-card-header ${expanded ? "expanded" : ""}`} onClick={() => setExpanded(!expanded)}>
        <p>{title}</p>
        <Icon name="chevron-down" className={expanded ? "rotate" : ""} tabIndex={0} role="button" aria-label={t("faq.toggle")} onKeyDownCapture={(e) => setExpanded(e.key === "Enter" ? !expanded : expanded)} />
      </div>
      <p className={`expandable-card-content ${expanded ? "expanded" : ""}`}>{children}</p>
    </div>
  );
};

export default ExpandableCard;
