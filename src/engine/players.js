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
    iconic_first: ['Kylian','Karim','Antoine','Hugo','Zinédine','Thierry','Franck','Paul','Ousmane','Raphaël'],
    iconic_last:  ['Benzema','Griezmann','Lloris','Varane','Zidane','Thuram','Ribéry','Pogba','Dembele','Saliba'],
    first: [
      'Adrien','Alexandre','Antoine','Aurélien','Axel','Baptiste','Benjamin','Boubacar',
      'Charles','Clément','Corentin','Damien','Edouard','Étienne','Enzo','Evan','Fabrice',
      'Florian','François','Franck','Gaël','Guillaume','Hugo','Ibrahima','Jules','Karim',
      'Kévin','Killian','Kylian','Lassana','Laurent','Léo','Leny','Loïc','Luca','Lucas',
      'Mathieu','Mattéo','Maxime','Moussa','Nabil','Nathan','Nicolas','Olivier','Ousmane',
      'Paul','Philippe','Pierre','Quentin','Randal','Raphaël','Rémi','Romain','Samuel',
      'Samir','Sébastien','Steven','Tanguy','Théo','Thierry','Thomas','Timothée','Tristan',
      'Valentin','Victor','Warren','William','Yoann','Yanis','Zinédine',
    ],
    last: [
      'Bernard','Benzema','Blanc','Bonnet','Bouchard','Camara','Chevalier','Clément',
      'Colin','Coman','Denis','Dembele','Diallo','Digne','Dubois','Dumont','Dupont',
      'Durand','Fofana','Fontaine','Gagnon','Garnier','Gautier','Girard','Griezmann',
      'Guendouzi','Konaté','Lacazette','Lacroix','Lambert','Laurent','Laval','Lecomte',
      'Lefevre','Legrand','Lemaire','Leroux','Leroy','Lloris','Maignan','Makelele',
      'Martin','Mathieu','Mendy','Mercier','Morel','Moreau','Nkunku','Noel','Pavard',
      'Perrin','Petit','Picard','Pogba','Rabiot','Renard','Ribéry','Richard','Robert',
      'Robin','Rousseau','Roux','Saliba','Simon','Tchouaméni','Thuram','Thomas',
      'Tolisso','Upamecano','Varane','Beaumont','Beauchamp','Veretout','Vidal','Zidane',
    ],
  },
  spanish: {
    nicknames: [
      'Raúl','Torres','Villa','Hierro','Pirri','Míchel','Canales','Quini',
      'Etxeberria','Ferran','Nacho','Joselu','Brahim','Salva','Caballero',
    ],
    ar_motes: [
      'Piojo','Mono','Toro','Gato','Pato','Conejo',
      'Tigre','Lobo','Chivo','Patón','Bicho','Torito',
      'Flaco','Gordo','Negro','Cacho','Pichi','Nene','Tucu',
      'Narigón','Pelos','Bichi','Peque','Tata','Pipa',
      'Loco','Burrito','Payaso','Turco','Colo','Checho',
      'Pipe','Pelado','Cabezón','Ruso','Chelo','Churry',
      'Papu','Huevo','Tanque','Morro','Chueco','Topo',
    ],
    iconic_first: ['Xavi','Sergio','David','Iker','Fernando','Álvaro','Dani','Rodri','Raúl','Pablo'],
    iconic_last:  ['Ramos','Villa','Busquets','Torres','Navas','Olmo','Valverde','Silva','Laporte','Pedri'],
    first: [
      'Adrián','Aitor','Alberto','Alejandro','Álex','Alfonso','Álvaro','Ander','Andrés','Aritz',
      'Arnau','Asier','Borja','Carlos','César','Dani','Daniel','Diego','Eduardo','Emilio',
      'Enrique','Érik','Fernando','Francisco','Gabriel','Gerard','Gonzalo','Héctor','Hugo','Iker',
      'Iñaki','Isco','Iván','Javier','Joel','Jonathan','Jorge','José','Joselu','Juan',
      'Julián','Kevin','Koke','Lamine','Luis','Manuel','Marc','Marco','Marcos','Martín',
      'Miguel','Mikel','Nacho','Nico','Nicolás','Óscar','Pablo','Pau','Pedro','Rafael',
      'Raúl','Roberto','Rodrigo','Rodri','Rubén','Santi','Sergio','Tomás','Unai','Víctor',
      'Xavi','Yerlan',
    ],
    last: [
      'Aguilar','Alonso','Álvarez','Baena','Blanco','Busquets','Calvo','Campos','Carvajal',
      'Casillas','Castro','Cruz','Crespo','De la Fuente','Delgado','Díaz','Domínguez','Escobar',
      'Espinoza','Estrada','Fabián','Fernández','Flores','Franco','Fuentes','Gallardo','García',
      'Gómez','González','Gutiérrez','Herrera','Ibáñez','Iglesias','Jiménez','Lainez','Llorente',
      'López','Luque','Martín','Martínez','Medina','Méndez','Merino','Mesa','Miranda','Molina',
      'Montoya','Morales','Moreno','Muñoz','Navarro','Navas','Ocampos','Olmo','Ortega','Ortiz',
      'Oyarzabal','Paredes','Pérez','Piqué','Prieto','Quintero','Ramírez','Ramos','Reyes','Ríos',
      'Rodríguez','Rojas','Romero','Ruiz','Salinas','Sánchez','Serrano','Silva','Soler','Suárez',
      'Tapia','Torres','Valencia','Valverde','Vargas','Vega','Vidal','Villa','Zubimendi',
    ],
  },
  portuguese: {
    mononyms: [
      'Willian','Everton','Vitinho','Taison','Emerson','Dante','Elano','Ganso',
      'Ramires','Paulinho','Maicon','Tardelli','Grafite','Nilmar','Dudu','Luan',
      'Rafinha','Douglas','Leandro','Jadson','Jô','Nenê','Alex','Weverton',
      'Robson','Fernandão','Édinho','Diego','Bobo','Thiago',
      'Hulk','Mineiro','Renato','Wendell','Hernanes','Damião','Centurion',
      'Fernandinho','Gilberto','Ramirez','Wendel','Walace','Geromel','Ederson',
      'Rodriguinho','Claudinho','Peglow','Marcelinho','Pedrão','Dentinho',
      'Arrascaeta','Borré','Cueva','Driussi','Montillo',
    ],
    iconic_first: ['Cristiano','Bruno','João','Pedro','Bernardo','Diogo','Rúben','Gonçalo','André','Neymar'],
    iconic_last:  ['Fernandes','Silva','Cancelo','Costa','Dias','Carvalho','Jota','Trincão','Neves','Ronaldo'],
    first: [
      'Adriano','Anderson','André','Antônio','Arthur','Bernardo','Bruno','Carlos','Casemiro',
      'Danilo','Davi','Diego','Diogo','Eduardo','Éverton','Fabio','Felipe','Fernando','Gabriel',
      'Gerson','Gonçalo','Gustavo','Igor','João','João Pedro','Jonathan','Jorge','Júnior',
      'Kaique','Leandro','Leonardo','Lucas','Luiz','Léo','Marcelo','Marcos','Marquinhos',
      'Mateus','Matheus','Nelson','Nuno','Otávio','Paulo','Pedro','Pepe','Rafael','Renato',
      'Ricardo','Rodrigo','Rúben','Sérgio','Thiago','Tiago','Vítor','Vinicius','William','Xavier','Yuri',
    ],
    last: [
      'Almeida','Alves','Andrade','Araújo','Barbosa','Barros','Batista','Borges',
      'Brandão','Campos','Cancelo','Cardoso','Carvalho','Correia','Costa','Cunha',
      'Dias','Domingues','Duarte','Esteves','Faria','Fernandes','Ferreira','Figueiredo',
      'Fonseca','Freitas','Gomes','Gonçalves','Guedes','Henriques','Jesus','Jorge',
      'Jota','Lima','Lopes','Magalhães','Martins','Matos','Melo','Mendes','Miranda',
      'Monteiro','Moreira','Moutinho','Nascimento','Neto','Neves','Nunes','Oliveira',
      'Paiva','Pereira','Pinto','Pires','Queirós','Ramos','Reis','Ribeiro','Rocha',
      'Rodrigues','Rosa','Santos','Saraiva','Silva','Simões','Soares','Sousa','Tavares',
      'Teixeira','Trincão','Valente','Vaz','Vicente','Vieira','Xavier',
    ],
  },
  italian: {
    first: [
      'Alessandro','Andrea','Antonio','Davide','Emilio','Fabio','Federico',
      'Francesco','Giorgio','Giovanni','Giuseppe','Luca','Marco','Matteo','Michele',
      'Nicola','Paolo','Pietro','Roberto','Simone','Stefano','Tommaso','Valentino',
      'Gianluca','Lorenzo','Riccardo','Giacomo','Emanuele','Manuel','Cristian',
      'Ciro','Domenico','Giacomo','Ivan','Niccolò','Nicolò','Sandro','Vincenzo',
      'Alberto','Alessio','Angelo','Bruno','Carlo','Claudio','Daniele','Edoardo',
      'Enrico','Ettore','Filippo','Gianni','Leonardo','Luigi','Massimo','Mauro',
      'Mirko','Oreste','Raffaele','Samuele','Sergio','Toni','Umberto','Vittorio',
    ],
    last: [
      'Amato','Barbieri','Bianchi','Bruno','Caruso','Colombo','Conti','Coppola',
      'Costa','De Luca','Esposito','Ferrari','Ferretti','Ferraro','Fontana','Gallo',
      'Greco','Lombardi','Mancini','Marchetti','Marini','Martini','Moretti','Orlando',
      'Palumbo','Ricci','Romano','Rossetti','Rossi','Russo','Santoro','Serra',
      'Sorrentino','Valentini','Verratti','Barella','Immobile','Chiesa','Donnarumma',
      'Bastoni','Dimarco','Frattesi','Jorginho','Raspadori','Retegui','Tonali',
      'Acerbi','Belotti','Bernardi','Bonucci','Capello','Carbone','Chiellini',
      'Criscito','Del Piero','De Rossi','Gattuso','Gilardino','Insigne','Maldini',
      'Nesta','Pirlo','Politano','Scamacca','Spinazzola','Zaccagni','Zaniolo',
    ],
  },
  germanic: {
    nl_surnames: [
      'Van Dijk','Van Nistelrooy','Van der Sar','Van Persie','Van Breukelen',
      'Van den Berg','Van der Vaart','Van Basten','Van Aanholt','Van de Beek',
      'Van Bronckhorst','Van der Linden','Van Hooijdonk','Van Gaal','Van der Heyden',
      'De Jong','De Ligt','De Boer','De Vrij','Den Haag','Van den Brom',
    ],
    iconic_first: ['Joshua','Leon','Julian','Kai','Florian','Thomas','Leroy','Jamal','Serge','Timo'],
    iconic_last:  ['Müller','Kimmich','Gnabry','Havertz','Rüdiger','Musiala','Wirtz','Neuer','Götze','Gündogan'],
    first: [
      'Aaron','Alexander','André','Arne','Benedikt','Bernd','Christian','Christoph',
      'Daniel','David','Dennis','Dominik','Eric','Fabian','Felix','Florian','Franz',
      'Hans','Ilkay','Jamal','Jan','Jonas','Jonathan','Julian','Kai','Kevin','Lars',
      'Leon','Leroy','Levin','Luca','Lukas','Marco','Markus','Matthias','Maximilian',
      'Michael','Moritz','Nico','Nils','Oliver','Pascal','Patrick','Peter','Philipp',
      'René','Robert','Robin','Sandro','Sebastian','Serge','Simon','Steffen','Stefan',
      'Thomas','Thilo','Tim','Timo','Tobias','Tom','Uwe','Joshua',
    ],
    last: [
      'Abel','Bach','Baumann','Bauer','Berger','Boateng','Braun','Brandt',
      'Dahmen','Draxler','Durm','Engel','Fischer','Frings','Friedrich','Fuchs',
      'Gnabry','Götze','Graf','Gündogan','Hahn','Hartmann','Havertz','Henrichs',
      'Herrmann','Hofmann','Hoffmann','Huber','Jung','Kaiser','Kimmich','Klein',
      'Klostermann','Koch','König','Krause','Krüger','Kuntz','Lange','Lehmann',
      'Lenz','Maier','Meier','Meyer','Müller','Musiala','Neuer','Neumann','Peters',
      'Richter','Roth','Rüdiger','Sané','Schäfer','Schlotterbeck','Schmidt','Schneider',
      'Schulz','Schwarz','Sommer','Tah','Trapp','Vogel','Walter','Weber','Weiss',
      'Werner','Wimmer','Wirtz','Wolf',
    ],
  },
  nordic: {
    patronymics: [
      'Sigurdsson','Gunnarsson','Björnsson','Halldórsson','Kristinsson',
      'Magnússon','Jónsson','Sigþórsson','Eiríksson','Árnason','Skúlason',
      'Pétursson','Gíslason','Helgason','Finnbogason','Traustason','Ingason',
      'Þórðarson','Kjartansson','Bjarnason','Einarsson','Ómarsson','Sigríksson',
      'Kristjánsson','Stefánsson','Guðmundsson','Óskarsson','Valdimarsson',
      'Þorsteinsson','Heiðarsson','Sveinsson','Karlsson','Ágústsson',
      'Níelsson','Þórisson','Albertsson','Daníelsson','Georgsson',
    ],
    first: [
      'Anders','Andreas','Aron','Bjorn','Birkir','Carl','Christian','Daniel','Emil','Erik',
      'Finn','Fredrik','Gustav','Gylfi','Hannes','Henrik','Jakob','Jonas','Jón','Karl',
      'Kári','Lars','Magnus','Marcus','Martin','Mikael','Nils','Oskar','Petter',
      'Ragnar','Rasmus','Simon','Sven','Thomas','Tobias','Viktor',
      'Erling','Alexander','Kasper','Pierre',
      'Albin','Axel','Björn','Einar','Gunnar','Hallgrímur','Hákon','Ingvar',
      'Jens','Kristján','Leif','Linus','Mikkel','Njáll','Ólafur','Pontus',
      'Rúnar','Siggi','Sindri','Torbjörn','Trygve','Ulf','Valur','Vidar',
    ],
    last: [
      'Andersen','Berg','Bergman','Christensen','Dahl','Eriksen','Gustafsson',
      'Halvorsen','Hansen','Holm','Jakobsen','Jensen','Johansson','Karlsson','Larsen',
      'Lindgren','Nielsen','Nilsson','Olsen','Pedersen','Petersen','Rasmussen',
      'Sandberg','Svensson','Thorsen','Vestergaard','Haaland','Odegaard','Ibsen',
      'Claesson','Forsberg','Isak','Elanga',
      'Abildgaard','Bjelland','Björk','Cornelius','Dahlin','Ekdal','Eliasson',
      'Granqvist','Kjær','Lindelöf','Lindström','Lössl','Møller','Nissen',
      'Normann','Schmeichel','Skjelbred','Söder','Strandberg','Wass',
    ],
  },
  british: {
    mc_surnames: [
      'McDonald','McGregor','McKay','McLaughlin','McLeod','MacDonald','MacPherson',
      'MacKay','MacLaren','McAllister','McGinn','McTominay','McArthur','McKenna',
      'McBurnie','McLean','MacKenzie','MacPhail','MacMillan','MacNeil','MacLeod',
      'McCarthy','McCann','McDermott','McGrath','McGeady','McClean','McGoldrick',
      'McAuley','McShane','McGuinness','McManus','McFadden','McStay','McAteer',
    ],
    first: [
      'Aaron','Adam','Ben','Bradley','Callum','Connor','Daniel','Dylan','Ethan',
      'George','Jack','Jacob','James','Joe','Joshua','Kyle','Liam','Luke','Mason',
      'Matthew','Nathan','Oliver','Owen','Reece','Ryan','Sam','Thomas','Tom','Tyler',
      'Will','Declan','Jadon','Marcus','Bukayo','Trent',
      'Alfie','Andrew','Archie','Billy','Charlie','Dean','Dominic','Elliott',
      'Finley','Freddie','Gareth','Harry','Harvey','John','Jordan','Kevin',
      'Lewis','Lloyd','Michael','Patrick','Rhys','Robbie','Ronan','Ross',
      'Sean','Shane','Stuart','Theo','Wayne','Zak',
    ],
    last: [
      'Allen','Bailey','Baker','Brown','Carter','Clark','Collins','Cook','Davies',
      'Davis','Edwards','Evans','Green','Hall','Harris','Hughes','Jackson','James',
      'Jones','Kelly','King','Lewis','Martin','Mitchell','Moore','Morris','Murphy',
      'Owen','Price','Roberts','Robinson','Smith','Taylor','Thomas','Thompson',
      'Turner','Walker','White','Williams','Wilson','Wright','Young','Rice','Saka',
      'Armstrong','Barker','Barry','Bell','Brady','Burns','Byrne','Cameron',
      'Campbell','Chapman','Doherty','Donnelly','Fletcher','Foster','Fraser',
      'Gallagher','Gray','Henderson','Maguire','McTominay','Moran','O\'Brien',
      'O\'Neill','Patterson','Phillips','Pickford','Shaw','Sterling','Ward',
    ],
  },
  slavic_east: {
    first: [
      'Aleksei','Alexei','Andrei','Anton','Boris','Dmitri','Evgeny','Georgi',
      'Igor','Ivan','Kirill','Maksim','Mikhail','Nikita','Nikolai','Oleg','Pavel',
      'Roman','Ruslan','Sergei','Taras','Timur','Vasyl','Viktor','Vitaly',
      'Vladimir','Yuri','Artem','Denys','Mykola','Oleksandr',
      'Alexandr','Alexiy','Bogdan','Danil','Eduard','Fedor','Gennadi',
      'Ilya','Konstantin','Leonid','Lev','Miroslav','Petro','Rodion',
      'Semyon','Stanislav','Stepan','Valentin','Vladislav','Yaroslav','Zhenia',
    ],
    last: [
      'Antonov','Borisov','Fedorov','Goncharov','Ivanov','Kovalev','Kozlov',
      'Kravchenko','Lebedev','Mikhailov','Morozov','Orlov','Pavlov','Petrov',
      'Savchenko','Semyonov','Shevchenko','Sidorov','Smirnov','Sokolov','Stepanov',
      'Tkachenko','Vasiliev','Volkov','Zhukov','Mudryk','Zinchenko','Yaremchuk',
      'Malinovsky','Tsygankov',
      'Bondarenko','Chernyshov','Dovbyk','Grechishkin','Karavaev','Kryvtsov',
      'Lunev','Malinovskyi','Mykolenko','Popov','Rotaru','Rybalka',
      'Shaparenko','Sydorchuk','Tarasov','Trubin','Zabarnyi','Zuev',
    ],
  },
  slavic_west: {
    first: [
      'Adam','Andrzej','Arkadiusz','Bartosz','Damian','Dawid','Filip','Grzegorz',
      'Jakub','Kamil','Krzysztof','Lukasz','Maciej','Marcin','Marek','Mateusz',
      'Michal','Milan','Ondrej','Patrik','Piotr','Radoslav','Rafal','Robert',
      'Stanislaw','Tomas','Vojtech','Wojciech',
      'Adrian','Dominik','Hubert','Igor','Jan','Juraj','Karel','Ladislav',
      'Lubomir','Lukas','Martin','Maroš','Miroslav','Petr','Radek','Roman',
      'Sebastián','Simon','Szymon','Tomasz','Vladimir','Zbigniew',
    ],
    last: [
      'Blaha','Cech','Czerwinski','Duda','Glowacki','Januszewski','Kovar',
      'Kowalski','Lewandowski','Majer','Novotny','Pazdera','Prochazka','Sobczak',
      'Svoboda','Szymanski','Wrobel','Zajicek','Zawadzki','Krychowiak','Zielinski',
      'Frankowski','Bielik','Milik','Bednarek',
      'Bilek','Brabec','Breznanik','Glik','Grabara','Jankto','Kopic',
      'Krejci','Kucka','Ondrasek','Plichta','Polasek','Sadlo','Sadilek',
      'Skóraš','Slisz','Soucek','Vaclik','Vydra','Walski','Wesołowski',
    ],
  },
  balkan: {
    first: [
      'Ante','Aleksandar','Bojan','Branimir','Dario','Dejan','Denis','Domagoj',
      'Dragan','Duje','Dušan','Filip','Goran','Ivan','Josip','Luka','Marko',
      'Mario','Milan','Mislav','Nikola','Petar','Robert','Sergej','Stefan',
      'Sven','Tomislav','Vedran','Vlad',
      'Alen','Arijan','Borna','Bruno','Danijel','Darko','Eldin','Enis',
      'Ervin','Gojko','Jasmin','Lovro','Marin','Matej','Miroslav','Mladen',
      'Muhamed','Neven','Ognjen','Roko','Stjepan','Toni','Vlatko','Zvonimir',
    ],
    last: [
      'Babić','Boras','Budimir','Gvardiol','Jurić','Jovic','Kostic','Kovačić',
      'Krstović','Lazovic','Lovrić','Lukic','Majstorović','Majer','Milinkovic',
      'Modrić','Perišić','Petković','Pjaca','Rakitić','Rebić','Sosa','Stanišić',
      'Tadic','Vlašić','Djuricic',
      'Brekalo','Čolak','Ćorić','Erlic','Halilović','Ivanović','Kramarić',
      'Livaković','Livaja','Mandžukić','Oršić','Pašalić','Ramić','Simić',
      'Šimić','Škorić','Šutalo','Vidović','Vrsaljko','Živković',
    ],
  },
  north_african: {
    first: [
      'Achraf','Amine','Anis','Ayman','Ayoub','Bilal','Farid','Hassan',
      'Houssem','Ismail','Khalil','Mohamed','Mohammed','Montassar','Nasser','Omar',
      'Rachid','Rayan','Samir','Sofiane','Wahbi','Walid','Yassine','Zakaria',
      'Nabil','Youcef','Ryad','Adem',
      'Abdelkarim','Abderrazak','Anass','Aziz','Badr','Brahim','Faris',
      'Hamza','Ilias','Karim','Lamine','Mounir','Nassim','Oussama',
      'Redouane','Sami','Tarek','Tawfik','Yazid','Zaid',
    ],
    last: [
      'Aboukhlal','Amrabat','Azzedine','Belhanda','Benali','Benrahma',
      'Bouanani','El Kaabi','El Yamiq','Ghezzal','Guedioura','Hakimi',
      'Khaoui','Ounahi','Saiss','Slimane','Taarabt','Ziyech','Mahrez','Bennacer',
      'Aouar','Bensebaini','Mandi','Slimani','Brahimi',
      'Aït Nouri','Belkebla','Benatia','Benzia','Boufal','Dari',
      'Delort','Feghouli','Hamari','Louza','Messaoud','Mokwena',
      'Nayef','Oulad','Taïder','Touzghar','Zerrouki','Ziyed',
    ],
  },
  west_african: {
    iconic_first: ['Sadio','Ismaila','Serge','Wilfried','Victor','Kelechi','Naby','Moussa','Lamine','Cheick'],
    iconic_last:  ['Mané','Sarr','Zaha','Osimhen','Touré','Gueye','Konaté','Iheanacho','Traoré','Pépé'],
    first: [
      'Abdoulaye','Aboubakar','Aliou','Amadou','Amara','Badou','Boubacar',
      'Cheick','Cheikhou','Dieumerci','Emmanuel','Gervais','Habib','Ibrahim',
      'Idrissa','Ismaila','Ismaël','Joel','Kelechi','Lamine','Mamadou','Malick',
      'Moussa','Musa','Naby','Nampalys','Nicolas','Odion','Osman','Oumar',
      'Patrice','Prince','Raphael','Samuel','Sébastien','Sekou','Seko','Serge',
      'Siaka','Simon','Sadio','Soumaila','Tariq','Victor','Wilfried','Wilfred',
      'Youssouf','Youssef','Hamari','Kalidou','Gana',
    ],
    last: [
      'Aurier','Bakayoko','Bailly','Ballo-Touré','Bamba','Bayo','Camara',
      'Coulibaly','Demba','Dembele','Diabaté','Diagne','Diallo','Diedhiou',
      'Doucouré','Ekitike','Gueye','Gomis','Kamara','Keïta','Konaté','Koné',
      'Kouame','Kouyaté','Leye','Mané','Mbaye','Mbodj','Mendy','Moutari',
      'Ndiaye','Niang','Ndidi','Onana','Onyeka','Osei','Osimhen','Pépé','Sabaly',
      'Sall','Sané','Sangaré','Sarr','Sidibé','Soumah','Sylla','Toko Ekambi',
      'Touré','Traoré','Wagué','Zaha','Iheanacho',
    ],
  },
  east_african: {
    first: [
      'David','Dennis','Eric','Francis','George','Henry','James','John',
      'Joseph','Kenneth','Moses','Patrick','Peter','Richard','Robert','Samuel',
      'Simon','Thomas','William','Michael','Daniel','Emmanuel','Paul','Philip',
      'Abel','Alex','Alfred','Andrew','Arthur','Benjamin','Charles','Christian',
      'Collins','Damian','Elijah','Festus','Innocent','Joel','Jonathan','Julius',
      'Kevin','Leonard','Mark','Martin','Nathan','Nicholas','Oliver','Oscar',
      'Raymond','Stephen','Timothy','Victor','Walter',
    ],
    last: [
      'Achieng','Adekunle','Agyemang','Asante','Atsu','Boateng','Essien',
      'Gyan','Kalou','Kante','Mensah','Nakamba','Partey','Sowah','Tetteh',
      'Wakaso','Waris','Mukiibi','Ouma','Ndungú','Chirwa','Phiri',
      'Adeoti','Alhassan','Amoah','Anane','Aning','Bawuah','Dadson',
      'Duah','Kudus','Lamptey','Lomotey','Lomotey','Ntow','Ofori',
      'Opoku','Owusu','Quaye','Sarpong','Twumasi','Yiadom','Zito',
    ],
  },
  middle_east: {
    first: [
      'Abdullah','Ahmad','Ahmed','Ali','Amjad','Fawaz','Hassan','Hussein',
      'Khaled','Mahmoud','Mohamed','Mohammad','Nasser','Omar','Rakan','Saleh',
      'Sami','Tariq','Yasser','Younis','Abdulrahman','Nawaf','Salem','Firas',
      'Abdulaziz','Adnan','Bassel','Eyad','Haitham','Ismail','Jaber','Karim',
      'Mansour','Mohannad','Muhannad','Munir','Raed','Saad','Sufian',
      'Sultan','Walid','Yassin','Ziad','Ziyad',
    ],
    last: [
      'Al-Bishi','Al-Dosari','Al-Ghamdi','Al-Harbi','Al-Hassan',
      'Al-Mohammadi','Al-Shahrani','Aldawsari','Alhajj','Almutairi','Alnaim',
      'Alsaiari','Alshehri','Asiri','Khalid','Al-Hayos','Al-Rawi','Al-Zori',
      'Maran','Salim','Taha',
      'Al-Abed','Al-Ahbabi','Al-Ammari','Al-Aqidi','Al-Bulayhi','Al-Dawsari',
      'Al-Faraj','Al-Hamdan','Al-Jassim','Al-Khaldi','Al-Owais','Al-Qahtani',
      'Al-Ruwaili','Al-Shehri','Al-Tambakti','Al-Yami','Briskey','Hamdan',
    ],
  },
  japanese: {
    first: [
      'Ao','Daichi','Gaku','Hayato','Hiroki','Kaito','Kaoru','Keisuke',
      'Kenta','Kohei','Koji','Koki','Kota','Makoto','Naoki','Ren','Ritsu',
      'Ryota','Ryusei','Sho','Shinji','Shuto','Sota','Takashi','Takefusa',
      'Taisei','Tomoki','Wataru','Yuki','Yuta','Yuji','Yuto',
      'Daiki','Fuki','Genki','Haruto','Hiroshi','Issei','Junki','Kazuki',
      'Keito','Masato','Nobuhiro','Reo','Ryuji','Seiya','Shinya','Taishi',
    ],
    last: [
      'Asano','Doan','Endo','Fujita','Furuhashi','Hashimoto','Hatate',
      'Hayashi','Honda','Inui','Itakura','Ito','Kagawa','Kamada','Kawashima',
      'Kobayashi','Kubo','Maeda','Minamino','Mitoma','Mochizuki','Moriya',
      'Nagatomo','Nakata','Nishikawa','Ogawa','Okazaki','Osako','Saito',
      'Sakai','Sato','Shibasaki','Soma','Suzuki','Tanaka','Tomiyasu',
      'Ueda','Watanabe','Yamamoto','Yoshida',
      'Aoki','Hirano','Inoue','Kimura','Matsui','Morishima','Muto',
      'Nakagawa','Nakayama','Nishino','Nomura','Shimizu','Uchida','Yamaguchi',
    ],
  },
  korean: {
    first: [
      'Chan-gyun','Chang-hoon','Dong-won','Gue-sung','Heung-min','Hyeon-gyu',
      'Hyun-jun','In-beom','Jae-hyun','Jae-sung','Jin-su','Ji-sung','Jun-ho',
      'Keun-ho','Kyung-won','Min-jae','Sang-ho','Seung-ho','Seung-jun',
      'Seung-woo','Tae-gon','Tae-hwan','Ui-jo','Woo-yeong','Young-jun',
      'Byung-joon','Chun-soo','Dong-hyun','Eun-chan','Gi-hyeon','Hyun-soo',
      'Jae-won','Jin-hyeok','Jong-ho','Jun-seo','Ki-hun','Min-hyeok',
    ],
    last: [
      'Bae','Baek','Cho','Choi','Ha','Han','Hwang','Jang','Jeong',
      'Ji','Jung','Kang','Kim','Ku','Kwon','Lee','Lim','Ma',
      'Nam','Oh','Park','Ryu','Seo','Shin','Son','Yoon',
      'Ahn','Bang','Byun','Cha','Go','Im','In','Moon',
      'Noh','Song','Woo','Yang','You','Yu',
    ],
  },
  chinese: {
    first: [
      'Bin','Bo','Chao','Da','Dong','Feng','Gang','Guang','Hao','Jian',
      'Jie','Jun','Kai','Lei','Long','Ming','Peng','Qiang','Rui','Sheng',
      'Shuai','Tao','Wei','Xiao','Xin','Yang','Yi','Yong','Yu','Zhi',
      'Ao','Biao','Chengyuan','Fei','Fulong','Haotian','Jiajun','Jingdao',
      'Junlong','Mingyang','Nian','Pengfei','Qinlong','Xiaolong','Zhilong',
    ],
    last: [
      'Chen','Deng','Fan','Fang','Gao','Guo','Han','He','Hu','Huang',
      'Jiang','Li','Liang','Lin','Liu','Luo','Ma','Sun','Tang','Wang',
      'Wei','Wu','Xie','Xu','Yang','Zhang','Zhao','Zheng','Zhou','Zhu',
      'Bai','Cai','Cao','Dai','Dong','Du','Fu','Ge',
      'Jia','Kong','Lu','Meng','Pan','Qi','Qian','Shao',
    ],
  },
  southeast_asian: {
    first: [
      'Ahmad','Amirul','Arif','Bagas','Egy','Fandi','Haris','Ilhan',
      'Irfan','Jakkaphan','Muhammad','Nguyen','Pham','Safawi','Supachai',
      'Suphanat','Teerasak','Thirawuth','Toni','Tristan','Pratama','Rizky',
      'Adisak','Andik','Anggi','Beto','Chatchai','Doan','Fachri','Felda',
      'Hamidou','Izzdin','Jakraphan','Khouma','Lerby','Nattapong','Nurul',
      'Rendy','Saddam','Safuwan','Sarach','Shahril','Teeratep','Thanawat',
    ],
    last: [
      'Asa-Lee','Boonmatan','Fauzi','Hanis','Juanda','Kunhong','Mano',
      'Pitak','Rasid','Sinthaweechai','Thairatana','Tossama','Tuankaew',
      'Hasyim','Rahmat','Suryanto','Le','Pham','Nguyen','Tran',
      'Chaijkaew','Decho','Do','Duong','Hoa','Hoang','Khairul',
      'Khambhat','Kukuehan','Lim','Ly','Nguyen','Phạm','Puteh',
      'Raksith','Suwan','Thongpool','Viriya','Vo','Weerawong',
    ],
  },
  central_asian: {
    first: [
      'Abror','Akbar','Amir','Bobur','Dilshod','Dosbol','Eldor','Javokhir',
      'Jasur','Mirzo','Nodir','Oybek','Rustam','Sardor','Shamsiddin','Ulugbek',
      'Bekzod','Jakhongir','Otabek','Temur',
      'Alisher','Anvar','Asliddin','Azamat','Aziz','Behruz','Davron',
      'Doniyor','Firdavs','Hamza','Husan','Ilkhom','Islom','Jamshid',
      'Khurshid','Komil','Laziz','Mirzohid','Murod','Nurbek','Shohruh',
    ],
    last: [
      'Ashurmatov','Bakaev','Dzhenaliev','Jaborov','Khakmov','Kholmatov',
      'Mamytbekov','Shomurodov','Shukurov','Tursunov','Umarbaev','Narzullayev',
      'Komilov','Yusupov','Matchanov',
      'Abdullayev','Alikulov','Alimov','Akhmedov','Begmatov','Ergashev',
      'Hamroyev','Ismoilov','Karimov','Khashimov','Mamadaliev','Mirzayev',
      'Muxtarov','Nazarov','Ortiqov','Rashidov','Saidov','Turgunov',
    ],
  },
  oceanian: {
    first: [
      'Ben','Blake','Cameron','Chris','Daniel','Dylan','Ethan','Hamish',
      'Jake','James','Joe','Jordan','Josh','Kieran','Liam','Luke','Michael',
      'Nathan','Oliver','Ryan','Sam','Scott','Sean','Tim','Tom','Mitchell',
      'Aaron','Adam','Alex','Andrew','Angus','Anthony','Archie','Bailey',
      'Beau','Bradley','Cody','Connor','Curtis','Evan','Glen','Hugh',
      'Jason','Joel','Justin','Kyle','Marcus','Matthew','Max','Nick',
      'Patrick','Paul','Pete','Riley','Robert','Shane','Travis','Tyler',
    ],
    last: [
      'Brown','Burns','Campbell','Clarke','Cook','Davidson','Davies',
      'Edwards','Evans','Ferguson','Gibson','Graham','Grant','Green','Hall',
      'Harrison','Hughes','Johnson','Jones','King','MacDonald','Marshall',
      'Martin','Mitchell','Morgan','Roberts','Robinson','Ross','Scott',
      'Simpson','Smith','Taylor','Thompson','Ward','White','Williams','Wilson',
      'Abbott','Armstrong','Barker','Bennett','Bolton','Brady','Burke',
      'Carroll','Casey','Connell','Cooper','Donovan','Dunn','Fletcher',
      'Ford','Gallagher','Griffin','Higgins','Lawson','Lynch','Murray',
      'Neville','O\'Brien','O\'Connor','Patterson','Porter','Price','Reid',
    ],
  },
  pacific_islander: {
    first: [
      'Afu','Alofa','Amani','Faleolo','Fano','Fonotia','Ioane','Kafoa',
      'Kali','Lapua','Lotefa','Manu','Noa','Semi','Tala','Tana','Tuia','Ulupano',
      'Sione','Tuilagi','Finau','Havili',
      'Alosio','Aloti','Atonio','Dani','Epeli','Filo','Fiti','Hemi',
      'Isaia','Josaia','Josua','Kitione','Konisi','Leone','Mosese','Napolioni',
      'Peni','Ratu','Sakiusa','Simione','Timoci','Tomasi','Viliame','Waisea',
    ],
    last: [
      'Apa','Atiola','Faleolo','Faleo','Fano','Feao','Finau','Folau',
      'Fonoti','Havili','Ioane','Kafoa','Koroi','Lauaki','Lavaka','Lotefa',
      'Manu','Naupoto','Patolo','Perenise','Tanivula','Tuatagaloa','Fifita',
      'Vunipola','Tuilagi',
      'Baravilala','Botitu','Cakacaka','Delai','Dranibota','Fatiaki',
      'Koroivuki','Kubunavanua','Nadolo','Nalaga','Nasilasila','Rabaka',
      'Ravutia','Serevi','Tabu','Tailevu','Tikoisolomone','Turagabeci',
    ],
  },
  iranian: {
    first: [
      'Alireza','Ali','Amir','Ehsan','Karim','Majid','Mehdi','Mohammad',
      'Mojtaba','Morteza','Ramin','Reza','Saeid','Saman','Sardar','Shahab',
      'Voria','Milad','Omid','Kaveh',
      'Abbas','Ahmad','Amin','Arsalan','Bahram','Daniyal','Davoud',
      'Farhad','Hamid','Hossein','Hamed','Javad','Kamran','Keyvan',
      'Masoud','Navid','Nima','Pejman','Pourya','Siavash','Vahid',
    ],
    last: [
      'Azmoun','Beiranvand','Cheshmi','Dehkordi','Ezatolahi','Ghafouri',
      'Gholizadeh','Hajsafi','Hosseini','Jahanbakhsh','Karimi','Khanzadeh',
      'Mohammadi','Moradi','Nourollahi','Pouraliganji','Rezaei','Shojaei','Taremi',
      'Ansarifard','Torabi','Sarlak',
      'Abedzadeh','Amiri','Bahrami','Darvishi','Fallah','Golalizadeh',
      'Haghdoust','Jalali','Mahini','Malekian','Mobali','Pahlevan',
      'Rahmati','Rashidi','Sadeghi','Taheri','Teymouri','Zandieh',
    ],
  },
  turkish: {
    first: [
      'Ahmet','Arda','Barış','Burak','Can','Cengiz','Dorukhan','Emre',
      'Ercan','Ferdi','Hakan','Halil','Hamza','Kenan','Kaan','Mehmet','Mert',
      'Orkun','Samet','Serdar','Uğur','Yusuf','Zeki','Oğuzhan',
      'Abdülkadir','Alpay','Atakan','Berk','Berke','Doğukan','Enes','Ersin',
      'Fatih','Gökdeniz','Güven','Ismail','Kadir','Kerem','Muhammet','Mustafa',
      'Nazım','Okay','Ozan','Rıdvan','Selçuk','Taha','Taylan','Ümit',
    ],
    last: [
      'Akgün','Altay','Arslan','Ay','Aydın','Ayhan','Bardakcı','Çalhanoğlu',
      'Çelik','Demiral','Dursun','Kahveci','Karaman','Kökcü','Müldür','Okay',
      'Soyuncu','Şahin','Tosun','Tufan','Türkmen','Ünder','Yıldız','Yılmaz',
      'Güler','Yazıcı',
      'Akçiçek','Akman','Akturkoglu','Altuntop','Arıcı','Bayındır','Bulut',
      'Coşkun','Demirel','Ercan','Erdinç','Güneş','Kaplan','Kaya','Kılınç',
      'Küçüksaraç','Özcan','Özer','Polat','Şener','Toprak','Turan','Yalçın',
    ],
  },
  greek: {
    first: [
      'Anastasios','Christos','Dimitris','Georgios','Giorgos','Ioannis',
      'Kostas','Kyriakos','Lefteris','Makis','Manolis','Nikos','Panagiotis',
      'Stelios','Tassos','Vangelis','Vassilis','Yannis',
      'Alexandros','Athanasios','Dinos','Elias','Fotis','Giannis','Grigoris',
      'Ilias','Konstantinos','Lazaros','Leonidas','Michalis','Miltos','Nikolaos',
      'Paraskevas','Pavlos','Petros','Spyros','Stavros','Stratos','Theodoros',
    ],
    last: [
      'Alexandris','Antetokounmpo','Bakasetas','Fortounis','Gianniotas',
      'Hatzigiovanis','Kakaris','Karalis','Koulouris','Kyriakopoulos','Limnios',
      'Masouras','Pavlidis','Pelkas','Siopis','Stavropoulos','Tsimikas','Vlachodimos',
      'Antoniou','Christodoulopoulos','Donis','Fountas','Giakoumakis','Kapino',
      'Karnezis','Mantalos','Mavrias','Mitropoulos','Papastathopoulos','Petsos',
      'Retsos','Samaris','Siovas','Stafylidis','Torosidis','Tzavellas',
    ],
  },
  hungarian: {
    first: [
      'Adam','Ádám','Attila','Balázs','Bence','Dávid','Gábor','Gyula',
      'István','László','Márton','Máté','Mihály','Péter','Roland','Szabolcs',
      'Tamás','Zoltán',
      'András','Barnabás','Benedek','Botond','Csaba','Ferenc','Gergő',
      'Imre','Krisztián','Lajos','Lóránt','Marcell','Milán','Norbert',
      'Patrik','Richárd','Sándor','Tibor','Vilmos','Zsolt',
    ],
    last: [
      'Bese','Botka','Dzsudzsák','Fiola','Gulácsi','Holman','Kecskés',
      'Kleinheisler','Lang','Loic','Nagy','Nego','Nikolic','Orban','Rossi',
      'Sallai','Schäfer','Szalai','Vécsei',
      'Ádám','Balogh','Bogdán','Csiki','Dibusz','Gazdag','Hangya',
      'Horváth','Kádár','Kemény','Kovács','Könyves','Laczkó','Lendvai',
      'Lovrencsics','Mátyás','Papp','Patkai','Pintér','Simon','Szűcs',
    ],
  },
  romanian: {
    first: [
      'Adrian','Alexandru','Andrei','Bogdan','Ciprian','Constantin','Cosmin',
      'Dan','Dănuț','Flavius','Florin','Gabriel','George','Gheorghe','Iancu',
      'Ioan','Lucian','Marius','Mihai','Mircea','Octavian','Radu','Stefan','Tudor',
      'Alin','Călin','Claudiu','Cristian','Cristinel','Dorin','Emil','Emilian',
      'Eugen','Ionuț','Laurențiu','Liviu','Marcel','Nicu','Paul','Petre',
      'Remus','Relu','Sorin','Tiberiu','Vasile','Vlad','Valentin','Victor',
    ],
    last: [
      'Alexe','Andone','Baluta','Bancu','Burcă','Cicâldău','Coman','Constantin',
      'Dragusin','Edjouma','Florescu','Hagi','Ioniță','Lespescu','Maxim','Mihaiu',
      'Moldovan','Moruțan','Nedelcearu','Nistor','Petre','Pintilii','Radunovic',
      'Rus','Stanciu','Tanase',
      'Alibec','Bălgrădean','Benzar','Chiricheș','Costache','Crețu',
      'Grigore','Hoban','Keșerü','Latovlevici','Marin','Mitrescu',
      'Pârvulescu','Petrescu','Radu','Roșu','Ștefănescu','Toșca',
    ],
  },

  // ── Latin American regional pools ─────────────────────────────────────────

  spanish_euro: {
    nicknames: [
      'Raúl','Torres','Villa','Hierro','Pirri','Míchel','Canales','Quini',
      'Etxeberria','Ferran','Nacho','Joselu','Brahim','Salva','Caballero',
    ],
    iconic_first: ['Xavi','Sergio','David','Iker','Fernando','Álvaro','Dani','Rodri','Raúl','Pablo'],
    iconic_last:  ['Ramos','Villa','Busquets','Torres','Navas','Olmo','Valverde','Silva','Laporte','Pedri'],
    first: [
      'Adrián','Aitor','Alberto','Alejandro','Álex','Alfonso','Álvaro','Ander','Andrés','Aritz',
      'Arnau','Asier','Borja','Carlos','César','Dani','Daniel','Diego','Eduardo','Emilio',
      'Enrique','Érik','Fernando','Francisco','Gabriel','Gerard','Gonzalo','Héctor','Hugo','Iker',
      'Iñaki','Isco','Iván','Javier','Joel','Jonathan','Jorge','José','Joselu','Juan',
      'Julián','Kevin','Koke','Lamine','Luis','Manuel','Marc','Marco','Marcos','Martín',
      'Miguel','Mikel','Nacho','Nico','Nicolás','Óscar','Pablo','Pau','Pedro','Rafael',
      'Raúl','Roberto','Rodrigo','Rodri','Rubén','Santi','Sergio','Tomás','Unai','Víctor',
      'Xavi','Yerlan',
    ],
    last: [
      'Aguilar','Alonso','Álvarez','Baena','Blanco','Busquets','Calvo','Campos','Carvajal',
      'Castro','Cruz','Crespo','De la Fuente','Delgado','Díaz','Domínguez','Fabián',
      'Fernández','Flores','Franco','Fuentes','Gallardo','García','Gómez','González',
      'Gutiérrez','Herrera','Ibáñez','Iglesias','Jiménez','Lainez','Llorente','López',
      'Luque','Martín','Martínez','Medina','Méndez','Merino','Mesa','Miranda','Molina',
      'Montoya','Morales','Moreno','Muñoz','Navarro','Navas','Ocampos','Olmo','Ortega',
      'Ortiz','Oyarzabal','Paredes','Pérez','Prieto','Ramírez','Ramos','Reyes','Ríos',
      'Rodríguez','Rojas','Romero','Ruiz','Salinas','Sánchez','Serrano','Silva','Soler',
      'Suárez','Tapia','Torres','Valencia','Valverde','Vargas','Vega','Vidal','Villa','Zubimendi',
    ],
  },

  mexican: {
    first: [
      'Hirving','Jesús','Jonathan','Guillermo','Roberto','Edson','Carlos','Diego',
      'Miguel','Luis','Héctor','Andrés','Felipe','Oswaldo','Raúl','Ricardo','Alan',
      'Uriel','Rogelio','Henry','Alexis','José Juan','Santiago','José','Kevin',
      'Omar','Erick','Rodolfo','Irving','Fernando','Pablo','Daniel','Javier',
      'Gerardo','Marco','Álvaro','César','Salvador','Rubén','Rafael',
    ],
    last: [
      'Hernández','García','Martínez','López','González','Morales','Rodríguez',
      'Cruz','Chávez','Jiménez','Guardado','Lozano','Ochoa','Herrera','Ramos',
      'Flores','Méndez','Reyes','Gallardo','Vázquez','Salcedo','Álvarez','Sánchez',
      'Araujo','Montes','Aguirre','Cisneros','Castro','Moreno','Pedraza','Pizarro',
      'Gutiérrez','Macías','Reyna','Alvarado','Córdova','Lainez','Báez','Torres',
      'Luna','Murillo','Esquivel','Padilla','Serrano','Tapia','Aceves','Nájera',
    ],
  },

  rioplatense: {
    ar_motes: [
      'Piojo','Mono','Toro','Gato','Pato','Conejo',
      'Tigre','Lobo','Chivo','Patón','Bicho','Torito',
      'Flaco','Gordo','Negro','Cacho','Pichi','Nene','Tucu',
      'Narigón','Pelos','Bichi','Peque','Tata','Pipa',
      'Loco','Burrito','Payaso','Turco','Colo','Checho',
      'Pipe','Pelado','Cabezón','Ruso','Chelo','Churry',
      'Papu','Huevo','Tanque','Morro','Chueco','Topo',
    ],
    first: [
      'Lionel','Ángel','Joaquín','Lautaro','Leandro','Emiliano','Paulo','Valentín',
      'Rodrigo','Nicolás','Lucas','Santiago','Matías','Leonardo','Mauro','Ever',
      'Enzo','Exequiel','Nahitan','Edinson','Federico','Gastón','Maxi','Luis',
      'Agustín','Germán','Walter','Claudio','Diego','Facundo','Ramiro','Carlos',
      'Sergio','Roberto','Alejandro','Gonzalo','Oscar','Marcelo','Ivan','Adrian',
    ],
    last: [
      'Romero','González','Hernández','Martínez','Pérez','López','Rodríguez',
      'Di María','Tagliafico','Mac Allister','Otamendi','Molina','Acuña','Paredes',
      'De Paul','Almada','Cardozo','Roque','Valdez','Benítez','Almirón','Bobadilla',
      'Cavani','Godín','Bentancur','Valverde','Araújo','Nández','Suárez','Giménez',
      'Cáceres','García','Torres','Ramírez','Díaz','Morales','Flores','Castro',
      'Simeone','Batistuta','Tevez','Milito','Palacio','Dybala','Domínguez',
    ],
  },

  colombian: {
    first: [
      'James','Juan','Luis','Gustavo','David','Yerry','Cristian','Duván',
      'Santiago','Jefferson','Wilmar','Stefan','Edwin','Johan','Radamel','Oscar',
      'Carlos','Miguel','Davinson','Rafael','Felipe','Jhon','Harold','Teo',
      'Alfredo','Jorge','William','Stiven','Mateus','Borja','Cucho','Alfredo',
      'Jhon Jáider','Roger','Fabián','Nelson','Camilo','Rioaldo',
    ],
    last: [
      'Falcao','Ospina','Cuadrado','Mina','Barrios','Muriel','Zapata','Arias',
      'Borja','Mosquera','Córdoba','Valencia','Perea','Asprilla','Higuita',
      'Valderrama','Rincón','Cuellar','Martínez','Hernández','García','López',
      'Rodríguez','González','Díaz','Cuesta','Lucumí','Mojica','Morelos','Urrego',
      'Soteldo','Rondón','Machis','Bello','Murillo','Angulo','Cassierra','Palomino',
      'Quiñones','Sinisterra','Castaño','Medina','Gutiérrez','Chará','Lenis',
    ],
  },

  andean: {
    first: [
      'Paolo','André','Gianluca','Jefferson','Renato','Christian','Enner','Moisés',
      'Byron','Ángel','Gonzalo','Carlos','Alexis','Arturo','Erick','Gary','Eduardo',
      'Mauricio','Claudio','Marcelo','Erwin','Juan Carlos','Ramiro','Felipe',
      'Sebastián','Esteban','Darío','Jaime','Rodrigo','Héctor','Raúl','Luis',
      'Roberto','Miguel','Ivan','Fernando','Diego','Jhonnier','Óscar',
    ],
    last: [
      'Guerrero','Farfán','Flores','Tapia','Cueva','Peña','Trauco','Advíncula',
      'Zambrano','Valencia','Plata','Arboleda','Estupiñán','Caicedo','Hincapié',
      'Sánchez','Vidal','Aranguiz','Medel','Bravo','Salas','Isla','Orellana',
      'Fuenzalida','Moreno','Algarañaz','Saucedo','Vaca','Hurtado','Jiménez',
      'González','Valdez','Romero','Santa Cruz','Giménez','Cáceres','Roque',
      'Torres','Pinilla','Vargas','Puch','Castillo','Mosquera','Córdova',
    ],
  },
};

