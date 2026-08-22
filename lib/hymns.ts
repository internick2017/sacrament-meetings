import type { Hymn } from './types';
import type { Locale } from './i18n/config';

// Hymn titles and numbers differ between the hymnbooks of The Church of Jesus
// Christ of Latter-day Saints: the same hymn is number 6 in English, 5 in
// Spanish and 50 in Portuguese. Meetings are stored with whatever the clerk
// typed, so this table maps a known English hymn to its official counterpart.
//
// Source: the Church's own official cross-reference PDFs —
// "Tabela de Referência Cruzada de Hinos em Português" and
// "Tabla de correlación entre los himnos en inglés y español" — merged and
// cross-checked against each other and against churchofjesuschrist.org.
// Covers every hymn in the (smaller) Portuguese hymnal plus every hymn in the
// Spanish hymnal, ~203 of the ~341 English hymns. A hymn missing from one
// side has no official translation into that language (e.g. "With Humble
// Heart" has neither); a hymn missing from this table entirely was never
// captured by either cross-reference document (rare — mostly patriotic,
// men's/women's, or very old restoration-era hymns).
export interface LocalizedHymn {
  number: number;
  title: string;
}

interface HymnEntry {
  // English title as printed in the 1985 hymnbook.
  en: string;
  // Absent when that hymnbook has no counterpart for this hymn.
  es?: LocalizedHymn;
  pt?: LocalizedHymn;
}

