import { useEffect, useState } from "react";
import { fetchRefundRules } from "./FetchFunction";
import { RefundRule } from "./Models";
import { useLocale } from "./useLocale";

// One line of a trip's refund terms, ready to draw: the fee in the page's digits and the
// sentence that says when it applies.
export interface RefundLine {
  key: number;
  percent: string;
  text: string;
}

// Loads the refund terms of one trip from the API and words them in the page's language.
// Both places that show the terms use this (the trip card and the review step), so they
// cannot disagree with each other or with the fee the API really charges.
//
// The list is empty while loading and when the terms cannot be loaded: they are extra
// information, and a purchase can go on without them. (written 2026-10-12)
export const useRefundRules = (tripID: number): RefundLine[] => {
  const { t, num } = useLocale();
  const [rules, setRules] = useState<RefundRule[]>([]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchRefundRules(tripID, abortController.signal)
      .then((loaded) => setRules(loaded))
      .catch(() => setRules([]));
    return () => abortController.abort();
  }, [tripID]);

  // The rules arrive ordered from the most notice to the least. Each is read against the one
  // before it: "up to 1 hour before departure", then "less than 1 hour before departure".
  const describe = (rule: RefundRule, previous: RefundRule | undefined) => {
    const hours = (count: number) => ({ count, hours: num(count) });
    if (rule.MinHoursBeforeDeparture > 0) return t("refund.upTo", hours(rule.MinHoursBeforeDeparture));
    if (previous) return t("refund.lessThan", hours(previous.MinHoursBeforeDeparture));
    return t("refund.untilDeparture");
  };

  return rules.map((rule, index) => ({
    key: rule.MinHoursBeforeDeparture,
    percent: num(rule.PenaltyPercent),
    text: describe(rule, rules[index - 1]),
  }));
};
