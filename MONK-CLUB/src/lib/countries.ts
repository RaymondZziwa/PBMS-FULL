// ISO 3166 country codes; names come from the browser (Intl.DisplayNames).
const CODES =
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW".split(" ");

let names: string[] | null = null;

/** Country names, Uganda first, then East Africa, then A–Z. */
export const countries = () => {
  if (names) return names;
  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    dn = null;
  }
  const all = CODES.map((c) => dn?.of(c) ?? c).filter((n) => n && n !== "Uganda");
  const east = ["Kenya", "Tanzania", "Rwanda", "South Sudan", "Burundi", "Congo - Kinshasa"].filter((n) => all.includes(n));
  names = ["Uganda", ...east, ...all.filter((n) => !east.includes(n)).sort((a, b) => a.localeCompare(b))];
  return names;
};
