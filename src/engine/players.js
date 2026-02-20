/**
 * Players database — fictional players for all 128 national teams.
 * 25 players per team: 3 GK, 8 DF, 8 MF, 6 FW.
 * All players are fictional. Names are culturally coherent per nation.
 * Ratings are realistic relative to the team's overall strength.
 */
import { createPRNG, combineSeed } from './prng.js';
import { TEAMS } from './teams.js';

// Squad position layout (order matters for GK slot index)
export const SQUAD_POSITIONS = [
  'GK', 'GK', 'GK',
  'DF', 'DF', 'DF', 'DF', 'DF', 'DF', 'DF', 'DF',
  'MF', 'MF', 'MF', 'MF', 'MF', 'MF', 'MF', 'MF',
  'FW', 'FW', 'FW', 'FW', 'FW', 'FW',
];

// Goal-scoring weight multiplier by position
export const POSITION_GOAL_WEIGHT = {
  GK: 0.05,
  DF: 1,
  MF: 4,
  FW: 10,
};

// ── Name pools by cultural group ──────────────────────────────────────────────

const POOLS = {
  french: {
    first: ['Adrien','Alexandre','Antoine','Axel','Baptiste','Clément','Corentin',
      'Damien','Florian','François','Guillaume','Hugo','Kévin','Killian','Laurent',
      'Léo','Lucas','Mathieu','Maxime','Nicolas','Olivier','Pierre','Quentin',
      'Raphaël','Romain','Sébastien','Théo','Thomas','Timothée','Tristan',
      'Valentin','Victor','Yoann','Aurélien','Rémi','Enzo','Mattéo','Gaël'],
    last: ['Bernard','Blanc','Bonnet','Bouchard','Chevalier','Clément','Colin',
      'Denis','Dumont','Dupont','Durand','Fontaine','Garnier','Gautier','Girard',
      'Lambert','Laurent','Lecomte','Lefevre','Legrand','Lemaire','Leroux','Leroy',
      'Martin','Mathieu','Mercier','Morel','Moreau','Noel','Perrin','Petit','Picard',
      'Renard','Richard','Robert','Robin','Roux','Simon','Thomas','Vidal','Gagnon',
      'Lacroix','Laval','Rousseau','Beaumont','Beauchamp'],
  },
  spanish: {
    first: ['Adrián','Alejandro','Carlos','David','Diego','Eduardo','Fernando',
      'Francisco','Gabriel','Gonzalo','Héctor','Hugo','Javier','Jorge','José',
      'Juan','Julián','Kevin','Luis','Manuel','Marco','Marcos','Martín','Miguel',
      'Pablo','Pedro','Rafael','Raúl','Roberto','Rodrigo','Rubén','Sergio',
      'Tomás','Víctor','Álvaro','Borja','Dani','Isco','Koke','Mikel'],
    last: ['Alonso','Álvarez','Calvo','Castro','Cruz','Díaz','Fernández','Flores',
      'García','Gómez','González','Gutiérrez','Herrera','Jiménez','López','Martín',
      'Martínez','Medina','Méndez','Molina','Morales','Moreno','Muñoz','Navarro',
      'Ortega','Ortiz','Pérez','Ramírez','Reyes','Ríos','Rodríguez','Romero',
      'Ruiz','Sánchez','Silva','Torres','Vargas','Vega','Vidal','Iglesias',
      'Carvajal','Ramos','Busquets','Piqué','Villa'],
  },
  portuguese: {
    first: ['Adriano','Anderson','Bruno','Carlos','Danilo','Davi','Diego','Eduardo',
      'Fabio','Felipe','Fernando','Gabriel','Gustavo','João','Jonathan','Jorge',
      'Júnior','Leandro','Leonardo','Lucas','Luiz','Marcelo','Marcos','Mateus',
      'Matheus','Paulo','Pedro','Rafael','Rodrigo','Thiago','Vinicius','Rúben',
      'Gonçalo','João Pedro','Diogo','André','Nuno','Bernardo'],
    last: ['Almeida','Alves','Andrade','Barbosa','Barros','Batista','Borges',
      'Carvalho','Costa','Cunha','Dias','Ferreira','Fonseca','Freitas','Gomes',
      'Gonçalves','Lima','Lopes','Martins','Melo','Mendes','Miranda','Monteiro',
      'Moreira','Nascimento','Neves','Nunes','Oliveira','Pereira','Pinto','Ramos',
      'Reis','Ribeiro','Rocha','Santos','Silva','Soares','Sousa','Teixeira','Vieira',
      'Fernandes','Cancelo','Jota','Trincão'],
  },
  italian: {
    first: ['Alessandro','Andrea','Antonio','Davide','Emilio','Fabio','Federico',
      'Francesco','Giorgio','Giovanni','Giuseppe','Luca','Marco','Matteo','Michele',
      'Nicola','Paolo','Pietro','Roberto','Simone','Stefano','Tommaso','Valentino',
      'Gianluca','Lorenzo','Riccardo','Giacomo','Emanuele','Manuel','Cristian'],
    last: ['Amato','Barbieri','Bianchi','Bruno','Caruso','Colombo','Conti','Coppola',
      'Costa','De Luca','Esposito','Ferrari','Ferretti','Ferraro','Fontana','Gallo',
      'Greco','Lombardi','Mancini','Marchetti','Marini','Martini','Moretti','Orlando',
      'Palumbo','Ricci','Romano','Rossetti','Rossi','Russo','Santoro','Serra',
      'Sorrentino','Valentini','Verratti','Barella','Immobile','Chiesa'],
  },
  germanic: {
    first: ['Aaron','Alexander','Benedikt','Christian','Daniel','David','Fabian',
      'Felix','Florian','Jan','Jonas','Jonathan','Julian','Kevin','Lars','Leon',
      'Lukas','Markus','Matthias','Maximilian','Niklas','Patrick','Philipp',
      'Sebastian','Simon','Stefan','Tim','Tobias','Tom','Leroy','Serge','Jamal',
      'Robin','Niklas','Thilo','Joshua'],
    last: ['Bach','Bauer','Braun','Fischer','Friedrich','Fuchs','Graf','Hartmann',
      'Herrmann','Hofmann','Huber','Kaiser','Klein','Koch','König','Krause','Krüger',
      'Lange','Lehmann','Maier','Meier','Meyer','Müller','Neumann','Peters','Richter',
      'Roth','Schmidt','Schneider','Schulz','Schwarz','Vogel','Weber','Weiss',
      'Werner','Wolf','Brandt','Kimmich','Gnabry','Havertz'],
  },
  nordic: {
    first: ['Anders','Andreas','Bjorn','Carl','Christian','Daniel','Emil','Erik',
      'Finn','Fredrik','Gustav','Henrik','Jakob','Jonas','Karl','Lars','Magnus',
      'Marcus','Martin','Mikael','Nils','Oskar','Petter','Rasmus','Simon','Sven',
      'Tobias','Viktor','Erling','Martin','Pierre','Alexander','Kasper','Thomas'],
    last: ['Andersen','Berg','Bergman','Christensen','Dahl','Eriksen','Gustafsson',
      'Halvorsen','Hansen','Holm','Jakobsen','Jensen','Johansson','Karlsson','Larsen',
      'Lindgren','Nielsen','Nilsson','Olsen','Pedersen','Petersen','Rasmussen',
      'Sandberg','Svensson','Thorsen','Vestergaard','Haaland','Odegaard','Ibsen',
      'Claesson','Forsberg','Isak','Elanga'],
  },
  british: {
    first: ['Aaron','Adam','Ben','Bradley','Callum','Connor','Daniel','Dylan','Ethan',
      'George','Jack','Jacob','James','Joe','Joshua','Kyle','Liam','Luke','Mason',
      'Matthew','Nathan','Oliver','Owen','Reece','Ryan','Sam','Thomas','Tom','Tyler',
      'Will','Declan','Jadon','Marcus','Bukayo','Trent'],
    last: ['Allen','Bailey','Baker','Brown','Carter','Clark','Collins','Cook','Davies',
      'Davis','Edwards','Evans','Green','Hall','Harris','Hughes','Jackson','James',
      'Jones','Kelly','King','Lewis','Martin','Mitchell','Moore','Morris','Murphy',
      'Owen','Price','Roberts','Robinson','Smith','Taylor','Thomas','Thompson',
      'Turner','Walker','White','Williams','Wilson','Wright','Young','Rice','Saka'],
  },
  slavic_east: {
    first: ['Aleksei','Alexei','Andrei','Anton','Boris','Dmitri','Evgeny','Georgi',
      'Igor','Ivan','Kirill','Maksim','Mikhail','Nikita','Nikolai','Oleg','Pavel',
      'Roman','Ruslan','Sergei','Taras','Timur','Vasyl','Viktor','Vitaly',
      'Vladimir','Yuri','Artem','Denys','Mykola','Oleksandr'],
    last: ['Antonov','Borisov','Fedorov','Goncharov','Ivanov','Kovalev','Kozlov',
      'Kravchenko','Lebedev','Mikhailov','Morozov','Orlov','Pavlov','Petrov',
      'Savchenko','Semyonov','Shevchenko','Sidorov','Smirnov','Sokolov','Stepanov',
      'Tkachenko','Vasiliev','Volkov','Zhukov','Mudryk','Zinchenko','Yaremchuk',
      'Malinovsky','Tsygankov'],
  },
  slavic_west: {
    first: ['Adam','Andrzej','Bartosz','Damian','Dawid','Filip','Jakub','Kamil',
      'Krzysztof','Lukasz','Maciej','Marcin','Marek','Mateusz','Michal','Milan',
      'Ondrej','Patrik','Piotr','Radoslav','Robert','Stanislaw','Tomas','Wojciech',
      'Arkadiusz','Robert','Grzegorz','Kamil','Rafal'],
    last: ['Blaha','Cech','Czerwinski','Duda','Glowacki','Januszewski','Kovar',
      'Kowalski','Lewandowski','Majer','Novotny','Pazdera','Prochazka','Sobczak',
      'Svoboda','Szymanski','Wrobel','Zajicek','Zawadzki','Krychowiak','Zielinski',
      'Frankowski','Bielik','Milik','Bednarek'],
  },
  balkan: {
    first: ['Ante','Branimir','Dario','Dejan','Denis','Domagoj','Dragan','Duje',
      'Filip','Goran','Ivan','Josip','Luka','Marko','Mario','Milan','Mislav',
      'Nikola','Petar','Robert','Sven','Tomislav','Vedran','Vlad','Aleksandar',
      'Bojan','Stefan','Sergej','Dušan'],
    last: ['Babić','Boras','Budimir','Gvardiol','Jurić','Kovačić','Krstović','Lovrić',
      'Majstorović','Majer','Modrić','Perišić','Petković','Pjaca','Rakitić','Rebić',
      'Sosa','Stanišić','Vlašić','Jovic','Milinkovic','Tadic','Kostic','Lukic',
      'Lazovic','Djuricic'],
  },
  north_african: {
    first: ['Achraf','Amine','Anis','Ayman','Ayoub','Bilal','Farid','Hassan',
      'Houssem','Ismail','Khalil','Mohamed','Mohammed','Montassar','Nasser','Omar',
      'Rachid','Rayan','Samir','Sofiane','Wahbi','Walid','Yassine','Zakaria',
      'Nabil','Youcef','Ryad','Adem'],
    last: ['Aboukhlal','Amrabat','Azzedine','Belhanda','Benali','Benrahma',
      'Bouanani','El Kaabi','El Yamiq','Ghezzal','Guedioura','Hakimi','Khaoui',
      'Ounahi','Saiss','Slimane','Taarabt','Ziyech','Mahrez','Bennacer',
      'Aouar','Bensebaini','Mandi','Slimani','Brahimi'],
  },
  west_african: {
    first: ['Abdoulaye','Aboubakar','Cheick','Cheikhou','Emmanuel','Ibrahim',
      'Idrissa','Ismaila','Joel','Kelechi','Mamadou','Musa','Odion','Oumar',
      'Samuel','Sébastien','Serge','Tariq','Victor','Wilfried','Youssouf',
      'Sadio','Kalidou','Gana','Nicolas','Simon','Hamari'],
    last: ['Aurier','Ballo-Touré','Diabaté','Diallo','Diedhiou','Doucouré',
      'Gueye','Konaté','Kouyaté','Mané','Mbaye','Mendy','Ndiaye','Sabaly',
      'Sané','Sarr','Traoré','Touré','Iheanacho','Osimhen','Ndidi','Onyeka',
      'Ekitike','Onana','Toko Ekambi'],
  },
  east_african: {
    first: ['David','Dennis','Eric','Francis','George','Henry','James','John',
      'Joseph','Kenneth','Moses','Patrick','Peter','Richard','Robert','Samuel',
      'Simon','Thomas','William','Michael','Daniel','Emmanuel','Paul','Philip'],
    last: ['Achieng','Adekunle','Agyemang','Asante','Atsu','Boateng','Essien',
      'Gyan','Kalou','Kante','Mensah','Nakamba','Partey','Sowah','Tetteh',
      'Wakaso','Waris','Mukiibi','Ouma','Ndungú','Chirwa','Phiri'],
  },
  middle_east: {
    first: ['Abdullah','Ahmad','Ahmed','Ali','Amjad','Fawaz','Hassan','Hussein',
      'Khaled','Mahmoud','Mohamed','Mohammad','Nasser','Omar','Rakan','Saleh',
      'Sami','Tariq','Yasser','Younis','Abdulrahman','Nawaf','Salem','Firas'],
    last: ['Al-Bishi','Al-Dosari','Al-Ghamdi','Al-Harbi','Al-Hassan',
      'Al-Mohammadi','Al-Shahrani','Aldawsari','Alhajj','Almutairi','Alnaim',
      'Alsaiari','Alshehri','Asiri','Khalid','Al-Hayos','Al-Rawi','Al-Zori',
      'Maran','Salim','Taha'],
  },
  east_asian: {
    first: ['Bo','Chen','Chul','Daichi','Gaku','Guang','Hiroki','Hwan','Jae',
      'Jun','Junhee','Kai','Keisuke','Ken','Kohei','Kota','Min','Ren','Rui',
      'Ryota','Seung','Sho','Shuto','Sung','Takefusa','Wei','Wooyoung','Xiao',
      'Yong','Yu','Yuji','Yuto','Hwang','Son','Kim'],
    last: ['Ahn','Chen','Cho','Doan','Han','Hayashi','Hwang','Itakura','Jung',
      'Kamada','Kim','Ko','Kubo','Lee','Lim','Liu','Ma','Mitoma','Na','Oh',
      'Osako','Park','Ryu','Son','Tomiyasu','Wang','Wu','Yang','Zhang','Cho',
      'Hong','Kwon','Jang'],
  },
  southeast_asian: {
    first: ['Ahmad','Amirul','Arif','Bagas','Egy','Fandi','Haris','Ilhan',
      'Irfan','Jakkaphan','Muhammad','Nguyen','Pham','Safawi','Supachai',
      'Suphanat','Teerasak','Thirawuth','Toni','Tristan','Pratama','Rizky'],
    last: ['Asa-Lee','Boonmatan','Fauzi','Hanis','Juanda','Kunhong','Mano',
      'Pitak','Rasid','Sinthaweechai','Thairatana','Tossama','Tuankaew',
      'Hasyim','Rahmat','Suryanto','Le','Pham','Nguyen','Tran'],
  },
  central_asian: {
    first: ['Abror','Akbar','Amir','Bobur','Dilshod','Dosbol','Eldor','Javokhir',
      'Jasur','Mirzo','Nodir','Oybek','Rustam','Sardor','Shamsiddin','Ulugbek',
      'Bekzod','Jakhongir','Otabek','Temur'],
    last: ['Ashurmatov','Bakaev','Dzhenaliev','Jaborov','Khakmov','Kholmatov',
      'Mamytbekov','Shomurodov','Shukurov','Tursunov','Umarbaev','Narzullayev',
      'Komilov','Yusupov','Matchanov'],
  },
  oceanian: {
    first: ['Ben','Blake','Cameron','Chris','Daniel','Dylan','Ethan','Hamish',
      'Jake','James','Joe','Jordan','Josh','Kieran','Liam','Luke','Michael',
      'Nathan','Oliver','Ryan','Sam','Scott','Sean','Tim','Tom','Mitchell'],
    last: ['Brown','Burns','Campbell','Clarke','Cook','Davidson','Davies',
      'Edwards','Evans','Ferguson','Gibson','Graham','Grant','Green','Hall',
      'Harrison','Hughes','Johnson','Jones','King','MacDonald','Marshall',
      'Martin','Mitchell','Morgan','Roberts','Robinson','Ross','Scott',
      'Simpson','Smith','Taylor','Thompson','Ward','White','Williams','Wilson'],
  },
  pacific_islander: {
    first: ['Afu','Alofa','Amani','Faleolo','Fano','Fonotia','Ioane','Kafoa',
      'Kali','Lapua','Lotefa','Manu','Noa','Semi','Tala','Tana','Tuia','Ulupano',
      'Sione','Tuilagi','Finau','Havili'],
    last: ['Apa','Atiola','Faleolo','Faleo','Fano','Feao','Finau','Folau',
      'Fonoti','Havili','Ioane','Kafoa','Koroi','Lauaki','Lavaka','Lotefa',
      'Manu','Naupoto','Patolo','Perenise','Tanivula','Tuatagaloa','Fifita',
      'Vunipola','Tuilagi'],
  },
  iranian: {
    first: ['Alireza','Ali','Amir','Ehsan','Karim','Majid','Mehdi','Mohammad',
      'Mojtaba','Morteza','Ramin','Reza','Saeid','Saman','Sardar','Shahab',
      'Voria','Milad','Omid','Kaveh'],
    last: ['Azmoun','Beiranvand','Cheshmi','Dehkordi','Ezatolahi','Ghafouri',
      'Gholizadeh','Hajsafi','Hosseini','Jahanbakhsh','Karimi','Khanzadeh',
      'Mohammadi','Moradi','Nourollahi','Pouraliganji','Rezaei','Shojaei','Taremi',
      'Ansarifard','Torabi','Sarlak'],
  },
  turkish: {
    first: ['Ahmet','Arda','Barış','Burak','Can','Cengiz','Dorukhan','Emre',
      'Ercan','Ferdi','Hakan','Halil','Hamza','Kenan','Kaan','Mehmet','Mert',
      'Orkun','Samet','Serdar','Uğur','Yusuf','Zeki','Oğuzhan'],
    last: ['Akgün','Altay','Arslan','Ay','Aydın','Ayhan','Bardakcı','Çalhanoğlu',
      'Çelik','Demiral','Dursun','Kahveci','Karaman','Kökcü','Müldür','Okay',
      'Soyuncu','Şahin','Tosun','Tufan','Türkmen','Ünder','Yıldız','Yılmaz',
      'Güler','Yazıcı'],
  },
  greek: {
    first: ['Anastasios','Christos','Dimitris','Georgios','Giorgos','Ioannis',
      'Kostas','Kyriakos','Lefteris','Makis','Manolis','Nikos','Panagiotis',
      'Stelios','Tassos','Vangelis','Vassilis','Yannis'],
    last: ['Alexandris','Antetokounmpo','Bakasetas','Fortounis','Gianniotas',
      'Hatzigiovanis','Kakaris','Karalis','Koulouris','Kyriakopoulos','Limnios',
      'Masouras','Pavlidis','Pelkas','Siopis','Stavropoulos','Tsimikas','Vlachodimos'],
  },
  hungarian: {
    first: ['Adam','Ádám','Attila','Balázs','Bence','Dávid','Gábor','Gyula',
      'István','László','Márton','Máté','Mihály','Péter','Roland','Szabolcs',
      'Tamás','Zoltán'],
    last: ['Bese','Botka','Dzsudzsák','Fiola','Gulácsi','Holman','Kecskés',
      'Kleinheisler','Lang','Loic','Nagy','Nego','Nikolic','Orban','Rossi',
      'Sallai','Schäfer','Szalai','Vécsei'],
  },
  romanian: {
    first: ['Adrian','Alexandru','Andrei','Bogdan','Ciprian','Constantin','Cosmin',
      'Dan','Dănuț','Flavius','Florin','Gabriel','George','Gheorghe','Iancu',
      'Ioan','Lucian','Marius','Mihai','Mircea','Octavian','Radu','Stefan','Tudor'],
    last: ['Alexe','Andone','Baluta','Bancu','Burcă','Cicâldău','Coman','Constantin',
      'Dragusin','Edjouma','Florescu','Hagi','Ioniță','Lespescu','Maxim','Mihaiu',
      'Moldovan','Moruțan','Nedelcearu','Nistor','Petre','Pintilii','Radunovic',
      'Rus','Stanciu','Tanase'],
  },
};

