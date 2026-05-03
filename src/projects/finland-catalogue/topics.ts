import type { Topic } from "./types";

/**
 * Hand-curated cultural & educational Topics about Finland. Populate by
 * running the `add-finland-topic` Claude Code skill, which researches
 * each topic on the web and appends a fully-populated entry to this
 * array.
 */
export const TOPICS: Topic[] = [
  {
    slug: "sauna",
    title: "Sauna",
    aliases: ["sauna", "saunas", "sauna culture", "löyly", "kiuas", "vasta"],
    shortDescription:
      "Finland has more saunas than cars — roughly three million for five and a half million people, and most still get used every week.",
    longDescription: [
      "The sauna is a wood-lined room with benches and a stone-topped stove (kiuas), heated to 80–100°C. You sit naked, throw water onto the stones to release löyly — the spirit of steam that rises and stings the skin — and cycle between the heat, a cooling break, and back in. In Finland this isn't a wellness amenity or a spa upsell; it's a weekly ritual older than the country itself.",
      "For centuries the sauna was the most sterile space in any homestead. Babies were born in them through the 1950s, the dead were washed there before burial, meat was cured in them, injuries were treated in them. Finns called it a \"church of nature\", and that reverence carries through today. UNESCO added Finnish sauna culture to its Intangible Cultural Heritage list in 2020 — the country's first entry on it.",
      "You'll encounter three kinds. Electric saunas are the everyday default — most apartments have one, and most apartment blocks have a shared one with bookable time slots. Wood-fired saunas at lakeside cottages (mökki) give a softer steam and the smell of burning birch. Smoke saunas (savusauna) are the original form: no chimney, the room fills with smoke for hours while the stones heat, then is vented before bathing; the walls blacken to a deep char and most Finns will tell you the smoke sauna is the real thing.",
      "As a visitor the easiest entry points are hotel saunas, public swim halls, and Helsinki's design saunas (Löyly, Allas, Kulttuurisauna). Etiquette is simpler than the mythology suggests: naked is normal in single-sex saunas, swimsuits are fine in the modern mixed ones, you sit on a small towel for hygiene, and you ask before throwing more water on the stones. Take a beer for after, jump in a lake or the sea between rounds if there's one nearby, and don't try to outlast the locals.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Traditional_Finnish_sauna_whisking_and_löyly.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Smoke_sauna.JPG",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Finnish_Vasta_(Vihta).jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Sauna_ladle_and_bucket_2016_(cropped).jpg",
    ],
  },
  {
    slug: "winter-swimming",
    title: "Winter Swimming",
    aliases: [
      "winter swimming",
      "winter-swimming",
      "winter swimmer",
      "winter swimmers",
      "ice swimming",
      "ice-swimming",
      "ice swimmer",
      "ice swimmers",
      "ice-swimmer",
      "ice-swimmers",
      "avantouinti",
      "avanto",
      "ice hole",
    ],
    shortDescription:
      "After the sauna, Finns climb out, walk to a hole cut in the lake ice, and lower themselves in — it's the part of sauna culture nobody warns you about.",
    longDescription: [
      "Avantouinti — winter swimming through an avanto, a hole cut in the lake or sea ice — is the cold-water other half of Finnish sauna culture. The pattern is sauna, plunge, sauna, plunge, repeat: 80°C of dry heat for fifteen minutes, then a deliberate walk to a ladder set into the ice, then ten or twenty seconds in water that's actively freezing. The shock is real, the endorphin rush afterwards is enormous, and most people who try it once want to do it again.",
      "The practice goes back at least to the 1600s, but the modern club scene began with Finland's first registered winter-swimming society in 1923. Today over 720,000 Finns swim regularly through the winter — close to one in seven adults — and most major clubs have waitlists. The official Finnish winter-swimming season runs October through May.",
      "The hole stays open through the coldest months because most clubs run a small electric pump that circulates surface water; without it the avanto would refreeze overnight. There's a ladder into the water, a railing for the climb out, and a heated changing room and sauna a short shuffle away. Wool socks and gloves are normal — the extremities feel the cold worst — and most regulars stay in for ten to thirty seconds, not minutes.",
      "As a visitor, the easiest entry points are Allas Sea Pool, Löyly, and Kulttuurisauna in Helsinki — all keep an avanto open through the winter and rent towels if you didn't bring one. Sauna first to warm the body, breathe slowly going in, and skip it if you have heart conditions or untreated high blood pressure.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Ice_swimming_at_summer_cottage_Finland.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Ispoinen_ice_swimming.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/2018_Winter_in_Helsinki,_Finland_(26611927908).jpg",
    ],
  },
  {
    slug: "sisu",
    title: "Sisu",
    aliases: ["sisu"],
    shortDescription:
      "Finland's untranslatable word for quiet, action-driven grit — what gets you through an impossible situation without complaining about it.",
    longDescription: [
      "Sisu is the Finnish word for the quality of pushing on through long odds when by all reasonable measures you should give up. The closest English words — grit, tenacity, resilience, hardihood — each capture a piece of it, but Finns will tell you they all miss something. Sisu isn't a personality trait or a cheerful attitude; it's behaviour. It's what you do, quietly and without drama, after the point at which a sensible person would stop.",
      "The word comes from sisus, an old Finnish noun for \"interior, entrails, guts\" — the same metaphor English uses for inner courage, but considerably older. Sisu appears in Finnish written records from the 17th century and in spoken use long before that. It enters the wider world's vocabulary in the Winter War of 1939–40, when Finland — outnumbered roughly three to one in troops and effectively without tanks — held off the Soviet invasion for 105 days. Time magazine ran a feature on sisu in January 1940, and it has been Finland's calling card ever since.",
      "In modern usage, sisu is invoked less for war and more for everyday weather. It's what gets a Finn out the door for a 5am winter run when it's -20°C and dark. It's the unflappable competence of the cross-country skier who's been at it for eight hours and isn't tired yet. It's also visible in negative space: Finns are not effusive, do not boast about effort, and tend to view loud determination with suspicion. The point of sisu is that you don't talk about it; you just keep going.",
      "You'll see sisu reflected in the design language (the spare, durable aesthetic of Aalto and Iittala), the food (rye bread fermented over multiple days), the sauna culture, the silence around small talk, and the way Finns react to weather that would shut down a lesser country. If a Finn says of someone \"hänellä on sisua\" — they have sisu — it is a serious compliment. Don't expect to hear it about yourself, and don't claim it; that misses the point entirely.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Monument_to_the_Finnish_sisu.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Finnish_soldiers_marching.jpg",
    ],
  },
  {
    slug: "finnish-design",
    title: "Finnish Design",
    aliases: [
      "Finnish design",
      "Iittala",
      "Marimekko",
      "Artek",
      "Tapio Wirkkala",
      "Alvar Aalto",
      "Aino Aalto",
    ],
    shortDescription:
      "A small country produces an unreasonable number of household objects you already own — bent-plywood stools, ridged glass tumblers, poppy-print dresses — because Finland decided in the 1930s that good design was a public service.",
    longDescription: [
      "What people mean by \"Finnish design\" is a particular thread of 20th-century Nordic functionalism: clean lines, natural materials (birch, glass, ceramic, wool), forms drawn from the Finnish landscape, and the conviction that a chair you can afford to own should be as well-made as one you can't. The brand names are the ones travellers recognise — Alvar and Aino Aalto's Artek (founded 1935), the glassworks Iittala (1881), Marimekko (1951), Arabia (ceramics, 1873), Fiskars (orange-handled scissors, founded 1649) — but the philosophy is what holds them together. Functional, durable, beautiful, democratic, in that order.",
      "The pivotal moment was Milan, 1951. At the IX Triennale di Milano, Tapio Wirkkala won three Grand Prix on his own; Rut Bryk and Dora Jung also took Grand Prix; Toini Muona, Ilmari Tapiovaara, and Kaj Franck won gold medals. Three years later at the X Triennale, Wirkkala did it again. The international design press, expecting the established Italian and Scandinavian masters, found themselves writing about a country that had been independent for thirty-three years and a language nobody else spoke. By the late 1950s \"Finnish design\" was a recognisable category in American department stores, and Wirkkala's plywood Leaf dish had been named the world's most beautiful object by House Beautiful magazine.",
      "The icons stack up quickly. Alvar Aalto's three-legged Stool 60 (1933) is the most-copied stool in design history — Artek still makes it from steam-bent Finnish birch using the original L-leg patent. The Aalto Vase (a.k.a. Savoy Vase, 1936) gave glassware permission to have wavy edges. Marimekko's Unikko poppy print, designed by Maija Isola in 1964 against founder Armi Ratia's express ban on flower prints, is now on Finnair planes. Iittala's Aalto-designed pressed-glass tumblers, Kaj Franck's Teema dinnerware, the iconic Fiskars scissors — these are not museum pieces in Finland; they are what people put on their tables.",
      "As a visitor, the easiest way in is the Design Museum on Korkeavuorenkatu (the world's third-oldest design museum), the surrounding Design District (25 streets and ~200 shops, galleries, and studios across Punavuori, Ullanlinna, Kaartinkaupunki, and Kamppi), and the flagship stores along Esplanadi (Iittala, Marimekko, Artek). For something more casual, second-hand shops are awash in Iittala glassware and old Marimekko at fraction-of-retail prices — Finnish design's democratic ambitions paying off two generations later.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Marimekko_Unikko.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Alvar_Aalto._Stool_60.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Tapio_Wirkkala_Iittalan_lasitehtaalla.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Iittala_shop,_Helsinki_FIN.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Finnair,_Airbus_A340-300_OH-LQD_'Marimekko_Unikko'_NRT_(18172611334).jpg",
    ],
  },
  {
    slug: "winter-war",
    title: "Winter War",
    aliases: ["Winter War", "Talvisota"],
    shortDescription:
      "Outnumbered three to one and with effectively no tanks, Finland held off a Soviet invasion for 105 days — losing eleven percent of its territory but keeping its independence.",
    longDescription: [
      "The Winter War was the Soviet Union's invasion of Finland, from 30 November 1939 to 13 March 1940. Stalin had demanded Finnish border territory north of Leningrad, citing security; Finland refused; the Soviets attacked anyway with roughly 450,000 troops, 2,200 tanks, and overwhelming air superiority. Finland fielded around 300,000 troops and effectively no armour. The war was supposed to last two weeks. It lasted 105 days.",
      "Finnish defenders fought from white-camouflaged skis and entrenched positions in dense forest, in temperatures that dropped below -40°C. Soviet columns advancing along narrow forest roads were cut into pieces by mobile Finnish patrols — the so-called motti tactic — and Soviet casualties swelled past 300,000, more than ten times Finland's. The sniper Simo Häyhä, operating in the forests of Karelia, holds the record for the most confirmed kills in any war (around 505). The international press, watching a small democracy fight off a totalitarian giant, made the war front-page news worldwide.",
      "In February 1940, after weeks of grinding artillery, the Soviets finally breached the Mannerheim Line on the Karelian Isthmus and pushed toward Viipuri. Finland signed the Moscow Peace Treaty on 13 March, ceding about eleven percent of its territory — including most of Karelia, the country's industrial heartland, and its second-largest city — to the Soviet Union. Roughly 420,000 Karelian Finns lost their homes and were resettled across the rest of Finland. The country kept its independence, and the Red Army's poor performance contributed to Hitler's belief that the Soviet Union could be beaten quickly — a miscalculation that shaped Operation Barbarossa the following year.",
      "The Winter War sits at the centre of Finnish national identity in a way that is hard to overstate. It is the country's heroic founding myth and also a quieter trauma about lost land and lost neighbours; Finnish historians describe it as \"trauma portrayed as heroism.\" Memorials to Winter War veterans stand in nearly every Finnish town, and the Mannerheim Museum in Helsinki along with the eastern battleground sites (Suomussalmi, Raate Road, Kollaa) are where visitors most often encounter it physically.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/A_Finnish_Maxim_M-32_machine_gun_nest_during_the_Winter_War.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Finnish-lightmachinegun-skis-winterwar.png",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Evacuation_at_the_end_of_Winter_War.jpg",
    ],
  },
  {
    slug: "koff-and-karhu",
    title: "Koff and Karhu",
    aliases: ["Koff", "Karhu"],
    shortDescription:
      "The two beers Finns mean when they say \"a beer\" — Koff, the country's oldest brand, and Karhu, the brown bear on every supermarket shelf. Both poured by Sinebrychoff.",
    longDescription: [
      "Koff and Karhu are Finland's two best-selling lagers and the default pour at almost every bar and kiosk. Both are made by Sinebrychoff in Kerava, north of Helsinki, both come in the same Roman-numeral strength tiers (III is the standard 4.6%, IVA and IVB step up to ~5.2% and 7%+), and both are honest Continental pale lagers — clean, pale gold, lightly hopped, designed to be drunk cold by the litre. Finns rarely call either of them by name in a bar; you order an olut (\"beer\") and you get whatever is on tap, which is usually one of these two.",
      "Sinebrychoff is the older story. The brewery was founded in 1819 in Helsinki by Nikolai Sinebrychoff, a Russian merchant operating in what was then the autonomous Grand Duchy of Finland under the Russian Empire. It is the oldest still-operating brewery in the Nordic countries, and the Koff brand traces back to 1821 — making it about a year younger than the brewery itself. The original Bulevardi site in Punavuori is now Sinebrychoff Park (where the KOFF Race runs every July) and the Sinebrychoff Art Museum; production moved to Kerava in 1992. Carlsberg has owned the company outright since 1999.",
      "Karhu is the louder brand. The name is the Finnish word for bear, chosen because the beer originated in Pori — historically Björneborg in Swedish, \"bear castle.\" Brewing began in 1929, paused, then resumed continuously from 1958; Sinebrychoff bought the Pori brewery in 1972 and consolidated production in Kerava in 2006. The bear on the label has been redrawn several times but stays muscular and a bit menacing on purpose — Sinebrychoff claims the Karhu bear is the most-tattooed brand mark in Finland. The 2010s campaigns leaned hard into a stoic Finnish-male archetype, the slogan being \"Jokainen Karhu on täyttä olutta\" — \"every Karhu is a beer through and through.\"",
      "For a visitor: a 0.5 L pint of Karhu III or Koff III runs around €8 in a Helsinki bar, a six-pack of cans is roughly €13–15 at a K-market or S-market (groceries can sell up to 5.5% by law — anything stronger is Alko-only). The SpåraKoff pub tram and the KOFF downhill skate race in Sinebrychoff Park are both catalogued here under Ideas; both lean on the Koff name as the marketing engine. Don't expect either beer to be exciting on the palate — these are working lagers, not craft. The point is that they're cold, plentiful, and Finnish.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Karhu,_Lapin_Kulta,_Koff.JPG",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Koff_kerava.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Sinebrychoff_horses_at_St._Lucia's_Day_parade_2024.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Glass_of_Karhu_at_restaurant_Hemingway's.jpg",
    ],
  },
  {
    slug: "lonkero",
    title: "Lonkero (Long Drink)",
    aliases: ["lonkero", "long drink", "long drinks"],
    shortDescription:
      "Gin and grapefruit soda in a blue-and-white can — invented by Alko in 1952 to feed Olympic visitors something a Finnish bartender couldn't mess up. By 2007 it was the best-selling product in the country's state liquor stores.",
    longDescription: [
      "Lonkero — the Finnish pronunciation of \"long drink,\" and also, by happy coincidence, the Finnish word for tentacle — is a pre-mixed gin and grapefruit-soda drink, typically 5.5% ABV, sold in a 0.33 L can. Hartwall's blue-and-white Original Long Drink is the canonical version, but every brewery and distillery in the country now makes one (Olvi, Sinebrychoff's Otto, Helsinki Distilling Co., Kyrö, plus dozens of smaller labels), and the format extends to cranberry, lime, citrus, and a rotating cast of seasonal flavours. It is the default order at a Finnish kiosk, festival, or summer cottage when beer feels boring.",
      "The origin is exact: the 1952 Summer Olympics. Helsinki was hosting its first Games, post-war Finland was still rationing alcohol, and Alko — the state monopoly that had run liquor distribution since prohibition ended in 1932 — was bracing for a flood of foreign visitors and a small number of trained bartenders. Alko's solution was to commission Hartwall to bottle two ready-to-drink mixers: a brandy-with-fruit-soda version (which quietly died) and a gin-with-grapefruit version (which did not). Bars sold them straight from the bottle. The visitors went home; the Finns kept drinking it.",
      "Lonkero is now a fixture of Finnish drinking culture in a way that's hard to overstate. Hartwall Original Long Drink has been Alko's single best-selling product since 2007, beating out Koskenkorva (the national vodka) and every beer on the shelf. It's on tap at almost every bar, in every supermarket fridge in the legal up-to-5.5% alcohol-by-volume tier, and in every cooler bag at the cottage. In the late 2010s a Finnish-American startup called The Finnish Long Drink launched a near-identical product in the US to genuine success — a small expat-led export of a drink most Americans had never heard of.",
      "If you're trying it for the first time, the original gin-grapefruit version is the one to start with — slightly bitter, slightly sweet, more refreshing than it has any right to be at 5.5%. It travels well; pick up a six-pack at any K-market or S-market, or order it on tap (\"yksi lonkero, kiitos\") at any bar. The Olympic origin story is the one Finns will tell you within five minutes of you ordering one.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Hartwall_Original_Long_Drink.png",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Long_drink_in_Finland.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Long_drink_cans_in_fridge.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Glass_of_lonkero_at_Hotel_Hanasaari.jpg",
    ],
  },
  {
    slug: "drinking-in-finland",
    title: "Drinking in Finland",
    aliases: ["Alko", "kalsarikännit", "pantsdrunk"],
    shortDescription:
      "Finland tried prohibition in 1919, ran it for thirteen years, and has spent the century since slowly walking it back — from rationing books to last year's law that finally let supermarkets sell something stronger than weak beer.",
    longDescription: [
      "Finland's relationship with alcohol is best read as a hundred-year argument between an intoxication-focused folk tradition and a state apparatus that has tried, with mixed results, to manage it. The folk side is real: per capita pure-alcohol consumption was 8.7 litres in 2023, the highest in the Nordics, and Finnish drinking has historically been weekend-loaded and intoxication-oriented rather than the mealtime pour you'd find in France. The state side is also real: alcohol stronger than 8% is sold only at Alko, the state monopoly, in 364 stores nationwide that close at 21:00 on weekdays, 18:00 on Saturdays, and not at all on Sundays.",
      "Prohibition arrived in 1919 — Finland was the fifth country in the world to try it — and lasted until 1932, when a referendum killed it. Smuggling boomed in between (\"pirtu\" — spirit-grade ethanol — came in by motorboat from Estonia and Germany, and Helsinki's Rautatientori square became a half-open pirtu market). The 1932 successor was Alko, the state monopoly that has run distribution ever since. From 1944 to 1956 every legal purchase was stamped into a personal booklet (the viinakortti); rationing in some form continued until 1970. The generation that came of age right after rationing ended drank more than any Finnish generation before or since, and a lot of the country's contemporary drinking habits were set then.",
      "The legal frame has been thawing for thirty years. EU accession in 1995 broke Alko's production and import monopolies. The 2018 Alcohol Act let supermarkets sell up to 5.5% ABV (which is what put canned lonkero, gin-based mixers, and stronger beers next to the milk). In 2024 the limit rose again, this time to 8% — Alko's lower-alcohol wines moved into K-Markets and Prismas almost overnight. Each step took a national argument; each step happened anyway. Alko itself, often cast as the villain of the story, runs a remarkably good wine and spirits retail operation — the staff are well-trained, the selection is broad, and prices are roughly what they'd be in any EU country once tax is in.",
      "The cultural picture is shifting at least as fast as the law. The 2010s saw the craft-brewing scene rocket from under ten breweries to over a hundred, and \"intoxication for its own sake\" started giving way to \"experience drinking\" — better beer, less of it. Younger Finns drink considerably less than their parents did at the same age; non-drinking is no longer a social oddity. The internet's favourite recent contribution to all this is kalsarikännit — literally \"underwear-drunkenness,\" loosely \"pantsdrunk\" — the very Finnish concept of staying home alone, in your underwear, with a drink and a streaming service, with no intention whatsoever of going out. It briefly went viral in 2018 as Finland's answer to hygge. Both things are true: the binge tradition is loosening, and the introvert tradition is doing better than ever.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Alko_helsinki_rautatientori.png",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Confiscated_bootleggers'_motorboats_at_the_Oulu_harbour.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Pirtukanistereiden_myyntiä_Rautatientorilla_kieltolain_aikana_-_N2256_(hkm.HKMS000005-000001fd).jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Alko_interior_20190202.jpg",
    ],
  },
  {
    slug: "veikkaus",
    title: "Veikkaus",
    aliases: ["Veikkaus", "Lotto", "pajatso"],
    shortDescription:
      "For eighty-five years Finland trusted all of its gambling to a single state company and funnelled the profits to libraries, sports clubs, and disability charities. The slot machines in every supermarket entryway are part of how it worked.",
    longDescription: [
      "Veikkaus is the state-owned company that has held a near-total monopoly on Finnish gambling since the 1940s — Lotto and Eurojackpot, scratch cards, online casino games, sports betting (the long-form Pitkäveto and the football-pool Vakio), and the slot machines you'll see clustered by the entrance of almost every Finnish supermarket. The deal was simple and very Finnish: a single trustworthy operator runs all the gambling, keeps it out of mafia and mafia-adjacent hands, and distributes the proceeds — roughly €1 billion a year at peak — to the public good.",
      "The current company was assembled on 1 January 2017 from a merger of three older monopolies. The original Veikkaus had been founded in 1940 as Oy Tippaustoimisto Ab by national sports federations to bankroll athletes; RAY (the Finnish Slot Machine Association) had run gambling machines since 1938, mostly to fund disability and welfare charities; Fintoto handled horse-racing pari-mutuel betting. The Saturday-night Lotto draw, launched in 1970 and broadcast live on Yle ever since, is the cultural anchor: a fixed slot in the national week where the country, in a low-key way, all watches the same numbered balls roll.",
      "Veikkaus' charity model is why Finns mostly liked the monopoly even when foreign critics didn't. By law, profits go to three ministries: 53% to Education and Culture (sports clubs, the arts, science, youth work), 43% to Social Affairs and Health (disability charities, addiction services, public health), and 4% to Agriculture (mostly horse racing). Almost every public library, swim hall renovation, mid-sized sports club, and youth association in the country has had a Veikkaus euro pass through it. The pajatso — the traditional Finnish pinball-meets-slot machine that became ubiquitous in cafés in the 1950s — is in many ways the symbolic ancestor of all this: a coin-op game whose proceeds fed back into the community that played it.",
      "That model is now ending. By the late 2010s more than 60% of Finnish online gambling was already flowing offshore to foreign sites, and the monopoly's main argument — that it kept gambling under domestic, charitable control — was wearing thin. Parliament passed a sweeping reform in 2025: licence applications opened on 1 March 2026, and licensed online casinos, betting, and bingo will launch on 1 July 2027. Veikkaus keeps the lottery games (Lotto, Eurojackpot, Keno), scratch cards, and physical slot machines and casino floors. The number of supermarket slot machines has been falling for years already, age verification is much tighter, and Finland has begun to acknowledge in public what neighbouring countries figured out earlier: that some of the social cost of those friendly little supermarket pajatsos was being paid by the people who could least afford it.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Veikkauspiste_2016.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Pelaamo_Prisma_Limingantulli_Oulu_20180604.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Pajatso.JPG",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Veikkaus_Lotto.jpg",
    ],
  },
  {
    slug: "swearing-in-finland",
    title: "Swearing in Finland",
    aliases: ["perkele", "vittu", "saatana"],
    shortDescription:
      "Vittu, perkele, saatana — Finland turned three short words into something close to a national art form, used as punctuation, rhythm, and a stand-in for whole sentences.",
    longDescription: [
      "Finnish swearing has a reputation abroad as an art form, and the reputation is mostly earned. The Big Three are vittu (literally female genitalia, deployed roughly the way English uses \"fuck\"), perkele (the Devil, but with the weight of a hammer-blow — used for determined frustration), and saatana (Satan, a mid-strength intensifier). Helvetti (hell) and jumalauta (\"God help me,\" used like \"goddamn it\") fill out the working set. None of these translate cleanly: in Finnish they function as adjectives, adverbs, intensifiers, and rhythmic fillers, and the cadence — where the stress lands, how long the vowels are drawn out — is half of what the word means.",
      "Perkele has the most interesting story. The word comes from Proto-Indo-European *Perkʷūnos, the same etymological root that gave Lithuanian Perkūnas and Slavic Perun — all of them pagan thunder gods. In pre-Christian Finland the equivalent figure was Ukko, the chief god of the sky and storms. When Lutheran missionaries arrived they did what missionaries usually did: they took the most powerful name in the local pantheon and made it the name of the Devil. Mikael Agricola's 1548 New Testament rendered \"Satan\" as \"Perkele,\" and the word stayed in official Bible translations until 1992, when it was finally replaced with \"paholainen.\" So when a Finn shouts \"PERKELE\" at a frozen car battery, they are, technically, invoking a four-thousand-year-old thunder god who got demoted to the Devil and is now mostly used to express that someone has stubbed their toe.",
      "In modern use the words have texture. Vittu is the workhorse, generationally tilted toward anyone under 50, and slips into sentences as a comma (\"hae se vitun avain\" — \"go get the [damn] keys\"). Perkele is more emphatic, slightly older-rural-coded, and famously slow when whispered through clenched teeth — a single drawn-out \"per-ke-le\" can do the work of a paragraph. Saatana sits in between. There's also the celebrated cultural meme of \"management by perkele,\" the Nokia-era stereotype of Finnish executives running global companies by force of stoic determination, with the Devil as middle name. A long-running joke holds that perkele is the Finnish equivalent of sisu — sisu is what you have, perkele is what you say while you're using it.",
      "Visitors should listen rather than imitate. Placement, prosody, and timing take years to internalize, and a non-Finn dropping perkele lands as parody, not fluency. But you'll hear all three constantly — under breath in supermarket queues, on the ice at every hockey game, in songs, and in subtitled films where the English translation suddenly looks thin. The thisisFINLAND emoji set released for the country's 2017 centenary even includes a pair of swear-adjacent entries (a Finnish headbanger; a determined sisu fist), Finland's gentle nod to the fact that this is, indeed, part of how the country talks.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Lighting_In_The_Sky_Above_Helsinki.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Thunder_storm_rising_in_Suodenniemi.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Thunderous_weather_rising_above_Metsola.JPG",
    ],
  },
  {
    slug: "juhannus",
    title: "Juhannus (Midsummer)",
    aliases: [
      "Juhannus",
      "Juhannusaatto",
      "Midsummer",
      "Midsummer Eve",
      "Midsummer Day",
    ],
    shortDescription:
      "On the longest day of the year Finland empties: cities fall silent and roughly half the country drives to a lake, lights a bonfire, and stays up through a night that never gets dark.",
    longDescription: [
      "Juhannus is the Finnish summer solstice — Midsummer Eve (Juhannusaatto) on the Friday between June 19 and 25, Midsummer Day (Juhannuspäivä) on the Saturday after. In 2026 those fall on the 19th and 20th. It's a national holiday and a flag day (the blue cross runs from 6pm Friday through 9pm Saturday — the only night of the year the Finnish flag stays up overnight), but more importantly it's the week the country physically empties out. Helsinki turns into one of those after-the-rapture photographs — half-empty trams, supermarkets closing early, restaurants shut for three days — while an estimated 2.4 million Finns drive to a summer cottage on a lake somewhere.",
      "The festival is older than the country. Pre-Christian Finns marked the solstice with Ukon juhla, a feast for Ukko the sky god — bonfires, fertility rituals, and the magic of the midnight sun. When the church arrived in the 12th century the celebration was rebranded as the feast of John the Baptist (June 24), and the Finnish name Juhannus comes from \"John.\" The pagan layer never really went away. Single women still pick seven different wildflowers and place them under their pillow to dream of a future spouse; couples who jump over the bonfire are said to stay together; rolling naked in dewy grass is, depending on who you ask, beautifying or just very Finnish.",
      "The bonfire — kokko — is the visible centrepiece. Originally an eastern-Finland tradition (the oldest written description is from Turku in 1645), it's now lit anywhere a body of water meets a wood pile: at dusk, fed through the small hours, supposedly chasing away evil spirits but mostly gathering everybody around the only warm spot in a cool midsummer night. Birch branches go up against doorways for luck (juhannuskoivut), the sauna gets fired hard, and most cottages cycle through sauna, lake plunge, beer, sauna, lake, sausage on the grill, until 4am when nobody's tired but everyone's sun-drunk.",
      "If you're stuck in Helsinki for Juhannus, the city is still magical — empty streets, gold light at midnight, the seafront eerily peaceful — but you'll want a destination. Seurasaari Open-Air Museum has run the city's marquee bonfire since 1956; a newlywed couple traditionally lights the main fire from a church boat, and tens of thousands turn up. Most museums and many restaurants close fully Friday through Sunday — assume nothing's open and check websites. And bring a windbreaker: midsummer in Helsinki can be 25°C and it can be 12°C with horizontal rain, often in the same afternoon.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Midsummer_bonfire_in_Pielavasi,_Finland.JPG",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/A_midsummer_pole_(Juhannussalko)_in_front_of_Raseborg_Castle_(Raaseporin_linna).jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Midsummer_in_Kilpisjärvi,_Lapland_(52222783091).jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Midsummer_in_Finland,_Joensuu_2024.jpg",
    ],
  },
  {
    slug: "vappu",
    title: "Vappu (May Day)",
    aliases: [
      "Vappu",
      "Vappuaatto",
      "May Day",
      "sima",
      "munkki",
      "tippaleipä",
    ],
    shortDescription:
      "A pagan welcome-to-spring, an academic graduation party, an international workers' day, and a national excuse to drink sima and eat doughnuts in a park — all stacked into the same 24 hours every May.",
    longDescription: [
      "Vappu is the most chaotic holiday on the Finnish calendar because it's at least three holidays in a trench coat. May Day Eve (30 April, Vappuaatto) and May Day proper (1 May) layer a pagan welcome-to-spring ritual on top of the medieval feast of Saint Walpurga, on top of the year-end celebration of Finnish university students, on top of the international workers' day. They all happen at once, mostly outdoors, mostly with a drink in hand. The country basically doesn't function for two days.",
      "The starting gun fires at 6pm on April 30, in Helsinki's Market Square. A delegated student crew from one of the city's universities ceremonially washes the Havis Amanda statue (a bronze mermaid by Ville Vallgren, unveiled 1908) and crowns her with a giant white student cap. Some hundred thousand people pack the surrounding square and Esplanade. The capping itself dates back, unofficially, to 1909 — students put a cap on her without permission — and was finally police-sanctioned in 1951; it now rotates between universities. The white cap (ylioppilaslakki) on Manta's head is the same cap every Finn earns at high-school graduation and digs out of a closet exactly twice a year — for Vappu, and for personal occasions. Engineering students, alone among the tribes, also pull on bright-coloured boilersuits covered in event patches.",
      "The food is the reliable bit. Sima — a lightly fermented honey-and-lemon soft mead, sweet, fizzy, and 1–2% ABV — is brewed at home days in advance with raisins floating in the bottle as a fermentation indicator (when the raisins float to the top, it's ready). Munkki is the deep-fried, sugar-rolled doughnut bakeries pile into windows for two weeks a year; tippaleipä is its more architectural cousin, a tangle of batter funnelled into hot oil to produce a crispy bird's nest dusted with powdered sugar. Both predate Vappu — they're 18th-century upper-class festive sweets — but became the official May Day pastries in the late 1800s and now show up in every café, kiosk, and grocery store from late April. A glass of sima and a munkki is the universal Finnish Vappu breakfast.",
      "May 1 itself is Helsinki's biggest picnic. Tens of thousands fan out across Kaivopuisto Park on the southern tip of the peninsula, blankets edge-to-edge, with everything from elaborate three-course spreads (silver candelabras, linen napkins, a relative in a tuxedo) to a bag of munkkis and a bottle of cheap sparkling. There's also a workers'-day march in the morning — Vappu has been Finland's official Labour Day since 1944, and the unions still parade — but for most Finns the political layer is now background and the foreground is sima, picnic, and the first warm day of the year. If the weather collaborates the parks are full until midnight; if it doesn't, everyone retreats inside and drinks the sima anyway.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Crowning_of_the_Havis_Amanda_statue_on_May_Day_eve_(April_2019).jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Sima_and_tippaleipä.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Mead_and_doughnut_20180501.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Havis_Amanda_at_Vappu_2008.jpg",
    ],
  },
  {
    slug: "independence-day",
    title: "Independence Day",
    aliases: ["Independence Day", "Itsenäisyyspäivä", "Linnan juhlat"],
    shortDescription:
      "On the night of December 6, two candles burn in every Finnish window and three million people watch the President shake 2,000 hands on television. It's the quietest, strangest, most-watched national holiday in Europe.",
    longDescription: [
      "Finland declared independence from the collapsing Russian Empire on 6 December 1917. The Senate, led by Pehr Evind Svinhufvud, drafted the declaration; the Parliament adopted it the same day. Soviet Russia recognised it on 31 December (the first country to do so), then Germany, France, and Sweden in early January 1918. The civil war that broke out the following spring nearly tore the new country in half, but the date stuck. Itsenäisyyspäivä — Independence Day — is now the most solemn entry on the Finnish calendar, and remarkably unlike independence days elsewhere. There are no fireworks, no parades down main streets, no parties in the conventional sense. The mood is closer to a national memorial day than a national birthday.",
      "The day's defining ritual is candles in windows. By tradition every Finnish household lights two candles — increasingly white and blue — in their front-facing windowsills at 6pm. The custom is officially traced to 1927, but two candles in a window had been a Finnish nationalist signal for decades before that: lit on the poet Runeberg's birthday in the 1800s as a quiet protest against Russian rule, and during 1916–17 reportedly used to mark safe houses for jäger volunteers slipping out to Sweden and Germany for military training. Walk through any Finnish neighbourhood after dark on December 6 and the streetscape is a thousand pairs of small flames in the windows. Most families also light candles at the graves of war veterans; cemeteries glow.",
      "The capital adds two big set pieces. In the late afternoon the Helsinki student unions assemble at Hietaniemi cemetery — at the Sankariristi war memorial and Marshal Mannerheim's grave — and march in a torchlight procession through the city, white student caps on, flags out front, ending at Senate Square. The route, established in 1951, follows Mannerheim's funeral cortège in reverse. From 7pm the President hosts the Independence Day Reception at the Presidential Palace on the Esplanade — the Linnan juhlat, \"the Castle Ball.\" Two thousand guests are invited: parliamentarians, ambassadors, Olympic medallists, scientists, artists, military officers, anyone who has had a notable year. They all queue up to shake the President's hand on live television.",
      "Linnan juhlat is the country's media event of the year. Yle's broadcast routinely pulls 2.0–2.7 million viewers — out of a population of 5.6 million — and the most-watched stretch is the entrance: a single steady camera, every guest announced, every gown and uniform commented on by the country watching from sofas. Most Finns aren't particularly invested in who got invited and yet absolutely will tell you, the next morning, what so-and-so wore. It's a uniquely Finnish piece of pageantry — stiff, formal, slightly solemn, completely unironic. Yle's other Independence Day fixture, broadcast every year since 2000, is Edvin Laine's 1955 black-and-white film Tuntematon sotilas (The Unknown Soldier), Väinö Linna's bleak and beloved Continuation War story. Visitors should plan accordingly: museums and many restaurants close, the city is quiet, and the country is, for one evening, watching itself together.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Presidential_Palace_Finland_Independece_day_2011.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Linnan_juhlat_Kaimu.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Tynkkynen_612-soihtukulkueessa.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Suonionkatu_Kallio_Helsinki_Finland_06_Dec_2008.jpg",
    ],
  },
  {
    slug: "midnight-sun",
    title: "Midnight Sun",
    aliases: ["midnight sun", "nightless night", "polar day", "yötön yö"],
    shortDescription:
      "A quarter of Finland sits north of the Arctic Circle, where the sun simply doesn't set for up to 73 days each summer. Even Helsinki, 1,000 km south, never gets properly dark in June.",
    longDescription: [
      "The midnight sun — yötön yö in Finnish, literally \"nightless night\" — is the Arctic summer phenomenon where the sun stays above the horizon for a full 24 hours. It happens because Earth's axis is tilted 23.5° relative to its orbit, and during the northern summer that keeps everything inside the Arctic Circle (66°33′ N) permanently turned toward the sun for weeks at a stretch. Above that line, midnight just looks like late afternoon: golden, oblique, slightly disorienting. Below it, the sun technically dips below the horizon for an hour or two but never goes far — twilight bleeds straight into the next dawn.",
      "The further north you go, the longer the show runs. At Nuorgam, Finland's northernmost village near the Norwegian border, the sun does not set for about 73 days — roughly mid-May to late July — and \"true night\" doesn't return until mid-September. At Utsjoki and Inari it's about two months. At Rovaniemi, sat right on the Arctic Circle and famous for Santa Claus Village, the unbroken midnight-sun window is a tidy 32 days, June 6 to July 7 (atmospheric refraction pushes it slightly past the geometric line). On the exact latitude of the Arctic Circle, you'd see the sun set for about 30 seconds and rise immediately; in practice refraction means it doesn't even do that.",
      "Even southern Finland gets a softened version of the same effect. Helsinki sits at 60°N — about the same latitude as Anchorage or the southern tip of Greenland — and around the summer solstice the city has roughly 19 hours of direct daylight and another two-and-a-half hours of dawn-blurring-into-dusk on either side of midnight. The sun dips below the horizon but only barely, and the sky stays that pale, pre-dawn blue all night. Locals call it valkoinen yö, the white night. People run marathons at 1am, eat dinner at 10pm and pretend it's 6pm, and sleep — when they sleep — behind blackout blinds bought specifically for the season.",
      "For visitors, the practical bits matter. The midnight sun changes how you plan a day: hike or paddle through the small hours when the light is best, sleep through the heat of mid-afternoon, and budget a dark room or an eye mask because hotels north of Oulu often don't bother with proper blackout curtains. Mosquitoes peak in June and early July across the same belt, especially near lakes — bring repellent. And the season is shorter than people expect: by mid-August even Lapland has restored a real nighttime, and by September Finland is on the rapid slide toward winter, which has the inverse phenomenon (kaamos — the polar night) waiting at the other end of the calendar.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Midnight_landscape_from_Oratunturi_towards_west,_Sodankylä,_Lapland,_Finland,_2019_June.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Half_past_midnight_at_the_Finnish_Gulf.JPG",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Lake_Kenesjärvi_in_summer_night.JPG",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Midnight_sun_and_Jatkankynttila_bridge_2020.jpg",
    ],
  },
  {
    slug: "paivakoti",
    title: "Päiväkoti",
    aliases: ["päiväkoti", "päiväkodit", "varhaiskasvatus", "Finnish daycare"],
    shortDescription:
      "Finland's daycare system runs on the conviction that childhood is intrinsically valuable, not a runway to literacy — kids learn through play, no formal reading until age seven, and outside two or three times a day in any weather.",
    longDescription: [
      "A päiväkoti is a Finnish daycare centre, but the Finnish daycare centre is something distinctive enough that it deserves a name in English too. Children from about nine months to six years spend their days there learning through play — not preparing for school but learning *as* children, with the explicit conviction that childhood is intrinsically valuable rather than a runway to literacy and numeracy. Reading is not formally taught in Finland until age seven. Until then, the päiväkoti's job is to make sure kids play hard, eat well, are outside in every weather, and feel that the adults around them are paying attention.",
      "The system is anchored in the Act on Early Childhood Education and Care (540/2018) and a binding National Core Curriculum updated in 2022. Every child has a legal right to a place — a \"subjective right\" that kicks in at the end of parental leave around nine or ten months — and parents pay a sliding-scale fee that runs from €0 to €311 per month depending on family income, with a sibling discount on top. The state covers the rest; Finnish parents pay roughly fourteen percent of the actual cost of care. Pedagogy is led by university-trained ECE teachers under staff-to-child ratios of 1:4 for under-3s and 1:7 for ages three to five.",
      "The official term for the approach is the \"educare\" model — education and care woven together with pedagogy emphasised. In practice that means a guided-play curriculum (free play and structured play, both with learning goals), no grades, no homework, no standardised tests, and the famous Finnish refrain *ei ole huonoa säätä, on vain huonoja vaatteita* — there's no bad weather, only bad clothing. Kids are outside two or three times a day in -15°C with proper kit; rain in October doesn't move anyone indoors. The visible Finnish traits — calm with strangers, comfortable in silence, comfortable in nature — are largely seeded here.",
      "Walk past a päiväkoti at any point in the day and the surface evidence is consistent: a fenced yard with kids in matching reflective vests, three or four adults watching them rather than entertaining them, a row of prams under a roof for naps. Don't be surprised by toddlers chewing sticks, climbing trees with no one rushing to catch them, or napping outside in February. That's not negligence — it's the system, and it's the foundation under the same education pipeline that produces Finland's PISA scores a decade later.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Lapsia_leikkikentällä_Tokoinrannassa_-_N213302_-_hkm.HKMS000005-000011y9.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Päiväkoti_Taikurinhattu.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Lassin_päiväkoti_Tuiranpuisto_Oulu_20251130.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Playground_carousel_under_snow.jpg",
    ],
  },
  {
    slug: "outdoor-baby-naps",
    title: "Outdoor Baby Naps",
    aliases: [
      "outdoor nap",
      "outdoor naps",
      "outdoor napping",
      "outdoor pram nap",
      "outdoor pram naps",
      "napping outdoors",
    ],
    shortDescription:
      "Walk past a Helsinki café in February and you'll see prams parked along the front window — babies asleep inside under wool blankets at -10°C while their parents drink coffee on the other side of the glass. Finnish babies sleep better outside, and they have done since their grandparents were born.",
    longDescription: [
      "Walk past a Helsinki café in February and you'll see them: prams parked along the front window, babies inside under wool blankets, asleep, while their parents sit indoors with a coffee on the other side of the glass. Or no glass at all — the pram on the apartment balcony, the pram in the garden, the pram in the snow at -10°C with a baby inside. To non-Nordic visitors this is alarming. To Finns it's the most ordinary thing in the world: babies nap better outside, and they have done since around the time their grandparents were born.",
      "The practice began as a public-health campaign in the early twentieth century. Nordic maternity clinics, contending with infectious-disease wards and cramped urban housing, urged parents to give infants as much fresh air as possible — preferably year-round, preferably outside, preferably in serious cold. Cold air was thought (correctly, more or less) to lower infection risk and to support stronger lungs. The advice stuck. By the late twentieth century outdoor napping was simply what Finnish, Swedish, Norwegian, Icelandic, and Danish parents did, and the maternity nurses still recommended it.",
      "The numbers from Oulu, in northern Finland, are striking. A 2008 study found that about 95% of local families let their babies nap outside, often starting around two weeks old and sometimes as early as three days. Parents reported -6°C as the ideal napping temperature, with many comfortable down to -15°C and a few going below -27°C — provided the baby is in the right gear: a thick wool layer, a snowsuit, a wind-tight pram cover, no loose blankets near the face. A 2021 University of Oulu follow-up found that infants who napped outdoors slept 30 to 90 minutes longer than indoors-nappers, and 88% of parents said their baby clearly preferred it.",
      "The pram-on-the-pavement scene — left outside a café while a parent eats inside — also tells you something about Finnish public trust. It is unusual abroad and unremarkable here. As a visitor: don't intervene if you see it; the parent is paying attention through the window, the baby is fine. If you're travelling with an infant and want to try it, the rule of thumb most Finns will give you is *if the baby's cheeks and nose are warm and pink rather than cold and white, they're fine* — hands and feet always feel cold and aren't a useful signal.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Old-fashioned_pram_in_pine_woods.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Old-fashioned_pram_in_pine_woods_2.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Mother_and_child_1948_(JOKAUAS2_151-4).jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Sauvosaari-1968.jpg",
    ],
  },
  {
    slug: "moomins",
    title: "Moomins",
    aliases: [
      "Moomin",
      "Moomins",
      "Moomintroll",
      "Moomintrolls",
      "Tove Jansson",
      "Moominhouse",
    ],
    shortDescription:
      "A family of round, friendly hippopotamus-shaped trolls living in a blue house in the Finnish archipelago — Tove Jansson's 1945 invention is now the most identifiable Finnish cultural export, with Japan as its second home and Naantali as its summer theme park.",
    longDescription: [
      "The Moomins are a family of round, gentle, hippopotamus-shaped creatures who live in a tall blue house in a wooded valley somewhere in the Finnish archipelago, get into low-stakes adventures, and host a rotating cast of philosophical hangers-on — the wandering musician Snufkin, the anarchic Little My, the romantic Snork Maiden, the unsettling Hattifatteners. They are, depending who you ask, the most beloved children's characters in twentieth-century Nordic literature, the most identifiable Finnish cultural export, or the strangest set of melancholy-philosophical creatures ever marketed to under-tens. All three are correct.",
      "Their author, Tove Jansson (1914–2001), was a Helsinki-born painter, illustrator, and writer from Finland's Swedish-speaking minority — the books were originally written in Swedish — and the spiritual landscape of the Moomins is the small, rocky, forested archipelago east of Helsinki where she spent her childhood summers and, later, thirty summers with her partner Tuulikki Pietilä on a tiny island called Klovharu. The first book, *The Moomins and the Great Flood*, appeared in 1945 and barely sold. The second and third picked up steam, and by the time Jansson agreed to draw a Moomin comic strip for the *London Evening News* in 1952 — then the world's largest daily paper at twelve million copies — the Moomins were on their way to becoming a global brand.",
      "Today the books have been translated into over sixty languages, an astonishing reach for an author writing in Swedish about Finnish trolls. Japan is the largest market by a wide margin and has been since Fuji TV broadcast a 65-episode anime adaptation in 1969 — partly storyboarded by the young Hayao Miyazaki — which gave the Moomins a second cultural home. A 2014 fan poll there ranked Little My first, Snufkin second, and Moomintroll only third; Japanese fans tend to gravitate toward the introverted, free-spirited, slightly prickly characters rather than the central family. Finland and Japan are now the two countries where you can reliably find Moomin Cafés, Moomin shops, Moomin-branded planes (Finnair has flown a few), and Moomin festival days.",
      "In Finland itself you can encounter the Moomins as serious art and as serious commerce, often at the same time. The Moomin Museum in Tampere — the only one in the world — holds about 2,000 of Jansson's original Moomin illustrations and a remarkable collection of three-dimensional tableaux that Jansson, Pietilä, and engineer Pentti Eistola built by hand over years. Moomin World, a summer-only theme park on Kailo island next to Naantali, is in this catalogue under Ideas. Iittala glassware in Moomin patterns is in every souvenir shop. And if you're reading Jansson cold as an adult, start with *The Summer Book* (her quiet adult novel about an old woman and her granddaughter on an archipelago island) or with *Moominland Midwinter* — both are stranger and sadder than the merchandise might lead you to expect.",
    ],
    thumbnailUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Tove_Jansson_1956b.jpg",
    galleryUrls: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Muumimuseon_sisäänkäynti_Tampere-talossa.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Tuulikki_Pietilä_Tove_Jansson_and_Signe_Hammarsten-Jansson_1956.jpeg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Moomin_Coffee_at_Helsinki-Vantaa_Airport_in_Finland,_2021.jpg",
    ],
  },
];
