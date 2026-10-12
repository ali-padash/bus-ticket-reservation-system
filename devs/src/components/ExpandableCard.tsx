import React, { useState } from "react";
import "../assets/css/expandableCard.css";
import { useLocale } from "../util/useLocale";

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
        <i className={`fas fa-chevron-down ${expanded ? "rotate" : ""}`} tabIndex={0} role="button" aria-label={t("faq.toggle")} onKeyDownCapture={(e) => setExpanded(e.key === "Enter" ? !expanded : expanded)}></i>
      </div>
      <p className={`expandable-card-content ${expanded ? "expanded" : ""}`}>{children}</p>
    </div>
  );
};

export default ExpandableCard;