const HYMN_TABLE: HymnEntry[] = [
  {
    en: 'A Mighty Fortress Is Our God',
    es: { number: 32, title: 'Baluarte firme es nuestro Dios' },
    pt: { number: 32, title: 'Castelo forte' },
  },
  {
    en: 'A Poor Wayfaring Man of Grief',
    es: { number: 16, title: 'Un pobre forastero' },
    pt: { number: 15, title: 'Um pobre e aflito viajor' },
  },
  {
    en: 'Abide with Me!',
    es: { number: 99, title: 'Acompáñame' },
    pt: { number: 97, title: 'Comigo habita' },
  },
  {
    en: 'Abide with Me; \'Tis Eventide',
    es: { number: 98, title: 'Conmigo quédate, Señor' },
    pt: { number: 96, title: 'É tarde, a noite logo vem' },
  },
  {
    en: 'Again We meet Around the Board',
    es: { number: 113, title: 'Ya nos juntamos otra vez' },
  },
  {
    en: 'All Creatures of Our God and King',
    es: { number: 31, title: 'Oh, creaciones del Señor' },
    pt: { number: 29, title: 'Ó Criaturas do Senhor' },
  },
  {
    en: 'All Glory, Laud, and Honor',
    es: { number: 33, title: 'Honor, loor y gloria' },
    pt: { number: 38, title: 'Que toda honra e glória' },
  },
  {
    en: 'An Angel from on High',
    es: { number: 9, title: 'Un ángel del Señor' },
    pt: { number: 6, title: 'Um anjo lá do céu' },
  },
  {
    en: 'Angels We Have Heard on High',
    es: { number: 126, title: 'Cantan santos ángeles' },
    pt: { number: 124, title: 'Anjos descem a cantar' },
  },
  {
    en: 'As I Search the Holy Scriptures',
    es: { number: 180, title: 'Al leer las Escrituras' },
    pt: { number: 176, title: 'Estudando as escrituras' },
  },
  {
    en: 'As Sisters in Zion',
    es: { number: 205, title: 'Sirvamos unidas' },
    pt: { number: 200, title: 'Irmãs em Sião' },
  },
  {
    en: 'As the Dew from Heaven Distilling',
    es: { number: 87, title: 'Cual rocío, que destila' },
    pt: { number: 91, title: 'Qual orvalho que cintila' },
  },
  {
    en: 'Away in a Manger',
    es: { number: 125, title: 'Jesús en pesebre' },
    pt: { number: 127, title: 'Jesus num presepe' },
  },
  {
    en: 'Battle Hymn of the Republic',
    es: { number: 28, title: 'Himno de batalla de la República' },
    pt: { number: 180, title: 'Já refulge a glória eterna' },
  },
  {
    en: 'Be Thou Humble',
    es: { number: 70, title: 'Sé humilde' },
    pt: { number: 74, title: 'Sê humilde' },
  },
  {
    en: 'Beautiful Zion, Built Above',
    es: { number: 23, title: 'Bella Sión' },
    pt: { number: 25, title: 'Bela Sião' },
  },
  {
    en: 'Because I have been given much',
    es: { number: 137, title: 'Tú me has dado muchas bendiciones, Dios' },
    pt: { number: 135, title: 'Eu devo partilhar' },
  },
  {
    en: 'Before Thee, Lord, I Bow My Head',
    es: { number: 93, title: 'A ti, Señor' },
  },
  {
    en: 'Behold the Great Redeemer Die',
    es: { number: 114, title: 'Cristo, el Redentor, murió' },
    pt: { number: 110, title: 'Vede, morreu o Redentor' },
  },
  {
    en: 'Behold thy Sons and Daughters',
    es: { number: 147, title: 'Le Saint-Esprit soit avec nous' },
    pt: { number: 169, title: 'Eis os Teus Filhos, Ó Senhor' },
  },
  {
    en: 'Behold! A Royal Army',
    es: { number: 163, title: '¡Mirad! Reales huestes' },
    pt: { number: 161, title: 'As hostes do eterno' },
  },
  {
    en: 'Brightly Beams Our Father’s Mercy',
    es: { number: 208, title: 'Brillan rayos de clemencia' },
    pt: { number: 202, title: 'Brilham raios de clemência' },
  },
  {
    en: 'Called to Serve',
    es: { number: 161, title: 'Llamados a servir' },
    pt: { number: 166, title: 'Somos hoje conclamados' },
  },
  {
    en: 'Carry on',
    es: { number: 167, title: 'A vencer' },
    pt: { number: 184, title: 'Constantes qual firmes montanhas' },
  },
  {
    en: 'Children of Our Heavenly Father',
    es: { number: 204, title: 'Hijos de nuestro Padre' },
    pt: { number: 190, title: 'Os Sei Que Deus Vive' },
  },
  {
    en: 'Choose the Right',
    es: { number: 155, title: 'Haz el bien' },
    pt: { number: 148, title: 'Faze o bem, escolhendo o que é certo' },
  },
  {
    en: 'Christ the Lord Is Risen Today',
    es: { number: 122, title: 'Cristo ha resucitado' },
    pt: { number: 120, title: 'Cristo já ressuscitou' },
  },
  {
    en: 'Come All Ye Saints Who Dwell on Earth',
    pt: { number: 30, title: 'Ó Santos, Que na Terra Habitais' },
  },
  {
    en: 'Come Away to the Sunday School',
    es: { number: 181, title: 'Cuando raya el nuevo dia' },
    pt: { number: 173, title: 'Ao raiar o novo dia' },
  },
  {
    en: 'Come Listen to a Prophet\'s Voice',
    es: { number: 11, title: 'Dios manda a profetas' },
    pt: { number: 10, title: 'Vinde ao profeta escutar' },
  },
  {
    en: 'Come unto Jesus',
    es: { number: 60, title: 'Venid a Cristo' },
    pt: { number: 69, title: 'Vinde a Cristo' },
  },
  {
    en: 'Come, All Ye Sons of God (Men)',
    es: { number: 206, title: 'Venid, los que tenéis de Dios el sacerdocio' },
    pt: { number: 201, title: 'Ó filhos do Senhor' },
  },
  {
    en: 'Come, All Ye Sons of Zion',
    pt: { number: 21, title: 'Ao salvador louvemos' },
  },
  {
    en: 'Come, Come, Ye Saints',
    es: { number: 17, title: '¡Oh, está todo bien!' },
    pt: { number: 20, title: 'Vinde, ó santos' },
  },
  {
    en: 'Come, Follow Me',
    es: { number: 61, title: 'Venid a mi' },
    pt: { number: 68, title: 'Vinde a mim' },
  },
  {
    en: 'Come, O Thou King of Kings',
    es: { number: 27, title: 'Oh Rey de reyes, ven' },
    pt: { number: 28, title: 'Ó vem, supremo Rei' },
  },
  {
    en: 'Come, Thou Glorious Day of Promise',
    es: { number: 29, title: 'Ven, oh día prometido' },
    pt: { number: 24, title: 'Vem, ó dia prometido' },
  },
  {
    en: 'Come, We That Love the Lord',
    es: { number: 64, title: 'Venid, los que a Dios amáis' },
    pt: { number: 45, title: 'Ó vós que amais ao Senhor' },
  },
  {
    en: 'Come, Ye Children of the Lord',
    es: { number: 26, title: 'Hijos del Señor, venid' },
    pt: { number: 27, title: 'Vinde, ó filhos do Senhor' },
  },
  {
    en: 'Come, Ye Thankful People',
    es: { number: 46, title: 'Elevemos nuestros himnos' },
    pt: { number: 52, title: 'Vinde, ó povos, graças dar' },
  },
  {
    en: 'Count Your Blessings',
    es: { number: 157, title: 'Cuenta tus bendiciones' },
    pt: { number: 57, title: 'Se da vida as vagas' },
  },
  {
    en: 'Dear to the Heart of the Shepherd',
    es: { number: 139, title: 'Ama el Pastor las ovejas' },
    pt: { number: 140, title: 'Ama o Pastor seu rebanho' },
  },
  {
    en: 'Dearest Children, God Is Near You',
    es: { number: 47, title: 'Caros niños, Dios os ama' },
    pt: { number: 192, title: 'Ó crianças, Deus vos ama' },
  },
  {
    en: 'Did You Think to Pray?',
    es: { number: 81, title: '¿Pensaste orar?' },
    pt: { number: 83, title: 'Com fervor fizeste a prece?' },
  },
  {
    en: 'Do What Is Right',
    es: { number: 154, title: 'Haz tú lo justo' },
    pt: { number: 147, title: 'Faze o bem' },
  },
  {
    en: 'Each Life that Touches Ours for Good',
    es: { number: 188, title: 'Quienes nos brindan su amor' },
    pt: { number: 145, title: 'Sempre que alguém nos faz o bem' },
  },
  {
    en: 'Families Can be Together Forever',
    es: { number: 195, title: 'Las familias pueden ser eternas' },
    pt: { number: 191, title: 'Uma família, tenho sim' },
  },
  {
    en: 'Far, Far Away on Judea\'s Plains',
    es: { number: 134, title: 'En la Judea, en tierra de Dios' },
    pt: { number: 123, title: 'Lá na Judéia, onde Cristo nasceu' },
  },
  {
    en: 'Father in Heaven',
    es: { number: 82, title: 'Padre en los cielos' },
    pt: { number: 64, title: 'Ó Pai Celeste' },
  },
  {
    en: 'First Noel',
    es: { number: 132, title: 'La primera Navidad' },
    pt: { number: 133, title: 'Quando o anjo proclamou' },
  },
  {
    en: 'For all the Saints',
    es: { number: 136, title: 'Todos los santos' },
  },
  {
    en: 'For the Beauty of the Earth',
    es: { number: 43, title: 'Por la belleza terrenal' },
    pt: { number: 49, title: 'Pela beleza que há no chão' },
  },
  {
    en: 'For the Strength of the Hills',
    es: { number: 19, title: 'Por tus dones loor cantamos' },
    pt: { number: 17, title: 'Por teus dons' },
  },
  {
    en: 'Gently Raise the Sacred Strain',
    es: { number: 83, title: 'Entonad sagrado son' },
    pt: { number: 100, title: 'Entoai a Deus louvor' },
  },
  {
    en: 'Glory to God on High',
    es: { number: 37, title: 'Glorias cantad a Diaos' },
    pt: { number: 33, title: 'Glória a Deus cantai' },
  },
  {
    en: 'Go Forth with Faith',
    es: { number: 169, title: 'Al mundo ve a predicar' },
    pt: { number: 170, title: 'Avante, ao mundo proclamai' },
  },
  {
    en: 'Go, Ye Messengers of Heaven',
    es: { number: 7, title: 'Id, vosotros mensajeros' },
  },
  {
    en: 'God Be with You Till We Meet Again',
    es: { number: 89, title: 'Para siempre Dios esté con vos' },
    pt: { number: 85, title: 'Deus vos guarde' },
  },
  {
    en: 'God Bless our Prophet Dear',
    es: { number: 13, title: 'Bendice, Dios, a nuestro Profeta' },
    pt: { number: 11, title: 'Ó Pai Celestial' },
  },
  {
    en: 'God Is Love',
    es: { number: 44, title: 'El sublime Creador' },
    pt: { number: 36, title: 'Deste mundo as flores mil' },
  },
  {
    en: 'God Loved Us, So He Sent His Son',
    es: { number: 112, title: 'El Padre tanto nos amó' },
    pt: { number: 107, title: 'Deus tal amor por nós mostrou' },
  },
  {
    en: 'God Moves in a Mysterious Way',
    es: { number: 191, title: 'Con maravillas obra Dios' },
    pt: { number: 139, title: 'Deus é consolador sem par' },
  },
  {
    en: 'God of Our Fathers, We Come unto The',
    es: { number: 36, title: 'Padre bendito, venimos a ti' },
    pt: { number: 48, title: 'Ó Pai Bendito' },
  },
  {
    en: 'God of Our Fathers, Whose Almighty Hand',
    es: { number: 34, title: 'Oh, Santo Dios, omnipotente ser' },
    pt: { number: 31, title: 'Com braço forte' },
  },
  {
    en: 'God Speed the Right',
    es: { number: 55, title: 'Dios da valor' },
    pt: { number: 46, title: 'Nossas vozes elevemos' },
  },
  {
    en: 'God\'s Daily Care',
    es: { number: 201, title: 'Dios cuida a sus hijos' },
    pt: { number: 198, title: 'Quando vejo o sol raiar' },
  },
  {
    en: 'God, Our Father, Hear Us Pray',
    es: { number: 101, title: 'Dios, escúchanos orar' },
    pt: { number: 101, title: 'Deus, escuta' },
  },
  {
    en: 'Guide Me to Thee',
    es: { number: 52, title: 'Guíame a ti' },
    pt: { number: 63, title: 'Guia-me a Ti' },
  },
  {
    en: 'Hail to the Brightness of Zion\'s Glad Morning',
    es: { number: 21, title: '¡Salve, Sión! Es tu día ilustre' },
  },
  {
    en: 'Hark! The Herald Angels Sing',
    es: { number: 130, title: 'Escuchad el son triunfal' },
    pt: { number: 132, title: 'Eis dos anjos a harmonia' },
  },
  {
    en: 'Hark, All Ye Nations!',
    es: { number: 171, title: 'La luz de la verdad' },
    pt: { number: 168, title: 'Povos da terra, vinde, escutai!' },
  },
  {
    en: 'Have I Done Any Good?',
    es: { number: 141, title: '¿En el mundo he hecho bien?' },
    pt: { number: 136, title: 'Neste mundo' },
  },
  {
    en: 'He Died! The Great Redeemer Died',
    es: { number: 117, title: '¡Murió! El Redentor murió' },
  },
  {
    en: 'He Is Risen!',
    es: { number: 121, title: 'Himno de la Pascua de Resurrección' },
    pt: { number: 119, title: 'Cristo é já ressuscitado' },
  },
  {
    en: 'Help Me Teach with Inspiration',
    es: { number: 172, title: 'Cuando enseñe a Tus hijos' },
    pt: { number: 143, title: 'Pai, inspira-me, eu peço' },
  },
  {
    en: 'High on the Mountain Top',
    es: { number: 4, title: 'Bandera de Sión' },
    pt: { number: 4, title: 'No monte a bandeira' },
  },
  {
    en: 'Holy Temples on Mount Zion',
    es: { number: 183, title: 'Santos templos de Sión' },
  },
  {
    en: 'Home Can Be a Heaven on Earth',
    es: { number: 193, title: 'El hogar es como el cielo' },
    pt: { number: 189, title: 'Pode o lar ser como o céu' },
  },
  {
    en: 'Hope of Israel',
    es: { number: 168, title: 'Juventud de Israel' },
    pt: { number: 182, title: 'Juventude da promessa' },
  },
  {
    en: 'How Firm a Foundation',
    es: { number: 40, title: 'Qué firmes cimientos' },
    pt: { number: 42, title: 'Que firme alicerce' },
  },
  {
    en: 'How Gentle God\'s Commands',
    es: { number: 66, title: 'Cuán dulce la ley de Dios' },
    pt: { number: 47, title: 'Com sábio e terno amor' },
  },
  {
    en: 'How Great the Wisdom and the Love',
    es: { number: 116, title: 'Jesús, en la corte celestial' },
    pt: { number: 114, title: 'Da corte celestial' },
  },
  {
    en: 'How Great Thou Art',
    es: { number: 41, title: '¡Grande eres tú!' },
    pt: { number: 43, title: 'Grandioso És Tu' },
  },
  {
    en: 'How Wondrous and Great',
    es: { number: 174, title: 'Qué maravillosas tus obras' },
    pt: { number: 178, title: 'Ó quão majestosa é a obra de Deus' },
  },
  {
    en: 'I am a Child of God',
    es: { number: 196, title: 'Soy un hijo de Dios' },
    pt: { number: 193, title: 'Sou um filho de Deus' },
  },
  {
    en: 'I Believe in Christ',
    es: { number: 72, title: 'Creo en Cristo' },
    pt: { number: 66, title: 'Creio em Cristo' },
  },
  {
    en: 'I Heard the Bells on Christmas Day',
    es: { number: 133, title: 'Campanas de Navidad' },
    pt: { number: 125, title: 'Ouvi os sinos do Natal' },
  },
  {
    en: 'I Know My Father Lives',
    es: { number: 199, title: 'Dios vive' },
    pt: { number: 195, title: 'Que Deus vive eu sei' },
  },
  {
    en: 'I Know That My Redeemer Lives',
    es: { number: 73, title: 'Yo sé que vive mi Señor' },
    pt: { number: 70, title: 'Eu sei que vive meu Senhor' },
  },
  {
    en: 'I Need Thee Every Hour',
    es: { number: 49, title: 'Señor, te necesito' },
    pt: { number: 61, title: 'Careço de Jesus' },
  },
  {
    en: 'I Stand All Amazed',
    es: { number: 118, title: 'Asombro me da' },
    pt: { number: 112, title: 'Assombro me causa' },
  },
  {
    en: 'I\'ll Go Where You Want Me to Go',
    es: { number: 175, title: 'A donde me mandes iré' },
    pt: { number: 167, title: 'Talvez não seja em alto mar' },
  },
  {
    en: 'Improve the Shining Moments',
    es: { number: 145, title: 'La voz, ya, del eterno' },
    pt: { number: 152, title: 'Prolongue os bons momentos' },
  },
  {
    en: 'In Humility, Our Savior',
    es: { number: 102, title: 'Hoy con humildad te pido' },
    pt: { number: 102, title: 'Nossa humilde prece atende' },
  },
  {
    en: 'In Memory of the Crucified',
    es: { number: 115, title: 'Nos reunimos, Padre, hoy' },
    pt: { number: 111, title: 'Lembrando a morte de Jesus' },
  },
  {
    en: 'In Our Lovely Deseret',
    es: { number: 202, title: 'En el pueblo de Sión' },
    pt: { number: 196, title: 'Nas montanhas de Sião' },
  },
  {
    en: 'In Remembrance of Thy Suffering',
    es: { number: 110, title: 'En memoria de tu muerte' },
  },
  {
    en: 'Israel, Israel, God Is Calling',
    es: { number: 6, title: 'Israel, Jesús os llama' },
    pt: { number: 5, title: 'Israel, Jesus te chama' },
  },
  {
    en: 'It Came upon the Midnight Clear',
    es: { number: 128, title: 'A medianoche se oyó' },
    pt: { number: 128, title: 'Na bela noite se ouviu' },
  },
  {
    en: 'Jehovah, Lord of Heaven and Earth',
    es: { number: 156, title: 'Señor del cielo, Jehová' },
    pt: { number: 179, title: 'Ó Jeová, Senhor do céu' },
  },
  {
    en: 'Jesus of Nazareth, Savior and King',
    es: { number: 105, title: 'Jesús de Nazaret' },
    pt: { number: 106, title: 'Jesus de Nazaré, Mestre e Rei' },
  },
  {
    en: 'Jesus, Lover of My Soul',
    es: { number: 53, title: '¡Oh Jesús, mi gran amor!' },
    pt: { number: 65, title: 'Jesus Cristo é meu Senhor' },
  },
  {
    en: 'Jesus, Once of Humble Birth',
    es: { number: 120, title: 'Tan humilde al nacer' },
    pt: { number: 115, title: 'Tão humilde ao nascer' },
  },
  {
    en: 'Jesus, Savior, Pilot Me',
    es: { number: 51, title: 'Guíame, oh Salvador' },
  },
  {
    en: 'Jesus, the Very Thought of Thee',
    es: { number: 76, title: 'Tan sólo con pensar en ti' },
    pt: { number: 84, title: 'Só por em ti, Jesus, pensar' },
  },
  {
    en: 'Joseph Smith\'s First Prayer',
    es: { number: 14, title: 'La oración del Profeta' },
    pt: { number: 12, title: 'Que manhã maravilhosa!' },
  },
  {
    en: 'Joy to the World',
    es: { number: 123, title: '¡Regocijad! Jesús nació' },
    pt: { number: 121, title: 'Mundo feliz, nasceu Jesus' },
  },
  {
    en: 'Keep the Commandments',
    es: { number: 197, title: 'Siempre obedece los mandamientos' },
    pt: { number: 194, title: 'Guarda os mandamentos' },
  },
  {
    en: 'Know This, That Every Soul is Free',
    es: { number: 155, title: 'Sachez que chacun peut choisir' },
    pt: { number: 149, title: 'A Alma È Livre' },
  },
  {
    en: 'Lead, Kindly Light',
    es: { number: 48, title: 'Divina Luz' },
    pt: { number: 60, title: 'Na escuridão, oh, brilha, meiga luz' },
  },
  {
    en: 'Let Earth’s Inhabitants Rejoice',
    pt: { number: 13, title: 'Rejubilai-vos, Ó Naões' },
  },
  {
    en: 'Let the Holy Spirit Guide',
    es: { number: 77, title: 'Deja que el Espíritu te enseñe' },
    pt: { number: 80, title: 'Santo Espírito de Deus' },
  },
  {
    en: 'Let Us All Press On',
    es: { number: 158, title: 'Trabajemos hoy en la obra' },
    pt: { number: 141, title: 'Trabalhemos hoje' },
  },
  {
    en: 'Let Us Oft Speak Kind Words',
    es: { number: 151, title: 'Oh, hablemos con tiernos acentos' },
    pt: { number: 137, title: 'Oh! falemos palavras amáveis' },
  },
  {
    en: 'Lo, the Mighty God Appearing!',
    es: { number: 25, title: 'Jehová aparece en Su gloria' },
  },
  {
    en: 'Lord, Accept Our True Devotion',
    es: { number: 192, title: '¿Por qué somos?' },
  },
  {
    en: 'Lord, Dismiss Us with Thy Blessing',
    es: { number: 100, title: 'Dios, bendícenos' },
    pt: { number: 88, title: 'Dá-nos, tu, ó Pai bondoso' },
  },
  {
    en: 'Lord, I would follow Thee',
    es: { number: 138, title: 'Señor, yo te seguiré' },
    pt: { number: 134, title: 'Salvador, eu quero amar-te' },
  },
  {
    en: 'Lord, We Ask Thee Ere We Part',
    es: { number: 90, title: 'Padre, antes de partir' },
    pt: { number: 86, title: 'Nós pedimos-te, Senhor' },
  },
  {
    en: 'Lord, We Come Before Thee Now',
    es: { number: 97, title: 'Ante ti, Señor, tu grey' },
    pt: { number: 95, title: 'Eis-nos, hoje, a teus pés' },
  },
  {
    en: 'Love at Home',
    es: { number: 194, title: 'Cuando hay amor' },
    pt: { number: 188, title: 'Tudo é belo em derredor' },
  },
  {
    en: 'Love One Another',
    es: { number: 203, title: 'Amad a otros' },
    pt: { number: 197, title: 'Amai-vos uns aos outros' },
  },
  {
    en: 'Master, the Tempest Is Raging',
    es: { number: 54, title: 'Paz, cálmense' },
    pt: { number: 72, title: 'Mestre o mar se revolta' },
  },
  {
    en: 'More Holiness Give Me',
    es: { number: 71, title: 'Más santidad dame' },
    pt: { number: 75, title: 'Mais vontade dá-me' },
  },
  {
    en: 'My Redeemer Lives',
    es: { number: 74, title: 'Vive mi Señor' },
    pt: { number: 67, title: 'Eu sei que vive o Redentor' },
  },
  {
    en: 'Nearer, My God, to Thee',
    es: { number: 50, title: 'Más cerca, Dios, de ti' },
    pt: { number: 62, title: 'Mais perto quero estar' },
  },
  {
    en: 'Now Let Us Rejoice',
    es: { number: 3, title: 'Ya regocijemos' },
    pt: { number: 3, title: 'Alegres cantemos' },
  },
  {
    en: 'Now the Day Is Over',
    es: { number: 94, title: 'Ya termina el día' },
    pt: { number: 92, title: 'Vai fugindo o dia' },
  },
  {
    en: 'O God, the Eternal Father',
    es: { number: 104, title: 'Oh Dios, Eterno Padre' },
    pt: { number: 98, title: 'Ó Deus, Senhor eterno' },
  },
  {
    en: 'O Little Town of Bethlehem',
    es: { number: 129, title: 'Oh, pueblecito de Belén' },
    pt: { number: 129, title: 'Pequena vila de Belém' },
  },
  {
    en: 'O Love that Glorifies the Son',
    es: { number: 189, title: 'Oh Padre, llénanos de amor' },
    pt: { number: 157, title: 'Amor que Cristo demonstrou' },
  },
  {
    en: 'O My Father',
    es: { number: 187, title: 'Oh mi Padre' },
    pt: { number: 177, title: 'Ó meu Pai' },
  },
  {
    en: 'O Thou Kind and Gracious Father',
    es: { number: 86, title: 'Nuestro bondadoso Padre' },
    pt: { number: 87, title: 'Ó bondoso Pai eterno' },
  },
  {
    en: 'O Thou Rock of Our Salvation',
    es: { number: 168, title: 'Rocher du salut suprême' },
    pt: { number: 158, title: 'Tu Jesus, Ó Rocha Eterna' },
  },
  {
    en: 'O Ye Mountains High',
    es: { number: 18, title: 'Oh Sión, santuario de libertad' },
    pt: { number: 16, title: 'Ó montanhas mil' },
  },
  {
    en: 'Oh Say, What is Truth?',
    es: { number: 177, title: '¿Qué es la verdad?' },
    pt: { number: 171, title: 'A verdade o que é?' },
  },
  {
    en: 'Oh, Come, All Ye Faithful',
    es: { number: 124, title: 'Venid, adoremos' },
    pt: { number: 122, title: 'Erguei-vos cantando' },
  },
  {
    en: 'Oh, Holy Words of Truth and Love',
    es: { number: 176, title: 'Palabras de amor' },
  },
  {
    en: 'Onward, Christian Soldiers',
    es: { number: 159, title: 'Con valor marchemos' },
    pt: { number: 162, title: 'Com valor marchemos' },
  },
  {
    en: 'Our Savior\'s Love',
    es: { number: 57, title: 'El amor del Salvador' },
  },
  {
    en: 'Praise God, from Whom All Blessings Flow',
    es: { number: 140, title: 'A Dios el Padre y a Jesús' },
    pt: { number: 59, title: 'Louvai o Eterno Criador' },
  },
  {
    en: 'Praise the Lord with Heart and Voice',
    es: { number: 36, title: 'Que chacun, de tout son coeur' },
    pt: { number: 39, title: 'Corações, Pois, Exultaia' },
  },
  {
    en: 'Praise to the Lord, the Almighty',
    es: { number: 37, title: 'Louange á Dieu' },
    pt: { number: 34, title: 'Louvai a Deus' },
  },
  {
    en: 'Praise to the Man',
    es: { number: 15, title: 'Loor al Profeta' },
    pt: { number: 14, title: 'Hoje ao profeta rendamos louvores' },
  },
  {
    en: 'Prayer Is the Soul\'s Sincere Desire',
    es: { number: 79, title: 'La oración del alma es' },
    pt: { number: 82, title: 'Eis-nos agora aqui' },
  },
  {
    en: 'Prayer of Thanksgiving',
    es: { number: 45, title: 'Oración de gratitud' },
    pt: { number: 51, title: 'Unidos, ó Pai' },
  },
  {
    en: 'Press Forward, Saints',
    es: { number: 38, title: 'Santos, avanzad' },
    pt: { number: 41, title: 'Firmes segui' },
  },
  {
    en: 'Put Your Shoulder to the Wheel',
    es: { number: 164, title: 'Pon tu hombro a la lid' },
    pt: { number: 142, title: 'A vida é luta sem quartel' },
  },
  {
    en: 'Redeemer of Israel',
    es: { number: 5, title: 'Oh Dios de Israel' },
    pt: { number: 50, title: 'Cantando louvamos' },
  },
  {
    en: 'Rejoice, the Lord Is King!',
    es: { number: 30, title: 'A Cristo Rey Jesús' },
    pt: { number: 35, title: 'A Deus, Senhor e Rei' },
  },
  {
    en: 'Reverently and Meekly Now',
    es: { number: 108, title: 'Mansos, reverentes hoy' },
  },
  {
    en: 'Rise, Ye Saints, and Temples Enter',
    es: { number: 184, title: 'Id, oh santos, a los templos' },
    pt: { number: 186, title: 'Levantai-vos, ide ao templo' },
  },
  {
    en: 'Rock of Ages',
    es: { number: 58, title: 'Roca de eternidad' },
    pt: { number: 76, title: 'Rocha eterna' },
  },
  {
    en: 'Saints, Behold How Great Jehovah',
    pt: { number: 18, title: 'Vede, Ó Santos' },
  },
  {
    en: 'Scatter Sunshine',
    es: { number: 150, title: 'Siembra gozo' },
    pt: { number: 155, title: 'Luz Espalhai' },
  },
  {
    en: 'Secret Prayer',
    es: { number: 80, title: 'Secreta oración' },
    pt: { number: 81, title: 'Há horas de preciosa paz' },
  },
  {
    en: 'Silent Night',
    es: { number: 127, title: 'Noche de luz' },
    pt: { number: 126, title: 'Noite feliz' },
  },
  {
    en: 'Sing We Now at Parting',
    es: { number: 91, title: 'Al partir cantemos' },
    pt: { number: 89, title: 'Ao partir cantemos' },
  },
  {
    en: 'Softly Now the Light of Day',
    es: { number: 96, title: 'El ocaso viene ya' },
    pt: { number: 93, title: 'Suavemente a noite cai' },
  },
  {
    en: 'Sweet Hour of Prayer',
    es: { number: 78, title: 'Oh dulce, grata oración' },
    pt: { number: 79, title: 'Ó doce, grata oração' },
  },
  {
    en: 'Sweet Is the Work',
    es: { number: 84, title: 'Dulce tu obra es, Señor' },
    pt: { number: 54, title: 'Doce é o trabalho' },
  },
  {
    en: 'Teach Me to Walk in the Light',
    es: { number: 198, title: 'Hazme andar en la luz' },
    pt: { number: 199, title: 'Quero aprender a seguir' },
  },
  {
    en: 'Testimony',
    es: { number: 75, title: 'Testimonio' },
    pt: { number: 71, title: 'Um testemunho é dom de Deus' },
  },
  {
    en: 'The Day Dawn Is Breaking',
    es: { number: 24, title: 'El alba ya rompe' },
    pt: { number: 26, title: 'O mundo desperta' },
  },
  {
    en: 'The Glorious Gospel Light Has Shone',
    es: { number: 185, title: 'En los postreros días' },
  },
  {
    en: 'The Happy Day at Last Has Come',
    es: { number: 20, title: 'Gozoso día llega ya' },
  },
  {
    en: 'The Iron Rod',
    es: { number: 179, title: 'La barra de hierro' },
  },
  {
    en: 'The Light Divine',
    es: { number: 200, title: 'La luz de Dios' },
    pt: { number: 77, title: 'A luz de Deus' },
  },
  {
    en: 'The Lord Is My Light',
    es: { number: 42, title: 'Jesús es mi luz' },
    pt: { number: 44, title: 'Jesus, minha luz' },
  },
  {
    en: 'The Lord Is My Shepherd',
    es: { number: 56, title: 'Jehová mi Pastor es' },
    pt: { number: 37, title: 'O Senhor meu Pastor é' },
  },
  {
    en: 'The Morning Breaks',
    es: { number: 1, title: 'Ya rompe el alba' },
    pt: { number: 1, title: 'A Alva Rompe' },
  },
  {
    en: 'The Spirit of God',
    es: { number: 2, title: 'El Espíritu de Dios' },
    pt: { number: 2, title: 'Tal como um facho' },
  },
  {
    en: 'The Time is Far Spent',
    es: { number: 173, title: 'El fin se acerca' },
    pt: { number: 181, title: 'O fim se aproxima' },
  },
  {
    en: 'There Is a Green Hill Far Away',
    es: { number: 119, title: 'En un lejano cerro fue' },
    pt: { number: 113, title: 'No monte do Calvário' },
  },
  {
    en: 'There Is Sunshine in My Soul Today',
    es: { number: 146, title: 'Tengo gozo en mi alma hoy' },
    pt: { number: 151, title: 'Minha alma hoje tem a luz' },
  },
  {
    en: 'Though Deepening Trials',
    es: { number: 63, title: 'Aunque colmados de pesar' },
    pt: { number: 78, title: 'Embora cheios de pesar' },
  },
  {
    en: 'Thy Holy Word',
    es: { number: 165, title: 'Tu palabra' },
  },
  {
    en: 'Thy Spirit, Lord, Has Stirred Our Souls',
    es: { number: 95, title: 'El fuego del Espíritu' },
    pt: { number: 90, title: 'Teu santo Espírito, Senhor' },
  },
  {
    en: 'Tis Sweet to Sing the Matchless Love',
    es: { number: 106, title: 'Cuán grato es cantar loor' },
    pt: { number: 104, title: 'Quão grato é cantar louvor' },
  },
  {
    en: 'Today, While the Sun Shines',
    es: { number: 149, title: 'Trabajad con fervor' },
    pt: { number: 154, title: 'Enquanto o sol brilha' },
  },
  {
    en: 'True to the Faith',
    es: { number: 166, title: 'Firmes creced en la fe' },
    pt: { number: 183, title: 'Deve Sião fugir à luta?' },
  },
  {
    en: 'Truth Reflects Upon Our Senses',
    es: { number: 178, title: 'Nuestra mente se refleja' },
    pt: { number: 172, title: 'A verdade é nosso guia' },
  },
  {
    en: 'Turn Your Hearts',
    es: { number: 186, title: 'Volved vuestro corazón' },
  },
  {
    en: 'Upon the Cross of Calvary',
    es: { number: 111, title: 'En el Calvario, en la cruz' },
    pt: { number: 109, title: 'Em uma cruz Jesus morreu' },
  },
  {
    en: 'We Are All Enlisted',
    es: { number: 162, title: 'Somos los soldados' },
    pt: { number: 160, title: 'Somos os soldados' },
  },
  {
    en: 'We Are Marching On to Glory',
    es: { number: 144, title: 'A la gloria marcharemos' },
    pt: { number: 159, title: 'À glória nós iremos' },
  },
  {
    en: 'We Are Sowing',
    es: { number: 135, title: 'Hoy sembramos la semilla' },
    pt: { number: 165, title: 'Semeando' },
  },
  {
    en: 'We Ever Pray for Thee',
    es: { number: 12, title: 'Pedimos hoy por ti' },
    pt: { number: 8, title: 'Profeta, sempre a Deus, em teu favor' },
  },
  {
    en: 'We Have Partaken of Thy Love',
    es: { number: 92, title: 'Hemos sentido tu amor' },
    pt: { number: 99, title: 'Ao partilhar de teu amor' },
  },
  {
    en: 'We Love Thy House, O God',
    es: { number: 160, title: 'Tu casa amamos, Dios' },
  },
  {
    en: 'We Thank Thee, O God, for a Prophet',
    es: { number: 10, title: 'Te damos, Señor, nuestras gracias' },
    pt: { number: 9, title: 'Graças damos, ó Deus, por um profeta' },
  },
  {
    en: 'We\'ll Sing All Hail to Jesus\' Name',
    es: { number: 109, title: 'Cantemos todos a Jesús' },
    pt: { number: 105, title: 'Cantemos todos a Jesus' },
  },
  {
    en: 'Welcome, Welcome, Sabbath Morning',
    es: { number: 182, title: 'Bienvenido, día santo' },
    pt: { number: 174, title: 'Sê bem-vindo, dia santo' },
  },
  {
    en: 'What Was Witnessed in the Heavens?',
    es: { number: 8, title: '¿Qué es lo que vieron en las alturas?' },
    pt: { number: 7, title: 'O que vimos lá nos céus?' },
  },
  {
    en: 'When Faith Endures',
    es: { number: 68, title: 'La fe' },
    pt: { number: 53, title: 'Se tenho fé' },
  },
  {
    en: 'Where Can I Turn for Peace?',
    es: { number: 69, title: '¿Dónde hallo el solaz?' },
    pt: { number: 73, title: 'Onde encontrar a paz?' },
  },
  {
    en: 'While of These Emblems We Partake',
    es: { number: 103, title: 'La Santa Cena' },
    pt: { number: 103, title: 'Enquanto Unidos em Amor' },
  },
  {
    en: 'Who\'s on the Lord\'s Side?',
    es: { number: 170, title: '¿Quién sigue al Señor?' },
    pt: { number: 150, title: 'Quem segue ao Senhor?' },
  },
  {
    en: 'With Wondering Awe',
    es: { number: 131, title: 'Asombro dio a los magos' },
    pt: { number: 131, title: 'No dia de Natal' },
  },
  {
    en: 'Ye Elders of Israel (Men)',
    es: { number: 209, title: 'Oh elders de Israel' },
    pt: { number: 203, title: 'Ó élderes de Israel' },
  },
  {
    en: 'Ye Who Are Called to Labor (Men)',
    es: { number: 207, title: 'Oh vos que sois llamados' },
    pt: { number: 204, title: 'Ó vós que sois chamados' },
  },
  {
    en: 'You Can Make the Pathway Bright',
    es: { number: 148, title: 'Si hay gozo en tu corazón' },
    pt: { number: 153, title: 'Deixa a luz do sol entrar' },
  },
  {
    en: 'Zion Stands with Hills Surrounded',
    es: { number: 22, title: 'En las cumbres de los montes' },
    pt: { number: 23, title: 'Lá nos cumes' },
  },
  // "With Humble Heart" (English 171) has no counterpart in the Spanish
  // or Portuguese hymnbooks, so it stays in English in every language.
  { en: 'With Humble Heart' },
];

// Titles are compared without accents, punctuation or case, so "'Tis Sweet to
// Sing the Matchless Love" still matches "Tis sweet to sing the matchless love".
function normalize(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BY_ENGLISH_TITLE = new Map(
  HYMN_TABLE.map((entry) => [normalize(entry.en), entry])
);

// Returns the hymn as it should be displayed in the given language.
//
// The match is made on the stored English TITLE, never on the stored number:
// the number a clerk typed belongs to whichever hymnbook they had in hand, so
// trusting it would mislabel hymns. Anything not in the table (or already
// entered in Spanish or Portuguese) is returned untouched.
export function localizeHymn(hymn: Hymn, locale: Locale): Hymn {
  if (locale === 'en') {
    return hymn;
  }

  const entry = BY_ENGLISH_TITLE.get(normalize(hymn.title));
  const translated = entry?.[locale];

  return translated ? { number: translated.number, title: translated.title } : hymn;
}