// Map team code → name pool key
const CULTURE_MAP = {
  'fr': 'french', 'be': 'french', 'nc': 'french', 'pf': 'french', 'ht': 'french',
  'es': 'spanish_euro',
  'ar': 'rioplatense', 'uy': 'rioplatense', 'py': 'rioplatense',
  'mx': 'mexican', 'cr': 'mexican', 'pa': 'mexican', 'hn': 'mexican', 'sv': 'mexican',
  'gt': 'mexican', 'ni': 'mexican', 'cw': 'mexican', 'do': 'mexican', 'cu': 'mexican',
  'co': 'colombian', 've': 'colombian',
  'cl': 'andean', 'pe': 'andean', 'ec': 'andean', 'bo': 'andean',
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
  'jp': 'japanese', 'kr': 'korean', 'cn': 'chinese', 'kp': 'chinese',
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

// Pools a los que puede pertenecer un jugador naturalizado por país
// Probabilidad de tener 1 naturalizado: ~2% por equipo → ~2-3 por Mundial
const NATURALIZATION_NEIGHBORS = {
  'es': ['north_african', 'colombian', 'andean'],
  'fr': ['west_african', 'north_african'],
  'de': ['turkish', 'slavic_west'],
  'nl': ['west_african', 'turkish'],
  'be': ['west_african', 'turkish', 'north_african'],
  'ch': ['italian', 'turkish', 'slavic_west'],
  'at': ['slavic_west', 'slavic_east'],
  'gb-eng': ['west_african', 'east_african'],
  'gb-sct': ['west_african'],
  'ie': ['west_african'],
  'us': ['mexican', 'west_african'],
  'ca': ['west_african'],
  'ru': ['central_asian'],
  'br': ['west_african', 'italian'],
  'ar': ['italian', 'colombian'],
  'pt': ['west_african', 'north_african'],
  'jp': ['portuguese'],
  'au': ['pacific_islander'],
  'ma': ['french'],
  'qa': ['middle_east'],
  'ae': ['middle_east'],
  'sa': ['middle_east'],
  'tr': ['slavic_east'],
  'se': ['west_african'],
  'no': ['west_african'],
};

/**
 * Pick a culturally appropriate name for a player.
 * Special patterns by country:
 *   - Brazil (br): mononyms (Willian, Maicon…)
 *   - Iceland (is): patronymics (Sigurdsson…)
 *   - Argentina (ar): motes (Piojo, Torito…)
 *   - Netherlands (nl): Van/De compound surnames
 *   - Spanish-speaking (es…): occasional single-name players (Raúl, Torres…)
 *   - Starters (slots 0-10): boosted chance of iconic first/last names
 *
 * @param {object} rng         - PRNG instance
 * @param {object} pool        - Cultural name pool
 * @param {object} [opts]
 * @param {boolean} [opts.isStarter=false]   - Boost iconic names for top-slot players
 * @param {string|null} [opts.countryCode]   - ISO country code for special patterns
 */
function pickName(rng, pool, { isStarter = false, countryCode = null } = {}) {
  // ── Brazil: mononyms (Willian, Taison style) ──────────────────────────────
  if (countryCode === 'br' && pool.mononyms) {
    const chance = isStarter ? 0.30 : 0.15;
    if (rng.next() < chance) {
      return pool.mononyms[Math.floor(rng.next() * pool.mononyms.length)];
    }
  }

  // ── Iceland: patronymics (Sigurdsson, Gunnarsson style) ───────────────────
  if (countryCode === 'is' && pool.patronymics) {
    const first = pool.first[Math.floor(rng.next() * pool.first.length)];
    const last = pool.patronymics[Math.floor(rng.next() * pool.patronymics.length)];
    return `${first} ${last}`;
  }

  // ── Argentina: motes (Piojo García, Mono Díaz style) ─────────────────────
  if (countryCode === 'ar' && pool.ar_motes && rng.next() < 0.18) {
    const mote = pool.ar_motes[Math.floor(rng.next() * pool.ar_motes.length)];
    const last = pool.last[Math.floor(rng.next() * pool.last.length)];
    return `${mote} ${last}`;
  }

  // ── Scotland / Ireland: Mc/Mac surnames (~28% chance) ────────────────────
  if ((countryCode === 'gb-sct' || countryCode === 'ie') && pool.mc_surnames && rng.next() < 0.28) {
    const first = pool.first[Math.floor(rng.next() * pool.first.length)];
    const last = pool.mc_surnames[Math.floor(rng.next() * pool.mc_surnames.length)];
    return `${first} ${last}`;
  }

  // ── Netherlands: van/de compound surnames (~20% chance) ──────────────────
  if (countryCode === 'nl' && pool.nl_surnames && rng.next() < 0.20) {
    const first = pool.first[Math.floor(rng.next() * pool.first.length)];
    const last = pool.nl_surnames[Math.floor(rng.next() * pool.nl_surnames.length)];
    return `${first} ${last}`;
  }

  // ── Spanish single-name players (Raúl, Torres, Villa…) ───────────────────
  if (pool.nicknames && rng.next() < 0.12) {
    return pool.nicknames[Math.floor(rng.next() * pool.nicknames.length)];
  }

  // ── First name: prefer iconic sublist for important players ───────────────
  let firstArr = pool.first;
  if (isStarter && pool.iconic_first && rng.next() < 0.40) {
    firstArr = pool.iconic_first;
  }
  const first = firstArr[Math.floor(rng.next() * firstArr.length)];

  // ── Last name: prefer iconic sublist for important players ────────────────
  let lastArr = pool.last;
  if (isStarter && pool.iconic_last && rng.next() < 0.40) {
    lastArr = pool.iconic_last;
  }
  const last = lastArr[Math.floor(rng.next() * lastArr.length)];

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

  // Naturalized player: ~10% chance per eligible team → ~2-3 per 128-team World Cup
  // Gets a name from a neighboring culture; always a field player (slot 3-24)
  const neighbors = NATURALIZATION_NEIGHBORS[team.code];
  const naturalizedPool = (() => {
    if (!neighbors || rng.next() >= 0.10) return null;
    const key = neighbors[Math.floor(rng.next() * neighbors.length)];
    return POOLS[key] ?? null;
  })();
  const naturalizedSlot = naturalizedPool ? rng.nextInt(3, 24) : -1;

  // Track used names to avoid duplicates within squad
  const usedNames = new Set();

  return SQUAD_POSITIONS.map((position, index) => {
    // Slots 0-10 (GKs + all defenders) are considered top-squad players
    const isStarter = index <= 10;
    const activePool = (index === naturalizedSlot && naturalizedPool) ? naturalizedPool : pool;

    let name;
    let attempts = 0;
    do {
      name = pickName(rng, activePool, { isStarter, countryCode: team.code });
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
