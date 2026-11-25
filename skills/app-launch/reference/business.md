# Registering the business

Start early: a day to a few weeks, by country.
Optional: a free app run in the owner's own name may need none of this.

**Why.** Before you take money or publish to the stores, someone has to be the seller: the name on the privacy policy and terms, the Stripe account and the bank account the money lands in, and the seller on the App Store and Google Play.
A starting point, not legal or tax advice.

## What the agent does

- Asks whether it's registered, where, and its legal name, number and registered office address.
- Puts the legal name in `operator` and the number and registered office address in `registration` in `src/lib/brand.ts`, where the privacy policy and terms show them (`new` writes them when they're passed as `--operator`, `--registration` and `--address`).
- An app made before `brand.ts` had a registration: adds one and shows it beside the operator in `src/lib/legal.ts`, as the template now does.
- Looks up the exact steps for a country not listed below.

## What is the person's

- Not yet registered: choose how it's run.
  A sole trader is the owner in person: the least admin, and their own name shows in the app stores.
  A company is a separate legal entity: more admin, and its name shows in the stores (it enrols there as an organisation).
  An accountant can say which suits.
- Australia:
  - An ABN: free and online, often issued straight away: https://www.abr.gov.au → Apply for an ABN. A company registers with ASIC first and gets an ACN.
  - Trading under a name that isn't the owner's own? Register it as a business name with ASIC: https://www.asic.gov.au
  - GST: register once turnover reaches A$75,000 a year (sooner if you choose).
- The UK:
  - Sole trader: register for Self Assessment with HMRC (https://www.gov.uk/set-up-sole-trader) by 5 October after the tax year you start trading.
  - Company: register it at Companies House (https://www.gov.uk/limited-company-formation), usually within a day. The website must show its registered name, number and office address: put them in registration, and the terms show them.
  - VAT: register once taxable turnover passes £90,000 in 12 months.
- The US:
  - Sole proprietor: nothing to file federally; a DBA ("doing business as") with the county or state to trade under another name.
  - LLC: file with the state's Secretary of State (fees and timings vary by state).
  - An EIN: free from the IRS and issued online straight away (https://www.irs.gov → Apply for an EIN online). Stripe and the bank ask for it.
  - Sales tax on digital subscriptions depends on the state: Stripe Tax tracks where you owe it.
- Anywhere else: register it with the country's business registry and tax office, and keep its registration number (your agent can look up the exact steps for the country); ask an accountant when to register for sales tax (VAT or GST) on what you sell.
- Selling to people abroad can mean tax there too (the EU charges VAT on digital services from the first sale): Stripe Tax works out what to charge on web sales, and the App Store and Google Play handle it for in-app purchases.
- Open a business bank account: Stripe, Apple and Google pay into it.
- Once it's registered, send the agent its legal name, number and registered office address.

Checked Nov 2026; registries change their fees, not their shape.

## How to check it

- `grep -n "operator\|registration" src/lib/brand.ts` shows the legal name and number, and `/terms` on the live site shows them beside the operator.
