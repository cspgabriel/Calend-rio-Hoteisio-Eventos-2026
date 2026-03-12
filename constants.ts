import { EventData } from './types';
import { parseDate } from './utils';

// Helper to safely parse coordinate string "POINT (lng lat)"
const parsePoint = (pointStr: string): { lat: number, lng: number } => {
  try {
    if (!pointStr) return { lat: -22.9068, lng: -43.1729 };
    const clean = pointStr.replace('POINT (', '').replace(')', '');
    const [lng, lat] = clean.split(' ');
    return { lat: parseFloat(lat), lng: parseFloat(lng) };
  } catch (e) {
    return { lat: -22.9068, lng: -43.1729 }; // Default Rio center
  }
};

// Helper to get Portuguese month name from date string to ensure consistency
const getMonthFromDate = (dateStr: string): string => {
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
      return month.charAt(0).toUpperCase() + month.slice(1);
    }
    return 'A definir';
  } catch (e) {
    return 'A definir';
  }
};

// Function to normalize neighborhood names to avoid duplicates
const normalizeNeighborhood = (hood: string): string => {
  if (!hood) return "A definir";
  const h = hood.trim();
  if (h === "Barra Olímpico" || h === "Barra Olimpica") return "Barra Olímpica";
  if (h === "Jardim Botanico") return "Jardim Botânico";
  if (h === "Maracanã." || h === "Maracanã ") return "Maracanã";
  if (h === "Glória ") return "Glória";
  if (h === "Copacabana ") return "Copacabana";
  if (h === "Sacadura" || h === "Saude") return "Saúde";
  return h;
};

// Function to normalize event types to a standardized list
const standardizeType = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes('feira') || t.includes('exposição') || t.includes('expo') || t.includes('fashion')) return 'Feira & Exposição';
  if (t.includes('congresso') || t.includes('conferência') || t.includes('summit') || t.includes('assembleia')) return 'Congresso & Conferência';
  if (t.includes('show') || t.includes('festival') || t.includes('festa') || t.includes('ouro')) return 'Show & Festival';
  if (t.includes('esporte') || t.includes('esportivo') || t.includes('competição')) return 'Esporte';
  if (t.includes('carnaval')) return 'Carnaval';
  if (t.includes('reveillon')) return 'Festa';
  if (t.includes('religioso') || t.includes('cristã')) return 'Religioso';
  if (t.includes('treinamento') || t.includes('workshop')) return 'Treinamento';
  return 'Outros';
};

// Function to normalize venue names
const normalizeVenue = (venue: string): string => {
  if (!venue) return "A definir";
  const v = venue.trim();
  if (v.toLowerCase() === "riocentro" || v.includes("RIOCENTRO")) return "Riocentro";
  if (v.toLowerCase().includes("parque olímpico") || v.toLowerCase().includes("parque olimpico")) return "Parque Olímpico";
  if (v.toLowerCase() === "cidade das artes") return "Cidade das Artes";
  if (v.toLowerCase() === "pier mauá" || v.toLowerCase() === "pier maua") return "Pier Mauá";
  if (v.toLowerCase().includes("sheraton grand")) return "Sheraton Grand Rio";
  if (v.toLowerCase().includes("expo mag") || v.toLowerCase().includes("expo rio")) return "Expo Mag";
  if (v.toLowerCase() === "qualistage") return "Qualistage";
  if (v.toLowerCase() === "vivo rio") return "Vivo Rio";
  if (v.toLowerCase().includes("teatro opus")) return "Teatro Opus Città";
  if (v.toLowerCase().includes("farmasi arena")) return "Farmasi Arena";
  if (v.toLowerCase().includes("circo voador")) return "Circo voador";
  if (v.toLowerCase().includes("sacadura 154")) return "Sacadura 154";
  if (v.toLowerCase().includes("bco space makers")) return "Bco Space Makers";
  if (v.toLowerCase().includes("teatro clara nunes")) return "Teatro Clara Nunes";
  if (v.toLowerCase().includes("maracanã") || v.toLowerCase().includes("estádio do maracanã")) return "Maracanã";
  if (v.toLowerCase().includes("engenhão") || v.toLowerCase().includes("nilton santos")) return "Estádio Nilton Santos";
  if (v.toLowerCase().includes("sapucaí") || v.toLowerCase().includes("sambódromo")) return "Sambódromo";
  if (v.toLowerCase().includes("copacabana palace")) return "Belmond Copacabana Palace";
  return v;
};

// Helper to map neighborhoods to regions
const getRegion = (neighborhood: string): string => {
  const n = neighborhood.toLowerCase();
  
  if (['copacabana', 'ipanema', 'leblon', 'leme', 'flamengo', 'botafogo', 'glória', 'catete', 'laranjeiras', 'cosme velho', 'urca', 'humaitá', 'jardim botânico', 'gávea', 'são conrado', 'lagoa', 'aterro do flamengo'].includes(n)) {
    return 'Zona Sul';
  }
  
  if (['barra da tijuca', 'barra olímpica', 'recreio', 'jacarepaguá', 'camorim', 'vargem grande', 'vargem pequena', 'itanhangá', 'joá'].includes(n)) {
    return 'Barra & Jacarepaguá';
  }
  
  if (['centro', 'cidade nova', 'gamboa', 'saúde', 'santo cristo', 'lapa', 'santa teresa', 'rio de janeiro'].includes(n)) {
    return 'Centro';
  }
  
  if (['maracanã', 'tijuca', 'vila isabel', 'méier', 'engenho de dentro', 'são cristóvão', 'madureira', 'penha', 'ramos', 'bonsucesso', 'ilha do governador', 'fundão'].includes(n)) {
    return 'Zona Norte';
  }

  if (['campo grande', 'bangu', 'realengo', 'santa cruz'].includes(n)) {
    return 'Zona Oeste';
  }
  
  if (n === 'internacional') return 'Internacional';
  if (n === 'nacional') return 'Nacional';

  return 'Outros';
};