// Map team code → name pool key
const CULTURE_MAP = {
  'fr': 'french', 'be': 'french', 'nc': 'french', 'pf': 'french', 'ht': 'french',
  'es': 'spanish', 'ar': 'spanish', 'mx': 'spanish', 'co': 'spanish', 'uy': 'spanish',
  'cl': 'spanish', 'pe': 'spanish', 'ec': 'spanish', 'py': 'spanish', 've': 'spanish',
  'bo': 'spanish', 'cr': 'spanish', 'pa': 'spanish', 'hn': 'spanish', 'sv': 'spanish',
  'gt': 'spanish', 'cw': 'spanish', 'do': 'spanish', 'cu': 'spanish', 'ni': 'spanish',
  'pt': 'portuguese', 'br': 'portuguese', 'ao': 'portuguese', 'cv': 'portuguese', 'mz': 'portuguese',
  'it': 'italian', 'cy': 'italian',
  'de': 'germanic', 'nl': 'germanic', 'at': 'germanic', 'ch': 'germanic', 'lu': 'germanic',
  'dk': 'nordic', 'se': 'nordic', 'no': 'nordic', 'fi': 'nordic', 'is': 'nordic', 'ee': 'nordic',
  'gb-eng': 'british', 'gb-sct': 'british', 'gb-wls': 'british', 'ie': 'british',
  'us': 'british', 'ca': 'british', 'jm': 'british', 'tt': 'british',
  'au': 'oceanian', 'nz': 'oceanian',
  'pl': 'slavic_west', 'cz': 'slavic_west', 'sk': 'slavic_west', 'si': 'slavic_west', 'hu': 'hungarian',
  'ua': 'slavic_east', 'ru': 'slavic_east', 'by': 'slavic_east', 'lt': 'slavic_east',
  'lv': 'slavic_east', 'ge': 'slavic_east', 'am': 'slavic_east', 'kz': 'slavic_east',
  'hr': 'balkan', 'rs': 'balkan', 'ba': 'balkan', 'me': 'balkan', 'mk': 'balkan', 'al': 'balkan',
  'bg': 'slavic_east', 'ro': 'romanian',
  'tr': 'turkish', 'az': 'turkish',
  'gr': 'greek',
  'il': 'middle_east',
  'ma': 'north_african', 'dz': 'north_african', 'tn': 'north_african',
  'eg': 'north_african', 'ly': 'north_african',
  'ng': 'west_african', 'cm': 'west_african', 'gh': 'west_african', 'sn': 'west_african',
  'ci': 'west_african', 'ml': 'west_african', 'bf': 'west_african', 'cd': 'west_african',
  'gn': 'west_african', 'ga': 'west_african', 'bj': 'west_african', 'tg': 'west_african',
  'za': 'east_african', 'ug': 'east_african', 'tz': 'east_african', 'zm': 'east_african',
  'zw': 'east_african', 'mg': 'east_african', 'na': 'east_african', 'ke': 'east_african',
  'jp': 'east_asian', 'kr': 'east_asian', 'cn': 'east_asian', 'kp': 'east_asian',
  'ir': 'iranian',
  'sa': 'middle_east', 'qa': 'middle_east', 'ae': 'middle_east', 'iq': 'middle_east',
  'jo': 'middle_east', 'om': 'middle_east', 'bh': 'middle_east', 'ps': 'middle_east', 'sy': 'middle_east',
  'uz': 'central_asian', 'kg': 'central_asian',
  'in': 'southeast_asian', 'th': 'southeast_asian', 'vn': 'southeast_asian',
  'id': 'southeast_asian', 'my': 'southeast_asian',
  'pg': 'pacific_islander', 'fj': 'pacific_islander', 'sb': 'pacific_islander',
  'vu': 'pacific_islander', 'ws': 'pacific_islander', 'to': 'pacific_islander',
};

