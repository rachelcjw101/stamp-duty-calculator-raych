# Malaysia Stamp Duty Calculator

A free calculator for stamp duty under the Stamp Act 1949 [Act 378], with the exemption and remission orders in force applied.

Every figure has a **§** marker beside it. Hover over it or tap it to read the exact wording of the provision or order the figure relies on, so you can check the basis yourself.

**Use it here:** https://rachelcjw101.github.io/stamp-duty-calculator-raych/

**Rates last checked:** 10 November 2026

## What it covers

| Tab | Instruments |
|---|---|
| Property transfer | Memorandum of transfer or deed of assignment, purchase loan and SPA. Includes first-home, love-and-affection, husband-and-wife, family exchange and estate reliefs, and the 4% and 8% rates for foreign buyers |
| Loan & financing | Ringgit, SME tiered, unsecured, foreign-currency, hire-purchase and CAKNA I financing |
| Share transfer | Unlisted shares, on the higher of consideration, pro-rata NTA or another valuation |
| Tenancy | Item 49(a) scale by length of term, with extra copies |
| Services & employment | Service agreements and employment contracts |
| Late penalty | Section 47A penalty from the stamping deadline |
| Legal fees | Solicitors' scale fees under the Solicitors' Remuneration Order 2023 for sales, loans, tenancies and leases, with the discount allowed and service tax. Disbursements are not included |

A toggle shows Budget 2027 proposals. These are clearly marked and are not law until gazetted.

## Sources

The rates and the quoted text come from official sources only:

- **Federal Government Gazette** (Warta Kerajaan Persekutuan), through the Attorney General's Chambers' Laws of Malaysia portal at [lom.agc.gov.my](https://lom.agc.gov.my/). This covers the Stamp Act 1949, the Finance Act 2024 [Act 862], the Finance Act 2025 [Act 874], the P.U. (A) exemption and remission orders, and the Solicitors' Remuneration Order 2023 [P.U. (A) 207/2023].
- **Inland Revenue Board of Malaysia (LHDN)** website at [hasil.gov.my](https://www.hasil.gov.my/). This covers stamp duty orders, guidance, and the self-assessment timeline.
- **Ministry of Finance** Budget 2027 tax measures, for the proposals shown behind the toggle only.

The full list of instruments is in [`CHANGELOG.md`](CHANGELOG.md), and in the "Legal basis" section at the foot of the page.

The Stamp Act text used is the AGC's online updated text, which is not an authentic text under the Revision of Laws Act 1968. Where it differs from the Finance Act that amended it, the calculator quotes the Finance Act and flags the difference in the § panel.

## Not legal advice

This is an estimate for planning and fee quotes. Exemption and remission orders have conditions the calculator cannot check, such as a first-home buyer never having owned a residential property. Check the gazetted order and LHDN's guidance before filing on e-Duti Setem.

## Feedback

Spotted a wrong rate, a new order, or a case it doesn't handle? Get in touch on [LinkedIn](https://www.linkedin.com/in/rachelcjw/), or [open an issue](https://github.com/rachelcjw101/stamp-duty-calculator-raych/issues) on this repo.

If it saved you time, you can [buy me a coffee](https://buymeacoffee.com/rachelcjw).

## For maintainers

| File | What it holds |
|---|---|
| `index.html` | The page |
| `calc.js` | Rates and calculation rules |
| `provisions.js` | The quoted statutory text shown in the § panels |
| `tests.js` | Worked examples, run on every commit |
| `verify-provisions.js` | Checks each quote against local text copies of the gazettes |
| `CHANGELOG.md` | What changed, when, and under which instrument |

The gazette PDFs are kept locally and are not part of this repo.

## Licence

See [`LICENSE`](LICENSE). The quoted statutory text remains subject to the rights of the Government of Malaysia and its publishers.