const RAW_EVENTS_DATA = [
  // --- NOVAS INCLUSÕES ---
  { name: "Bravo Tenores In Concert", venue: "Cidade das Artes", type: "Show & Festival", start: "28/03/2026", end: "28/03/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3659 -22.9991)", year: "2026", addedAt: "12/03/2026" },
  { name: "Show Luan Santana", venue: "Parque Olímpico", type: "Show & Festival", start: "16/05/2026", end: "16/05/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3935 -22.9739)", year: "2026", addedAt: "06/03/2026" },
  { name: "Blockchain Rio", venue: "ExpoRio", type: "Congresso & Conferência", start: "12/08/2026", end: "13/08/2026", neighborhood: "Cidade Nova", point: "POINT (-43.2096 -22.9126)", year: "2026", addedAt: "06/03/2026" },
  { name: "The Lumineers", venue: "Vivo Rio", type: "Show & Festival", start: "22/04/2026", end: "22/04/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "04/03/2026" },
  { name: "Open Air Brasil", venue: "Jockey Club Brasileiro", type: "Show & Festival", start: "25/03/2026", end: "11/04/2026", neighborhood: "Jardim Botânico", point: "POINT (-43.2225 -22.9776)", year: "2026", addedAt: "02/03/2026" },
  { name: "Jorge Vercillo", venue: "Vivo Rio", type: "Show", start: "08/05/2026", end: "08/05/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "02/03/2026" },

  // --- ÚLTIMA INCLUSÃO ---
  { name: "Miss Cosmo Brasil", venue: "A definir", type: "Outros", start: "23/08/2026", end: "29/08/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "05/06/2025" },
  { name: "Super Bowl LX Experience", venue: "Pier Mauá - Armazém 3", type: "Show & Festival", start: "08/02/2026", end: "08/02/2026", neighborhood: "Saúde", point: "POINT (-43.1818 -22.8956)", year: "2026", addedAt: "01/06/2025" },

  // --- NOVAS INCLUSÕES FARMASI ARENA ---
  { name: "Diogo Nogueira – “Infinito Samba”", venue: "Farmasi Arena", type: "Show & Festival", start: "01/03/2026", end: "01/03/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "31/05/2025" },
  { name: "Baco Exu do Blues – “Hásos”", venue: "Farmasi Arena", type: "Show & Festival", start: "21/03/2026", end: "21/03/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "31/05/2025" },
  { name: "As Vozes", venue: "Farmasi Arena", type: "Show & Festival", start: "28/03/2026", end: "28/03/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "31/05/2025" },
  { name: "Djavan – “Djavanear”", venue: "Farmasi Arena", type: "Show & Festival", start: "01/08/2026", end: "02/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "31/05/2025" },
  { name: "Liniker – “Bye Bye Caju”", venue: "Farmasi Arena", type: "Show & Festival", start: "22/08/2026", end: "22/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "31/05/2025" },

  // --- NOVAS INCLUSÕES ANTERIORES ---
  { name: "Barão Vermelho Encontro – Pro Mundo Inteiro Acordar", venue: "Farmasi Arena", type: "Show & Festival", start: "30/04/2026", end: "30/04/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "30/05/2025" },
  { name: "Capital do Samba", venue: "Marina da Glória", type: "Show & Festival", start: "16/05/2026", end: "17/05/2026", neighborhood: "Glória", point: "POINT (-43.1701 -22.9199)", year: "2026", addedAt: "30/05/2025" },
  { name: "Globo de Ouro", venue: "Belmond Copacabana Palace", type: "Show & Festival", start: "18/03/2026", end: "18/03/2026", neighborhood: "Copacabana", point: "POINT (-43.179 -22.9673)", year: "2026", addedAt: "29/05/2025" },
  { name: "Brazil Open 2026", venue: "Campo Olímpico de Golfe", type: "Esporte", start: "13/04/2026", end: "19/04/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.4075 -23.0039)", year: "2026", addedAt: "28/05/2025" },
  { name: "RIO CARNAVAL FAN FEST", venue: "Praia de Copacabana", type: "Show & Festival", start: "20/01/2026", end: "21/02/2026", neighborhood: "Copacabana", point: "POINT (-43.179 -22.9673)", year: "2026", addedAt: "27/05/2025" },
  { name: "RIO BOSSA NOSSA 2026", venue: "Praia de Ipanema", type: "Show & Festival", start: "23/01/2026", end: "25/01/2026", neighborhood: "Ipanema", point: "POINT (-43.2003 -22.9861)", year: "2026", addedAt: "27/05/2025" },
  { name: "VERÃO NA CASA FIRJAN - Semana 1", venue: "Casa Firjan", type: "Outros", start: "10/01/2026", end: "11/01/2026", neighborhood: "Botafogo", point: "POINT (-43.1843 -22.9463)", year: "2026", addedAt: "27/05/2025" },
  { name: "VERÃO NA CASA FIRJAN - Semana 2", venue: "Casa Firjan", type: "Outros", start: "17/01/2026", end: "18/01/2026", neighborhood: "Botafogo", point: "POINT (-43.1843 -22.9463)", year: "2026", addedAt: "27/05/2025" },
  { name: "ENSAIOS TÉCNICOS SAPUCAÍ - Semana 1", venue: "Sambódromo", type: "Carnaval", start: "30/01/2026", end: "01/02/2026", neighborhood: "Centro", point: "POINT (-43.1969 -22.9115)", year: "2026", addedAt: "27/05/2025" },
  { name: "ENSAIOS TÉCNICOS SAPUCAÍ - Semana 2", venue: "Sambódromo", type: "Carnaval", start: "06/02/2026", end: "08/02/2026", neighborhood: "Centro", point: "POINT (-43.1969 -22.9115)", year: "2026", addedAt: "27/05/2025" },
  { name: "ENSAIOS DO BLOCO CORDÃO DO BOITATÁ - Sede", venue: "Sede do Cordão da Bola Preta", type: "Show & Festival", start: "05/01/2026", end: "12/01/2026", neighborhood: "Centro", point: "POINT (-43.1818 -22.9111)", year: "2026", addedAt: "27/05/2025" },
  { name: "ENSAIOS DO BLOCO CORDÃO DO BOITATÁ - Circo", venue: "Circo Voador", type: "Show & Festival", start: "19/01/2026", end: "02/02/2026", neighborhood: "Lapa", point: "POINT (-43.1812 -22.9126)", year: "2026", addedAt: "27/05/2025" },
  { name: "UNIVERSO SPANTA 2026 (Período Estendido)", venue: "Marina da Glória", type: "Show & Festival", start: "12/01/2026", end: "26/01/2026", neighborhood: "Botafogo", point: "POINT (-43.1701 -22.9199)", year: "2026", addedAt: "27/05/2025" },
  { name: "Turismo do Amanhã", venue: "Museu do Amanhã", type: "Feira & Exposição", start: "12/03/2026", end: "14/03/2026", neighborhood: "Centro", point: "POINT (-43.1795 -22.8945)", year: "2026", addedAt: "26/05/2025" },
  { name: "RIOFW – Rio Fashion Week", venue: "Pier Mauá", type: "Feira & Exposição", start: "15/04/2026", end: "18/04/2026", neighborhood: "Centro", point: "POINT (-43.1818 -22.8956)", year: "2026", addedAt: "25/05/2025" },
  { name: "Carnaval do Rio de Janeiro 2026", venue: "Cidade do Rio", type: "Carnaval", start: "13/02/2026", end: "18/02/2026", neighborhood: "Centro", point: "", year: "2026", addedAt: "25/05/2025" },
  { name: "Desfiles do Grupo Especial (Sapucaí)", venue: "Sambódromo", type: "Carnaval", start: "15/02/2026", end: "16/02/2026", neighborhood: "Centro", point: "POINT (-43.1969 -22.9115)", year: "2026", addedAt: "25/05/2025" },
  { name: "Desfile das Campeãs", venue: "Sambódromo", type: "Carnaval", start: "21/02/2026", end: "21/02/2026", neighborhood: "Centro", point: "POINT (-43.1969 -22.9115)", year: "2026", addedAt: "25/05/2025" },
  { name: "Todo Mundo no Rio", venue: "Praia de Copacabana", type: "Show & Festival", start: "02/05/2026", end: "02/05/2026", neighborhood: "Copacabana", point: "POINT (-43.179 -22.9673)", year: "2026", addedAt: "25/05/2025" },
  { name: "SER Trade Show", venue: "Riocentro", type: "Feira & Exposição", start: "17/03/2026", end: "17/03/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "25/05/2025" },
  { name: "NFL no Rio de Janeiro", venue: "Estádio do Maracanã", type: "Esporte", start: "26/09/2026", end: "26/09/2026", neighborhood: "Maracanã", point: "POINT (-43.2302 -22.9122)", year: "2026", addedAt: "25/05/2025" },
  { name: "Réveillon do Rio de Janeiro", venue: "Copacabana / Toda Cidade", type: "Show & Festival", start: "31/12/2026", end: "01/01/2027", neighborhood: "Copacabana", point: "POINT (-43.179 -22.9673)", year: "2026", addedAt: "25/05/2025" },
  { name: "Imersão LS", venue: "Riocentro", type: "Treinamento", start: "23/01/2026", end: "25/01/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "26/05/2025" },
  { name: "CIMI 360", venue: "Riocentro", type: "Congresso", start: "27/08/2026", end: "28/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "26/05/2025" },
  { name: "Andy Bell (Erasure)", venue: "Qualistage", type: "Show", start: "19/01/2026", end: "19/01/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3592 -23.0016)", year: "2026", addedAt: "24/05/2025" },
  { name: "Hermanos Gutiérrez", venue: "Circo Voador", type: "Show", start: "05/02/2026", end: "05/02/2026", neighborhood: "Lapa", point: "POINT (-43.1812 -22.9126)", year: "2026", addedAt: "24/05/2025" },
  { name: "Christian Chávez - Para sempre tour", venue: "Teatro Opus Città", type: "Show", start: "07/02/2026", end: "07/02/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3592 -23.0016)", year: "2026", addedAt: "24/05/2025" },
  { name: "Manu Chao", venue: "Bco Space Makers", type: "Show", start: "11/02/2026", end: "11/02/2026", neighborhood: "Santo Cristo", point: "POINT (-43.2016 -22.8992)", year: "2026", addedAt: "24/05/2025" },
  { name: "Living Colour", venue: "Sacadura 154", type: "Show", start: "28/02/2026", end: "28/02/2026", neighborhood: "Saúde", point: "POINT (-43.1872 -22.8981)", year: "2026", addedAt: "24/05/2025" },
  { name: "Macy Gray - 25th Anniversary Tour", venue: "Vivo Rio", type: "Show", start: "05/03/2026", end: "05/03/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Bryan Adams - Roll with the punches", venue: "Qualistage", type: "Show", start: "06/03/2026", end: "06/03/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3592 -23.0016)", year: "2026", addedAt: "24/05/2025" },
  { name: "Zaz", venue: "Vivo Rio", type: "Show", start: "07/03/2026", end: "07/03/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Lewis Capaldi & Ruel", venue: "Qualistage", type: "Show", start: "18/03/2026", end: "18/03/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3592 -23.0016)", year: "2026", addedAt: "24/05/2025" },
  { name: "Steve Hackett & Genetics", venue: "Vivo Rio", type: "Show", start: "21/03/2026", end: "21/03/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Cypress Hill", venue: "Vivo Rio", type: "Show", start: "22/03/2026", end: "22/03/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Symphony X", venue: "Sacadura 154", type: "Show", start: "22/03/2026", end: "22/03/2026", neighborhood: "Saúde", point: "POINT (-43.1872 -22.8981)", year: "2026", addedAt: "24/05/2025" },
  { name: "Mac DeMarco", venue: "Sacadura 154", type: "Show", start: "03/04/2026", end: "03/04/2026", neighborhood: "Saúde", point: "POINT (-43.1872 -22.8981)", year: "2026", addedAt: "24/05/2025" },
  { name: "Lynyrd Skynyrd & Dirty Honey", venue: "Qualistage", type: "Show", start: "05/04/2026", end: "05/04/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3592 -23.0016)", year: "2026", addedAt: "24/05/2025" },
  { name: "Roxette", venue: "Vivo Rio", type: "Show", start: "12/04/2026", end: "12/04/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Jackson Wang", venue: "Farmasi Arena", type: "Show", start: "25/04/2026", end: "25/04/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "24/05/2025" },
  { name: "Dream Theater - Parasomnia", venue: "Vivo Rio", type: "Show", start: "10/05/2026", end: "10/05/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Men at Work", venue: "Qualistage", type: "Show", start: "16/05/2026", end: "16/05/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3592 -23.0016)", year: "2026", addedAt: "24/05/2025" },
  { name: "António Zambujo", venue: "Circo Voador", type: "Show", start: "16/05/2026", end: "16/05/2026", neighborhood: "Lapa", point: "POINT (-43.1812 -22.9126)", year: "2026", addedAt: "24/05/2025" },
  { name: "Robert Plant & Suzi Dian", venue: "Vivo Rio", type: "Show", start: "21/05/2026", end: "21/05/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Lykke Li e Wolf Alice", venue: "Vivo Rio", type: "Show", start: "22/05/2026", end: "22/05/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "24/05/2025" },
  { name: "Mark Farner", venue: "Teatro Clara Nunes", type: "Show", start: "27/05/2026", end: "27/05/2026", neighborhood: "Gávea", point: "POINT (-43.2281 -22.9751)", year: "2026", addedAt: "24/05/2025" },
  { name: "Rosalía – “Lux Tour 2026” (Dia 1)", venue: "Farmasi Arena", type: "Show", start: "10/08/2026", end: "10/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "24/05/2025" },
  { name: "Rosalía – “Lux Tour 2026” (Dia 2)", venue: "Farmasi Arena", type: "Show", start: "11/08/2026", end: "11/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "24/05/2025" },
  { name: "Web Summit Rio 2026", venue: "Riocentro", type: "Congresso & Conferência", start: "08/06/2026", end: "11/06/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "25/05/2025" },
  { name: "Rio Open 2026", venue: "Jockey Club", type: "Esporte", start: "14/02/2026", end: "22/02/2026", neighborhood: "Jardim Botânico", point: "POINT (-43.2225 -22.9776)", year: "2026", addedAt: "25/05/2025" },
  { name: "Rock in Rio", venue: "Parque Olímpico", type: "Show & Festival", start: "04/09/2026", end: "13/09/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3935 -22.9739)", year: "2026", addedAt: "15/03/2025" },
  { name: "Energy Summit 2026", venue: "Cidade das Artes", type: "Congresso & Conferência", start: "23/06/2026", end: "25/06/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3659 -22.9991)", year: "2026", addedAt: "15/03/2025" },
  { name: "Rio2C 2026", venue: "Cidade das Artes", type: "Congresso & Conferência", start: "26/05/2026", end: "31/05/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3659 -22.9991)", year: "2026", addedAt: "15/03/2025" },
  { name: "Maratona do Rio 2026", venue: "Aterro do Flamengo", type: "Esporte", start: "03/06/2026", end: "07/06/2026", neighborhood: "Flamengo", point: "POINT (-43.1701 -22.9199)", year: "2026", addedAt: "15/03/2025" },
  { name: "Rio Innovation Week 2026", venue: "Pier Mauá", type: "Congresso & Conferência", start: "04/08/2026", end: "07/08/2026", neighborhood: "Centro", point: "POINT (-43.1818 -22.8956)", year: "2026", addedAt: "15/03/2025" },
  { name: "ROG.e 2026", venue: "Riocentro", type: "Feira & Exposição", start: "21/09/2026", end: "24/09/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "CIBEN 2026", venue: "Riocentro", type: "Congresso & Conferência", start: "07/07/2026", end: "07/07/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "15/03/2025" },
  { name: "Jason Mraz - Return to South America", venue: "Vivo Rio", type: "Show", start: "06/03/2026", end: "06/03/2026", neighborhood: "Centro", point: "POINT (-43.1725 -22.9142)", year: "2026", addedAt: "18/05/2025" },
  { name: "The Weeknd - After hours til dawn", venue: "Estádio Nilton Santos", type: "Show", start: "26/04/2026", end: "26/04/2026", neighborhood: "Engenho de Dentro", point: "POINT (-43.2924 -22.8932)", year: "2026", addedAt: "18/05/2025" },
  { name: "SBC Summit Rio 2026", venue: "Riocentro", type: "Congresso", start: "03/03/2026", end: "05/03/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "20/11/2024" },
  { name: "International AIDS Conference", venue: "Riocentro", type: "Congresso Médico", start: "26/07/2026", end: "31/07/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "15/12/2024" },
  { name: "Estética in Rio", venue: "Riocentro", type: "Congresso/Feira", start: "16/05/2026", end: "18/05/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "05/12/2024" },
  { name: "APOGEU HOUSE MUSIC", venue: "Riocentro", type: "Show/Festa", start: "30/12/2025", end: "30/12/2025", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2025", addedAt: "10/10/2024" },
  { name: "Ensaios da Anitta", venue: "A definir", type: "Show/Festival", start: "20/01/2026", end: "25/01/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "15/11/2024" },
  { name: "Mega Gestante (Fev)", venue: "Riocentro", type: "Feira", start: "04/02/2026", end: "08/02/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/11/2024" },
  { name: "Carnaval We Make", venue: "A definir", type: "Festa/Carnaval", start: "13/02/2026", end: "13/02/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "15/11/2024" },
  { name: "ICLR 2026", venue: "A definir", type: "Congresso Científico", start: "23/04/2026", end: "28/04/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "20/11/2024" },
  { name: "Herdeira", venue: "A definir", type: "Evento", start: "16/05/2026", end: "16/05/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "01/12/2024" },
  { name: "Método CIS", venue: "A definir", type: "Treinamento", start: "05/08/2026", end: "08/08/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "20/12/2024" },
  { name: "CBKC 2026", venue: "A definir", type: "Evento", start: "21/08/2026", end: "23/08/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "10/01/2025" },
  { name: "Congresso Brasileiro de Cardiologia", venue: "A definir", type: "Congresso Médico", start: "08/10/2026", end: "10/10/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "15/01/2025" },
  { name: "CVDL 2026", venue: "A definir", type: "Evento", start: "15/10/2026", end: "16/10/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "20/01/2025" },
  { name: "Congresso Brasileiro de Hematologia", venue: "A definir", type: "Congresso Médico", start: "28/10/2026", end: "31/10/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "25/01/2025" },
  { name: "ABF Franchising Expo", venue: "Expo Mag", type: "Feira", start: "05/11/2026", end: "07/11/2026", neighborhood: "Centro", point: "POINT (-43.2096 -22.9126)", year: "2026", addedAt: "01/02/2025" },
  { name: "Copa do Mundo de Futebol Feminino", venue: "Maracanã", type: "Esporte", start: "24/06/2027", end: "25/07/2027", neighborhood: "Maracanã", point: "POINT (-43.2302 -22.9121)", year: "2027", addedAt: "15/02/2025" },
  { name: "Experiência Rio", venue: "Rio de Janeiro", type: "Evento", start: "30/03/2026", end: "30/03/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "15/03/2025" },
  { name: "3ª Cúpula da ONU Turismo", venue: "A definir", type: "Congresso", start: "01/01/2026", end: "31/12/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "15/03/2025" },
  { name: "Expo Cristã", venue: "Riocentro", type: "Feira Religiosa", start: "01/11/2026", end: "08/11/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "15/03/2025" },
  { name: "Festival Moto Brasil", venue: "Riocentro", type: "Festival Motociclismo", start: "16/10/2026", end: "18/10/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "XXXII Congresso Brasileiro de Neurologia", venue: "Windsor Barra", type: "Congresso", start: "07/10/2026", end: "10/10/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3222 -23.0106)", year: "2026", addedAt: "15/03/2025" },
  { name: "FEICON Rio", venue: "Riocentro", type: "Feira Construção Civil", start: "07/10/2026", end: "08/10/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "FEBRAVA Rio", venue: "Riocentro", type: "Feira", start: "06/10/2026", end: "08/10/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "20th World Congress on Menopause", venue: "A definir", type: "Congresso", start: "30/09/2026", end: "03/10/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3659 -22.9991)", year: "2026", addedAt: "15/03/2025" },
  { name: "VIII World Tribology Congress", venue: "Windsor Barra", type: "Congresso", start: "20/09/2026", end: "25/09/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3222 -23.0106)", year: "2026", addedAt: "15/03/2025" },
  { name: "Copa do Mundo - Brasil e Chile", venue: "Maracanã", type: "Competição", start: "04/09/2026", end: "04/09/2026", neighborhood: "Maracanã", point: "POINT (-43.2287 -22.9151)", year: "2026", addedAt: "15/03/2025" },
  { name: "Hyvolution Brazil", venue: "Riocentro", type: "Congresso", start: "26/08/2026", end: "27/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "15/03/2025" },
  { name: "Hydrogen Forum", venue: "Riocentro", type: "Congresso", start: "26/08/2026", end: "27/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "Exposição Américas e Caribe", venue: "Riocentro", type: "Exposição", start: "21/08/2026", end: "23/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "Jotaja Summit", venue: "Riocentro", type: "Festival", start: "18/08/2026", end: "19/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "Wedding Plus Congress", venue: "Fairmont Rio Copacabana", type: "Congresso", start: "10/08/2026", end: "12/08/2026", neighborhood: "Copacabana", point: "POINT (-43.1888 -22.986)", year: "2026", addedAt: "15/03/2025" },
  { name: "Rio Movéis", venue: "Riocentro", type: "Feira", start: "06/08/2026", end: "08/08/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "18th Heat Transfer Conf", venue: "Windsor Oceânico", type: "Conferência", start: "02/08/2026", end: "07/08/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3222 -23.0106)", year: "2026", addedAt: "15/03/2025" },
  { name: "48th Annual CogSci", venue: "Sheraton Grand Rio", type: "Conferência", start: "22/07/2026", end: "25/07/2026", neighborhood: "Leblon", point: "POINT (-43.2335 -22.9924)", year: "2026", addedAt: "15/03/2025" },
  { name: "ICSM 2026", venue: "Windsor Barra", type: "Conferência", start: "19/07/2026", end: "24/07/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3225 -23.0119)", year: "2026", addedAt: "15/03/2025" },
  { name: "Alma Festival", venue: "Riocentro", type: "Festival Música", start: "18/07/2026", end: "18/07/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "Congresso Brasileiro Análises Clínicas", venue: "Riocentro", type: "Congresso", start: "28/06/2026", end: "01/07/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "Showbrinq-RJ", venue: "Expo Mag", type: "Exposição", start: "11/06/2026", end: "11/06/2026", neighborhood: "Cidade Nova", point: "POINT (-43.2079 -22.912)", year: "2026", addedAt: "15/03/2025" },
  { name: "Corrida Time Brasil", venue: "Parque Olímpico", type: "Competição", start: "08/06/2026", end: "08/06/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.4349 -23.0043)", year: "2026", addedAt: "15/03/2025" },
  { name: "Rio Sport Show", venue: "Expo Mag", type: "Feira", start: "04/06/2026", end: "04/06/2026", neighborhood: "Cidade Nova", point: "POINT (-43.2096 -22.9126)", year: "2026", addedAt: "15/03/2025" },
  { name: "FPSO EXPO BRASIL", venue: "Expo Mag", type: "Exposição", start: "19/05/2026", end: "19/05/2026", neighborhood: "Cidade Nova", point: "POINT (-43.2096 -22.9126)", year: "2026", addedAt: "15/03/2025" },
  { name: "Nutri in Rio", venue: "Riocentro", type: "Congresso", start: "16/05/2026", end: "18/05/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "AB2L - Inovação Jurídica", venue: "Pier Mauá", type: "Congresso", start: "13/05/2026", end: "14/05/2026", neighborhood: "Centro", point: "POINT (-43.1818 -22.8956)", year: "2026", addedAt: "15/03/2025" },
  { name: "43° Cong Cardiologia SOCERJ", venue: "Expo Mag", type: "Congresso", start: "07/05/2026", end: "07/05/2026", neighborhood: "Cidade Nova", point: "POINT (-43.2096 -22.9126)", year: "2026", addedAt: "15/03/2025" },
  { name: "Int Conf Software Engineering", venue: "Windsor Oceânico", type: "Conferência", start: "12/04/2026", end: "19/04/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.3222 -23.0106)", year: "2026", addedAt: "15/03/2025" },
  { name: "SailGP", venue: "Marina da Glória", type: "Esportivo", start: "11/04/2026", end: "12/04/2026", neighborhood: "Glória", point: "POINT (-43.1701 -22.9199)", year: "2026", addedAt: "15/03/2025" },
  { name: "Imagineland 2026", venue: "Riocentro", type: "Festival", start: "10/04/2026", end: "12/04/2026", neighborhood: "Barra da Tijuca", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "15/03/2025" },
  { name: "SAHIC Latin America", venue: "A definir", type: "Congresso", start: "22/03/2026", end: "24/03/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "15/03/2025" },
  { name: "22nd Cong Ocular Oncology", venue: "Sheraton Grand Rio", type: "Congresso", start: "17/03/2026", end: "21/03/2026", neighborhood: "Leblon", point: "POINT (-43.2335 -22.9924)", year: "2026", addedAt: "15/03/2025" },
  { name: "SRE TRADE SHOW", venue: "Riocentro", type: "Feira", start: "17/03/2026", end: "19/03/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.4028 -22.9731)", year: "2026", addedAt: "15/03/2025" },
  { name: "Alceu Valença – “80 girassóis”", venue: "Farmasi Arena", type: "Show", start: "14/03/2026", end: "14/03/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3922 -22.973)", year: "2026", addedAt: "15/03/2025" },
  { name: "Routes Americas", venue: "Expo Mag", type: "Congresso", start: "03/03/2026", end: "05/03/2026", neighborhood: "Cidade Nova", point: "POINT (-43.2079 -22.912)", year: "2026", addedAt: "15/03/2025" },
  { name: "Posh | Golden Carnival", venue: "Copacabana Palace", type: "Social", start: "20/02/2026", end: "20/02/2026", neighborhood: "Copacabana", point: "POINT (-43.179 -22.9673)", year: "2026", addedAt: "15/03/2025" },
  { name: "Camarote Bateria Nota 10", venue: "Sambódromo", type: "Festa", start: "13/02/2026", end: "21/02/2026", neighborhood: "Centro", point: "POINT (-43.1969 -22.9115)", year: "2026", addedAt: "15/03/2025" },
  { name: "Society For Cardiovasc Magnetic Resonance", venue: "A definir", type: "Congresso", start: "04/02/2026", end: "07/02/2026", neighborhood: "A definir", point: "", year: "2026", addedAt: "15/03/2025" },
  { name: "We Make Better Days", venue: "Riocentro", type: "Festa", start: "01/02/2026", end: "28/02/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.4163 -22.9786)", year: "2026", addedAt: "15/03/2025" },
  { name: "Sorriso Eu Gosto No Pagode", venue: "Riocentro", type: "Show", start: "31/01/2026", end: "31/01/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "Universo Spanta 2026", venue: "Marina da Glória", type: "Festival", start: "12/01/2026", end: "25/01/2026", neighborhood: "Botafogo", point: "POINT (-43.1701 -22.9199)", year: "2026", addedAt: "15/03/2025" },
  { name: "Prainha Com Ferrugem", venue: "Riocentro", type: "Show", start: "11/01/2026", end: "11/01/2026", neighborhood: "Barra Olímpica", point: "POINT (-43.3966 -22.9666)", year: "2026", addedAt: "15/03/2025" },
  { name: "Beleza Rara Beach Sunset", venue: "Sheraton Grand Rio", type: "Show", start: "03/01/2026", end: "03/01/2026", neighborhood: "Leme", point: "POINT (-43.2335 -22.9924)", year: "2026", addedAt: "15/03/2025" }
];

export const EVENTS: EventData[] = RAW_EVENTS_DATA.map((event, index) => {
  const parsedStartDate = parseDate(event.start);
  const parsedEndDate = parseDate(event.end);
  const point = parsePoint(event.point);
  const month = getMonthFromDate(event.start);
  const normalizedNeighborhood = normalizeNeighborhood(event.neighborhood);
  const normalizedVenue = normalizeVenue(event.venue);
  const region = getRegion(normalizedNeighborhood);

  return {
    id: `evt-${index}-${event.year}`,
    name: event.name,
    venue: normalizedVenue,
    type: standardizeType(event.type),
    startDate: event.start,
    endDate: event.end,
    month: month,
    neighborhood: normalizedNeighborhood,
    region: region,
    year: event.year,
    lat: point.lat,
    lng: point.lng,
    parsedStartDate,
    parsedEndDate,
    inclusionDate: (event as any).addedAt || "01/01/2024"
  };
});

// Base atualizada conforme as imagens fornecidas (Março a Maio 2026 + Preservados)
const RAW_TOURISM_FAIRS_DATA = [
  // --- JANEIRO ---
  { name: "FITUR Madrid", venue: "IFEMA", start: "21/01/2026", end: "26/01/2026", country: "Espanha", city: "Madri", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "TRANSFORMATUR", venue: "Online", start: "28/01/2026", end: "30/01/2026", country: "Brasil", city: "Online", state: "Digital", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "VAKANTIEBEURS", venue: "Jaarbeurs Utrecht", start: "08/01/2026", end: "11/01/2026", country: "Holanda", city: "Utrecht", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "ULTRA BY PRIVATE LUXURY EVENTS", venue: "A definir", start: "25/01/2026", end: "29/01/2026", country: "Emirados Árabes Unidos", city: "Dubai", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "DESTINATION SHOW", venue: "A definir", start: "29/01/2026", end: "01/02/2026", country: "Reino Unido", city: "Londres", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- FEVEREIRO ---
  { name: "LACTE 21", venue: "WTC Events Center", start: "23/02/2026", end: "24/02/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "ANATO Bogotá", venue: "Corferias", start: "25/02/2026", end: "27/02/2026", country: "Colômbia", city: "Bogotá", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "BTL Lisboa (Bolsa de Turismo)", venue: "FIL", start: "25/02/2026", end: "01/03/2026", country: "Portugal", city: "Lisboa", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "FLORIDA HUDDLE", venue: "A definir", start: "02/02/2026", end: "04/02/2026", country: "Estados Unidos", city: "Orlando", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "BIT MILÃO", venue: "Fiera Milano", start: "08/02/2026", end: "10/02/2026", country: "Itália", city: "Milão", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "AIME EXPO", venue: "Melbourne Convention Centre", start: "09/02/2026", end: "11/02/2026", country: "Austrália", city: "Melbourne", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "1º ENCONTRO EDUCACIONAL BENCHMICE", venue: "A definir", start: "11/02/2026", end: "11/02/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },

  // --- MARÇO (ATUALIZADO CONFORME IMAGEM) ---
  { name: "Caminho Agro Rio", venue: "Riocentro", start: "26/03/2026", end: "29/03/2026", country: "Brasil", city: "Rio de Janeiro", state: "RJ", region: "Nacional", year: "2026", addedAt: "02/03/2026" },
  { name: "SERANDIPIANS - ESSENCE OF PHUKET", venue: "A definir", start: "02/03/2026", end: "06/03/2026", country: "Tailândia", city: "Phuket", region: "Internacional", year: "2026", addedAt: "04/06/2025" },
  { name: "FÓRUM PANROTAS", venue: "WTC Events Center", start: "03/03/2026", end: "04/03/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "ITB Berlin", venue: "Messe Berlin", start: "03/03/2026", end: "05/03/2026", country: "Alemanha", city: "Berlim", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "CONVENÇÃO CVC", venue: "A definir", start: "05/03/2026", end: "09/03/2026", country: "Brasil", city: "João Pessoa", state: "PB", region: "Nacional", year: "2026", addedAt: "04/06/2025" },
  { name: "LUXPERTS SUMMIT", venue: "A definir", start: "09/03/2026", end: "12/03/2026", country: "Brasil", city: "Ouro Preto", state: "MG", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "ABAV TRAVEL SP", venue: "A definir", start: "11/03/2026", end: "12/03/2026", country: "Brasil", city: "Campinas", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "TURISMALL 2026", venue: "A definir", start: "12/03/2026", end: "14/03/2026", country: "Brasil", city: "Rio de Janeiro", state: "RJ", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "FETUR PIAUI", venue: "A definir", start: "19/03/2026", end: "20/03/2026", country: "Brasil", city: "Teresina", state: "PI", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "EXPOTEL", venue: "A definir", start: "25/03/2026", end: "26/03/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "VISIT BRASIL SUMMIT", venue: "A definir", start: "30/03/2026", end: "31/03/2026", country: "Brasil", city: "Brasília", state: "DF", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "PESCA TRADE SHOW 2026", venue: "A definir", start: "12/03/2026", end: "14/03/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "CRUISE360 BRASIL 2026", venue: "A definir", start: "14/03/2026", end: "15/03/2026", country: "Brasil", city: "Santos", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "SAP CONCUR FUSION", venue: "A definir", start: "17/03/2026", end: "19/03/2026", country: "Estados Unidos", city: "New Orleans", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "SALON DU VOYAGE", venue: "A definir", start: "20/03/2026", end: "21/03/2026", country: "Mônaco", city: "Mônaco", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- ABRIL ---
  { name: "CBGTUR CONGRESSO DE GUIAS", venue: "A definir", start: "09/04/2026", end: "13/04/2026", country: "Brasil", city: "Fortaleza", state: "CE", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "IMM TRAVEL MEDIA", venue: "A definir", start: "13/04/2026", end: "13/04/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "WTM Latin America", venue: "Expo Center Norte", start: "14/04/2026", end: "16/04/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "ESTOUR ESPÍRITO SANTO", venue: "A definir", start: "25/04/2026", end: "28/04/2026", country: "Brasil", city: "Vitória", state: "ES", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "EMOTIONS TRAVEL SHOW", venue: "A definir", start: "20/04/2026", end: "23/04/2026", country: "Argentina", city: "Buenos Aires", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "MINAS TRAVEL MARKET - MTM", venue: "A definir", start: "23/04/2026", end: "24/04/2026", country: "Brasil", city: "Belo Horizonte", state: "MG", region: "Nacional", year: "2026", addedAt: "15/03/2025" },

  // --- MAIO (ATUALIZADO CONFORME IMAGEM) ---
  { name: "ILTM Latin America", venue: "Pavilhão da Bienal", start: "04/05/2026", end: "07/05/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "EXPO TURISMO PARANÁ", venue: "A definir", start: "07/05/2026", end: "08/05/2026", country: "Brasil", city: "Curitiba", state: "PR", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "AUSTRALIAN TOURISM EXCHANGE", venue: "A definir", start: "10/05/2026", end: "14/05/2026", country: "Austrália", city: "Adelaide", region: "Internacional", year: "2026", addedAt: "04/06/2025" },
  { name: "FÓRUM DE TURISMO 60+", venue: "A definir", start: "11/05/2026", end: "12/05/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "SINDEPAT SUMMIT", venue: "A definir", start: "12/05/2026", end: "14/05/2026", country: "Brasil", city: "Rio de Janeiro", state: "RJ", region: "Nacional", year: "2026", addedAt: "04/06/2025" },
  { name: "2º ENCONTRO EDUCACIONAL BENCHMICE", venue: "A definir", start: "13/05/2026", end: "13/05/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "04/06/2025" },
  { name: "AVISTAR", venue: "A definir", start: "15/05/2026", end: "17/05/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "IPW", venue: "A definir", start: "17/05/2026", end: "21/05/2026", country: "Estados Unidos", city: "Fort Lauderdale", region: "Internacional", year: "2026", addedAt: "04/06/2025" },
  { name: "SERANDIPIANS - ESSENCE OF PANAMA", venue: "A definir", start: "18/05/2026", end: "22/05/2026", country: "Panamá", city: "Cidade do Panamá", region: "Internacional", year: "2026", addedAt: "04/06/2025" },
  { name: "MARCHA DOS SECRETÁRIOS", venue: "A definir", start: "18/05/2026", end: "21/05/2026", country: "Brasil", city: "Brasília", state: "DF", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "IMEX Frankfurt", venue: "Messe Frankfurt", start: "19/05/2026", end: "21/05/2026", country: "Alemanha", city: "Frankfurt", region: "Internacional", year: "2026", addedAt: "15/03/2025" },
  { name: "INSPIRA ECOTURISMO", venue: "A definir", start: "20/05/2026", end: "23/05/2026", country: "Brasil", city: "Bonito", state: "MS", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "BNT MERCOSUL", venue: "A definir", start: "21/05/2026", end: "23/05/2026", country: "Brasil", city: "Balneário Camboriú", state: "SC", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "ENCONTRO RBOT", venue: "A definir", start: "26/05/2026", end: "30/05/2026", country: "Brasil", city: "Macapá", state: "AP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "ARABIAN TRAVEL MARKET", venue: "A definir", start: "04/05/2026", end: "07/05/2026", country: "Emirados Árabes", city: "Dubai", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- JUNHO ---
  { name: "FIT PANTANAL", venue: "A definir", start: "04/06/2026", end: "07/06/2026", country: "Brasil", city: "Cuiabá", state: "MT", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "FESTIVAL DAS CATARATAS", venue: "A definir", start: "10/06/2026", end: "12/06/2026", country: "Brasil", city: "Foz do Iguaçu", state: "PR", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "EXPO TURISMO GOIÁS", venue: "A definir", start: "17/06/2026", end: "18/06/2026", country: "Brasil", city: "Goiânia", state: "GO", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "Fiexpo Latin America", venue: "Panama Convention Center", start: "08/06/2026", end: "11/06/2026", country: "Panamá", city: "Cidade do Panamá", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- JULHO ---
  { name: "LGBT+ TURISMO EXPO", venue: "A definir", start: "21/07/2026", end: "21/07/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "ILTM ASIA PACIFIC", venue: "Marina Bay Sands", start: "29/06/2026", end: "02/07/2026", country: "Cingapura", city: "Cingapura", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- AGOSTO ---
  { name: "ENCHATO & EXPROTEL", venue: "A definir", start: "11/08/2026", end: "13/08/2026", country: "Brasil", city: "Florianópolis", state: "SC", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "TRAVELNEXT MINAS", venue: "A definir", start: "12/08/2026", end: "13/08/2026", country: "Brasil", city: "Belo Horizonte", state: "MG", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "AVIRRP", venue: "Centro de Eventos Taiwan", start: "21/08/2026", end: "22/08/2026", country: "Brasil", city: "Ribeirão Preto", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "TRAVEL TECH HUB DAY", venue: "A definir", start: "24/08/2026", end: "24/08/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "GBTA CONVENTION", venue: "A definir", start: "03/08/2026", end: "05/08/2026", country: "Estados Unidos", city: "Chicago", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- SETEMBRO ---
  { name: "EQUIPOTEL / CONOTEL", venue: "A definir", start: "15/09/2026", end: "18/09/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "Abav Expo", venue: "A definir", start: "30/09/2026", end: "02/10/2026", country: "Brasil", city: "São Paulo", state: "SP", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "ITB INDIA", venue: "A definir", start: "02/09/2026", end: "04/09/2026", country: "Índia", city: "Mumbai", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- OUTUBRO ---
  { name: "BTM Brazil Travel Market", venue: "Centro de Eventos do Ceará", start: "22/10/2026", end: "23/10/2026", country: "Brasil", city: "Fortaleza", state: "CE", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "IMEX America", venue: "Mandalay Bay", start: "06/10/2026", end: "08/10/2026", country: "Estados Unidos", city: "Las Vegas", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- NOVEMBRO ---
  { name: "Festuris Gramado", venue: "Serra Park", start: "12/11/2026", end: "15/11/2026", country: "Brasil", city: "Gramado", state: "RS", region: "Nacional", year: "2026", addedAt: "15/03/2025" },
  { name: "ABETA SUMMIT", venue: "A definir", start: "25/11/2026", end: "28/11/2026", country: "Brasil", city: "Campo Grande", state: "MS", region: "Nacional", year: "2026", addedAt: "03/06/2025" },
  { name: "WTM London", venue: "ExCeL London", start: "03/11/2026", end: "05/11/2026", country: "Reino Unido", city: "Londres", region: "Internacional", year: "2026", addedAt: "15/03/2025" },

  // --- DEZEMBRO ---
  { name: "ILTM Cannes", venue: "Palais des Festivals", start: "07/12/2026", end: "10/12/2026", country: "França", city: "Cannes", region: "Internacional", year: "2026", addedAt: "15/03/2025" }
];

export const TOURISM_FAIRS: EventData[] = RAW_TOURISM_FAIRS_DATA.map((event, index) => {
  const parsedStartDate = parseDate(event.start);
  const parsedEndDate = parseDate(event.end);
  const point = (event as any).point ? parsePoint((event as any).point) : { lat: 0, lng: 0 };
  const month = getMonthFromDate(event.start);
  const normalizedNeighborhood = normalizeNeighborhood((event as any).neighborhood || "A definir");
  const normalizedVenue = normalizeVenue(event.venue);
  const region = getRegion(normalizedNeighborhood);

  return {
    id: `tf-${index}-${event.year}`,
    name: event.name,
    venue: normalizedVenue,
    type: "Feira de Turismo",
    startDate: event.start,
    endDate: event.end,
    month: month,
    neighborhood: normalizedNeighborhood,
    region: event.region || region,
    year: event.year,
    lat: point.lat,
    lng: point.lng,
    parsedStartDate,
    parsedEndDate,
    inclusionDate: (event as any).addedAt || "01/01/2024",
    city: event.city || "A definir",
    state: (event as any).state || "A definir",
    country: event.country || "A definir"
  };
});