function getPool(code) {
  const key = CULTURE_MAP[code] || 'british';
  return POOLS[key] || POOLS.british;
}

function pickName(rng, pool) {
  const first = pool.first[Math.floor(rng.next() * pool.first.length)];
  const last = pool.last[Math.floor(rng.next() * pool.last.length)];
  return `${first} ${last}`;
}

/**
 * Generate a player rating based on team strength and slot index within squad.
 * Low-rated teams can have at most one "exceptional" outlier.
 */
function generateRating(rng, teamRating, slotIndex, hasException, exceptionSlot) {
  const tr = teamRating;

  if (hasException && slotIndex === exceptionSlot) {
    // Rare outlier in a weak team — up to min(tr+22, 72)
    return Math.round(Math.min(72, tr + rng.nextInt(12, 22)));
  }

  // Define rating bands based on team tier and slot importance
  // Slots 0-2: GKs (starters get decent rating, 3rd GK lower)
  // Slots 3-10: DF starters vs bench
  // Slots 11-18: MF starters vs bench
  // Slots 19-24: FW starters vs bench
  const isGK = slotIndex < 3;
  const gkSlot = isGK ? slotIndex : -1;

  // Within each position group, earlier index = better player
  let posIndex;
  if (isGK) posIndex = gkSlot; // 0,1,2
  else if (slotIndex < 11) posIndex = slotIndex - 3; // 0-7 for DF
  else if (slotIndex < 19) posIndex = slotIndex - 11; // 0-7 for MF
  else posIndex = slotIndex - 19; // 0-5 for FW

  const groupSize = isGK ? 3 : slotIndex < 11 ? 8 : slotIndex < 19 ? 8 : 6;
  const starterRatio = posIndex / (groupSize - 1); // 0=best, 1=worst in group

  let base, variance;

  if (tr >= 85) {
    // Elite team: 70-99 range, deep quality
    base = Math.round(tr - 5 - starterRatio * 22);
    variance = 4;
  } else if (tr >= 75) {
    // Strong team: 62-92 range
    base = Math.round(tr - 8 - starterRatio * 20);
    variance = 4;
  } else if (tr >= 65) {
    // Mid-table: 52-82 range
    base = Math.round(tr - 10 - starterRatio * 20);
    variance = 3;
  } else if (tr >= 55) {
    // Weak-medium: 42-72 range
    base = Math.round(tr - 8 - starterRatio * 18);
    variance = 3;
  } else {
    // Weak: 28-62 range
    base = Math.round(tr - 5 - starterRatio * 15);
    variance = 2;
  }

  const rating = base + rng.nextInt(-variance, variance);
  return Math.max(25, Math.min(99, rating));
}

