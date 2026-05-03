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
    aliases: ["sauna", "saunas", "sauna culture", "löyly"],
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
    title: "Winter swimming",
    aliases: [
      "winter swimming",
      "winter-swimming",
      "winter swimmer",
      "winter swimmers",
      "ice swimming",
      "ice-swimming",
      "ice swimmer",
      "ice swimmers",
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
];
