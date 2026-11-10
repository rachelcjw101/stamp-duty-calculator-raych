// Stamp duty calculation engine. Rates as at 6 November 2026.
const SD = (() => {
  const ceilTo = (x, unit) => Math.ceil(Math.max(0, x) / unit) * unit;
  const d = (s) => (s ? new Date(s + "T00:00:00") : null);
  const minTen = (x) => (x > 0 && x < 10 ? 10 : x);
  const rm = (x) => Math.round(x * 100) / 100;

  // Item 32(a): RM1/2/3/4 per RM100 or part thereof
  function scale(value) {
    const v = ceilTo(value, 100);
    const bands = [
      [100000, 0.01],
      [400000, 0.02],
      [500000, 0.03],
      [Infinity, 0.04],
    ];
    let left = v, duty = 0, from = 0;
    const lines = [];
    for (const [width, rate] of bands) {
      const amt = Math.min(left, width);
      if (amt <= 0) break;
      duty += amt * rate;
      lines.push({ from, to: from + amt, rate, duty: amt * rate });
      from += amt;
      left -= amt;
    }
    return { duty: rm(duty), lines, rounded: v };
  }

  // ---------- Property transfer (MOT / DOA) ----------
  function property(o) {
    const base = Math.max(o.price || 0, o.marketValue || 0);
    const exec = d(o.execDate) || new Date();
    const spa = d(o.spaDate);
    const foreign = o.transferee === "foreignInd" || o.transferee === "foreignCo";
    const citizen = o.transferee === "citizen";
    const residential = o.propertyType === "residential";
    const notes = [], steps = [];
    let basis = "", full = 0, payable = 0, relief = null, cites = [];

    if (foreign && exec >= d("2026-01-01") && residential) {
      full = rm(ceilTo(base, 100) * 0.08);
      basis = "Stamp Act 1949, First Schedule item 32(ab) (inserted by Finance Act 2025): 8% on residential property transferred to a foreign company or a non-citizen who is not a PR";
      steps.push({ label: "8% flat on RM" + fmt(ceilTo(base, 100)), amount: full, cite: ["item32ab", "s2-residential"] });
      cites = ["item32ab", "s2-residential"];
    } else if (foreign && exec >= d("2024-01-01")) {
      full = rm(ceilTo(base, 100) * 0.04);
      basis = "Stamp Act 1949, First Schedule item 32(aa): 4% on property transferred to a foreign company or a non-citizen who is not a PR";
      steps.push({ label: "4% flat on RM" + fmt(ceilTo(base, 100)), amount: full, cite: ["item32aa"] });
      cites = ["item32aa"];
    } else {
      const s = scale(base);
      full = s.duty;
      basis = "Stamp Act 1949, First Schedule item 32(a): RM1 to RM4 per RM100 or part";
      s.lines.forEach((l) =>
        steps.push({
          label: `${(l.rate * 100).toFixed(0)}% on RM${fmt(l.from)} to RM${fmt(l.to)}`,
          amount: l.duty,
          cite: ["item32a"],
        })
      );
      cites = ["item32a"];
    }
    payable = full;

    // Reliefs
    const r = o.relief || "none";
    if (r === "firstHome") {
      if (!citizen) notes.push({ kind: "warn", text: "The first-home exemption is only for Malaysian citizen purchasers. No exemption applied." });
      else if (!residential) notes.push({ kind: "warn", text: "The first-home exemption only covers residential property. No exemption applied." });
      else if (!spa) notes.push({ kind: "warn", text: "Enter the SPA date. The first-home exemption turns on when the sale and purchase agreement was signed." });
      else {
        const fh = firstHome(base, spa, o.proposals);
        if (fh.mode === "full") {
          relief = { label: fh.label, amount: -payable, cite: fh.proposal ? ["budget27-home"] : ["pua53"] };
          payable = 0;
        } else if (fh.mode === "partial") {
          const dutyFirst = scale(Math.min(base, 500000)).duty;
          const above = full - dutyFirst;
          const due = rm(above * 0.5);
          relief = { label: fh.label, amount: due - payable, cite: ["budget27-home"] };
          payable = due;
        } else notes.push({ kind: "warn", text: fh.reason });
        notes.push({ kind: "warn", text: "P.U.(A) 53/2021 covers only one unit, defines residential property as a house, condominium unit, apartment or flat (narrower than s 2 of the Act), and needs a statutory declaration that the buyer has never owned a residential property." });
        if (fh.proposal) notes.push({ kind: "proposal", text: "Uses a Budget 2027 proposal that has not been gazetted yet. Check the final exemption order before relying on it." });
      }
    } else if (r === "loveAffection") {
      if (!citizen) notes.push({ kind: "warn", text: "Love-and-affection relief needs the recipient to be a Malaysian citizen. No relief applied." });
      else if (exec >= d("2023-04-01")) {
        const exemptPart = scale(Math.min(base, 1000000)).duty;
        const due = rm((full - exemptPart) * 0.5);
        relief = { label: "Duty on the first RM1m exempt; 50% of the duty on the balance [P.U.(A) 178/2023, para 2(2)]", amount: due - payable, cite: ["pua178"] };
        payable = due;
      } else {
        const due = rm(full * 0.5);
        relief = { label: "50% remission, parent and child, executed before 1 April 2023 [P.U.(A) 369/2019, since revoked]", amount: due - payable, cite: ["unverified"] };
        payable = due;
      }
    } else if (r === "spouse") {
      relief = { label: "Husband and wife voluntary disposition exempt [P.U.(A) 420/2007]", amount: -payable, cite: ["pua420"] };
      payable = 0;
    } else if (r === "exchange") {
      relief = { label: "Exchange of real property without consideration between family members: RM10 only [s 20A(2)(c)]", amount: 10 - payable, cite: ["s20A"] };
      payable = 10;
      notes.push({ kind: "warn", text: "Section 20A(2) applies only to an exchange of real property for real property where no consideration is paid or agreed, between husband and wife, parent and child, grandparent and grandchild, or siblings." });
    } else if (r === "estate") {
      relief = { label: "Fixed RM10 for release or renunciation between beneficiaries of the same estate [item 32(h)(ii)]", amount: 10 - payable, cite: ["item32h"] };
      payable = 10;
    }

    if (r !== "spouse" && !(relief && payable === 0)) payable = minTen(payable);

    // Loan
    let loan = null;
    if (o.loan > 0) {
      const loanFull = rm(ceilTo(o.loan, 1000) * 0.005);
      let loanDue = loanFull, loanRelief = null, loanCite = null;
      if (r === "firstHome" && citizen && residential && spa) {
        const fh = firstHome(base, spa, o.proposals);
        if (fh.mode === "full") { loanRelief = fh.proposal ? fh.label : "First-home exemption on the loan: Stamp Duty (Exemption) (No. 2) Order 2021 [P.U.(A) 54/2021], as amended by P.U.(A) 449/2025"; loanCite = fh.proposal ? ["budget27-home"] : ["pua54"]; loanDue = 0; }
        else if (fh.mode === "partial") {
          // Assumed method: the share of the loan matching the price above RM500k gets 50% off.
          loanDue = rm(loanFull * (1 - (500000 / base)) * 0.5);
          loanRelief = "50% on the portion above RM500,000 (proposed; method assumed pro rata)";
          loanCite = ["budget27-home"];
        }
      }
      loan = { full: loanFull, due: loanDue === 0 ? 0 : minTen(loanDue), relief: loanRelief, cite: loanCite };
    }

    // SDSAS phase
    const phase = exec >= d("2027-01-01")
      ? "Self-assessed from 1 Jan 2027 (Phase 2) unless the transfer needs a JPPH valuation"
      : "Assessed by LHDN in 2026; property transfers move to self-assessment on 1 Jan 2027";

    return { base, full, steps, relief, payable, basis, notes, loan, phase, spaNominal: 10, cites };
  }

  function firstHome(base, spa, proposals) {
    const inCurrent = spa >= d("2021-01-01") && spa <= d("2027-12-31");
    const inProposed = proposals && spa >= d("2027-01-01") && spa <= d("2030-12-31");
    if (base <= 500000 && inCurrent)
      return { mode: "full", label: "First-home exemption, value up to RM500,000: Stamp Duty (Exemption) Order 2021 [P.U.(A) 53/2021], as amended by P.U.(A) 448/2025" };
    if (base <= 500000 && inProposed)
      return { mode: "full", label: "First-home exemption, price up to RM500,000 (Budget 2027 proposal, not yet gazetted)", proposal: true };
    if (base <= 750000 && inProposed)
      return { mode: "partial", label: "Proposed first-home relief: duty on first RM500,000 exempt, 50% off duty on the balance", proposal: true };
    if (base <= 750000 && !proposals && spa >= d("2027-01-01") && spa <= d("2030-12-31"))
      return { mode: "none", reason: "Above RM500,000. Budget 2027 proposes partial relief up to RM750,000 for SPAs from 2027; switch on proposals to see it." };
    if (!inCurrent && !inProposed)
      return { mode: "none", reason: "The SPA date falls outside the exemption window. No exemption applied." };
    return { mode: "none", reason: "The property value is above the first-home ceiling. No exemption applied." };
  }

  // ---------- Loan / financing ----------
  function loan(o) {
    const amt = o.amount || 0;
    const exec = d(o.execDate) || new Date();
    const notes = [];
    let duty = 0, basis = "", cites = ["item27a"];
    switch (o.type) {
      case "sme": {
        const a = ceilTo(amt, 1000);
        const t1 = Math.min(a, 250000), t2 = Math.min(Math.max(a - 250000, 0), 750000), t3 = Math.max(a - 1000000, 0);
        duty = t1 / 1000 * 0.5 + t2 / 1000 * 2.5 + t3 / 1000 * 5;
        basis = "Stamp Act 1949, First Schedule item 27(a)(i): RM0.50 per RM1,000 on the first RM250,000 of aggregate SME loans in a calendar year, RM2.50 per RM1,000 up to RM1,000,000, then RM5.00";
        notes.push({ kind: "warn", text: "The tiers apply to the aggregate of the SME's loans in the calendar year. This assumes this agreement is the first one this year." });
        break;
      }
      case "unsecured":
        duty = ceilTo(amt, 1000) * 0.001;
        basis = "Stamp Act 1949, First Schedule item 22(1), with duty above 0.1% remitted for loans without security repayable on demand or in a single bullet repayment [Stamp Duty (Remission) (No. 2) Order 2012, P.U.(A) 258/2012]";
        cites = ["item22-1a", "pua258"];
        break;
      case "hirePurchase":
        duty = 10;
        basis = "Stamp Act 1949, First Schedule item 22(6): RM10 on security for financing the purchase of goods within the First Schedule to the Hire-Purchase Act 1967";
        cites = ["item22-6"];
        break;
      case "cakna":
        duty = 10;
        basis = "Remission of duty above RM10 for CAKNA I financing executed 1 March 2021 to 31 December 2028 (remission order not yet verified)";
        cites = ["budget27-cakna"];
        break;
      case "foreignCurrency": {
        duty = ceilTo(amt, 1000) * 0.005;
        basis = "Stamp Act 1949, First Schedule item 27(a)(ii): RM5 per RM1,000 or part on foreign currency loans";
        if (o.proposals && exec >= d("2027-01-01")) {
          const cap = amt <= 100000000 ? 2000 : 5000;
          if (duty > cap) {
            duty = cap;
            basis = "Budget 2027 proposal: foreign-currency financing from banks in Malaysia capped at RM2,000 (up to RM100m) or RM5,000 (above)";
            notes.push({ kind: "proposal", text: "Cap is a Budget 2027 proposal for agreements from 1 Jan 2027. Not yet gazetted." });
            cites = ["item27a", "budget27-fx"];
          }
        }
        break;
      }
      default:
        duty = ceilTo(amt, 1000) * 0.005;
        basis = "Stamp Act 1949, First Schedule item 27(a)(iii): RM5 per RM1,000 or part";
    }
    return { duty: minTen(rm(duty)), basis, notes, cites, phase: "Self-assessed via e-Duti Setem (Phase 1, security instruments)" };
  }

  // ---------- Shares ----------
  function shares(o) {
    const proNta = o.totalShares > 0 ? (o.nta * o.sharesTransferred) / o.totalShares : 0;
    const candidates = [
      { label: "Consideration", value: o.consideration || 0 },
      { label: "Net tangible assets, pro rata", value: rm(proNta) },
    ];
    if (o.otherValue > 0) candidates.push({ label: "Other valuation (e.g. PER)", value: o.otherValue });
    const top = candidates.reduce((a, b) => (b.value > a.value ? b : a));
    const base = top.value;
    const duty = minTen(rm(ceilTo(base, 1000) * 0.003));
    return {
      candidates, base, basisLabel: top.label, rounded: ceilTo(base, 1000), duty,
      basis: "Stamp Act 1949, First Schedule item 32(b): RM3 per RM1,000 or part on the higher of consideration or value", cites: ["item32b"],
      phase: "Self-assessed via e-Duti Setem (Phase 1, securities)",
    };
  }

  // ---------- Tenancy ----------
  function tenancy(o) {
    const months = o.months || 0;
    const annual = o.avgAnnual > 0 ? o.avgAnnual : (o.monthly || 0) * 12;
    const exec = d(o.execDate) || new Date();
    const copies = Math.max(0, o.copies || 0);
    let rate, units, duty, basis, exempt = 0;
    if (exec >= d("2025-01-01")) {
      rate = o.indefinite || months > 60 ? 7 : months > 36 ? 5 : months > 12 ? 3 : 1;
      units = Math.ceil(annual / 250);
      basis = "Stamp Act 1949, First Schedule item 49(a), as substituted by Finance Act 2024 s 27(e)(i) from 1 January 2025: RM1 / RM3 / RM5 / RM7 per RM250 of annual rent";
    } else {
      rate = o.indefinite || months > 36 ? 4 : months > 12 ? 2 : 1;
      exempt = 2400;
      units = Math.ceil(Math.max(0, annual - 2400) / 250);
      basis = "Stamp Act 1949, First Schedule item 49(a), before the Finance Act 2024 amendment: RM1 / RM2 / RM4 per RM250 above RM2,400";
    }
    duty = units * rate;
    const principal = annual > exempt ? minTen(duty) : 0;
    return {
      annual, rate, units, exempt, principal, copies, copiesDuty: copies * 10,
      total: principal + copies * 10, basis, cites: ["item49a"],
      band: o.indefinite ? "Indefinite term" : months > 60 ? "More than 5 years" : months > 36 ? "More than 3, up to 5 years" : months > 12 ? "More than 1, up to 3 years" : "Up to 1 year",
      phase: "Self-assessed via e-Duti Setem (Phase 1, lease and tenancy)",
    };
  }

  // ---------- Services & employment ----------
  function services(o) {
    const v = o.value || 0;
    const exec = d(o.execDate) || new Date();
    let duty = 0, basis = "", full = rm(ceilTo(v, 1000) * 0.005), cites = ["item22-1a", "pua428"], notes = [];
    switch (o.type) {
      case "employment": {
        const threshold = exec >= d("2026-01-01") ? 3000 : 300;
        if ((o.wage || 0) <= threshold) {
          duty = 0;
          basis = `Stamp Act 1949, First Schedule item 4, exemption (b)${threshold === 3000 ? " as amended by Finance Act 2025" : ""}: wages not exceeding RM${fmt(threshold)} a month`;
        } else {
          duty = 10;
          basis = `Stamp Act 1949, First Schedule item 4: RM10 (wages above RM${fmt(threshold)} a month)`;
        }
        return { duty, basis, full: null, cites: ["item4"], phase: "Self-assessed via e-Duti Setem (Phase 1, general stamping)" };
      }
      case "subsequent":
        duty = Math.min(ceilTo(v, 1000) * 0.001, 50);
        basis = "Stamp Act 1949, First Schedule item 22(1)(a), with duty above RM50 remitted for lower-tier agreements [Stamp Duty (Remission) Order 2021, P.U.(A) 428/2021]";
        break;
      case "govFirst":
        duty = 0;
        basis = "Main agreement with a Ruler, the Federal or a State Government or a local authority: treated as exempt. P.U.(A) 428/2021 remits the sub-provider tier to 0.1% but does not itself exempt this agreement";
        cites = ["pua428", "unverified"];
        notes.push({ kind: "warn", text: "The source of this exemption has not been verified against a gazetted order." });
        break;
      default:
        duty = ceilTo(v, 1000) * 0.001;
        basis = "Stamp Act 1949, First Schedule item 22(1)(a) at 0.5%, with duty above 0.1% remitted [Stamp Duty (Remission) Order 2021, P.U.(A) 428/2021]";
    }
    return { duty: duty === 0 ? 0 : minTen(rm(duty)), basis, full, cites, notes, phase: "Self-assessed via e-Duti Setem (Phase 1, general stamping)" };
  }

  // ---------- Late stamping penalty (s 47A) ----------
  function penalty(o) {
    const start = d(o.outside ? o.receivedDate : o.execDate);
    const paid = d(o.paidDate);
    if (!start || !paid) return null;
    const due = new Date(start); due.setDate(due.getDate() + 30);
    const threeMonths = new Date(due); threeMonths.setMonth(threeMonths.getMonth() + 3);
    const late = paid > due;
    const dutyAmt = o.duty || 0;
    let pen = 0, tier = "On time";
    if (late && paid <= threeMonths) { pen = Math.max(50, dutyAmt * 0.1); tier = "s 47A(1)(a): within 3 months after the stamping period"; }
    else if (late) { pen = Math.max(100, dutyAmt * 0.2); tier = "s 47A(1)(b): more than 3 months after the stamping period"; }
    const daysLate = late ? Math.round((paid - due) / 86400000) : 0;
    return { due, threeMonths, late, daysLate, pen: rm(pen), tier, total: rm(dutyAmt + pen), cites: ["s47A"] };
  }

  function fmt(n, dp = 0) {
    return Number(n).toLocaleString("en-MY", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  return { scale, property, loan, shares, tenancy, services, penalty, fmt, ceilTo };
})();
if (typeof module !== "undefined") module.exports = SD;