/**
 * Generate a realistic age for a player based on position and slot.
 * GK1 tends to be experienced; GK3 tends to be young.
 * Starters (slot 0 of group) are more likely in their peak years.
 */
function generateAge(rng, position, slotIndex) {
  if (position === 'GK') {
    const ranges = [[26, 33], [23, 31], [18, 24]];
    const [min, max] = ranges[slotIndex] || [20, 28];
    return rng.nextInt(min, max);
  }

  // Compute position-local index (0 = best, n-1 = worst in group)
  let posIndex;
  if (slotIndex < 11) posIndex = slotIndex - 3; // DF
  else if (slotIndex < 19) posIndex = slotIndex - 11; // MF
  else posIndex = slotIndex - 19; // FW

  // Starters: prime age; reserves: mix of young prospects and veterans
  if (posIndex === 0) return rng.nextInt(24, 32); // undisputed starter
  if (posIndex <= 2) return rng.nextInt(22, 31);  // regular starter
  if (posIndex <= 4) return rng.nextInt(20, 29);  // rotation
  return rng.nextInt(18, 27);                      // bench
}

/**
 * Generate the base squad for a team at edition 0.
 * Fully deterministic: same team code → same squad.
 */
export function generateBaseSquad(team) {
  const rng = createPRNG(combineSeed('squad', team.code, 'base'));
  const pool = getPool(team.code);
  const isWeakTeam = team.rating < 62;

  // At most 1 exceptional player for weak teams (not in GK slots to avoid weird stats)
  const hasException = isWeakTeam && rng.next() < 0.55;
  const exceptionSlot = hasException ? rng.nextInt(3, 24) : -1;

  // Track used names to avoid duplicates within squad
  const usedNames = new Set();

  return SQUAD_POSITIONS.map((position, index) => {
    let name;
    let attempts = 0;
    do {
      name = pickName(rng, pool);
      attempts++;
    } while (usedNames.has(name) && attempts < 10);
    usedNames.add(name);

    const rating = generateRating(rng, team.rating, index, hasException, exceptionSlot);
    const age = generateAge(rng, position, index);

    return {
      id: `${team.code}-${index}`,
      name,
      teamCode: team.code,
      position,
      rating,
      age,
    };
  });
}

// ── Pre-generated base squads (edition 0) ────────────────────────────────────
const BASE_SQUADS = new Map();
for (const team of TEAMS) {
  BASE_SQUADS.set(team.code, generateBaseSquad(team));
}

/**
 * Get the base squad (edition 0) for a team.
 */
export function getBaseSquad(teamCode) {
  return BASE_SQUADS.get(teamCode) || [];
}
