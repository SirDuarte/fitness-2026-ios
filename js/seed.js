import { DB } from "./db.js";

export const MUSCLE_GROUPS = [
  "Peito",
  "Bíceps",
  "Tríceps",
  "Ombro",
  "Costas",
  "Perna completa",
  "Abdominal",
  "Cardio"
];

function ex(name, group, kind, primary, emphasis, secondary, builtIn = true) {
  return { name, group, kind, primary, emphasis, secondary, builtIn };
}

export async function ensureSeed() {
  const done = await DB.metaGet("seed_v1");
  if (done === "1") return;

  const exercises = [
    // PEITO
    ex("Supino reto", "Peito", "strength", "Peitoral maior", "Ênfase na porção esternal (peito médio)", "Tríceps; deltoide anterior"),
    ex("Supino inclinado", "Peito", "strength", "Peitoral maior", "Ênfase na porção clavicular (peito superior)", "Deltoide anterior; tríceps"),
    ex("Crucifixo com halteres", "Peito", "strength", "Peitoral maior", "Ênfase em alongamento e adução horizontal", "Deltoide anterior (leve)"),
    ex("Peck deck", "Peito", "strength", "Peitoral maior", "Ênfase em contração do peitoral", "Deltoide anterior (leve)"),
    ex("Flexão", "Peito", "strength", "Peitoral maior", "Ênfase geral (varia com inclinação e mãos)", "Tríceps; core; deltoide anterior"),

    // BÍCEPS
    ex("Rosca direta", "Bíceps", "strength", "Bíceps braquial", "Ênfase em volume geral do bíceps", "Braquial; braquiorradial"),
    ex("Rosca alternada", "Bíceps", "strength", "Bíceps braquial", "Ênfase em controle unilateral e amplitude", "Braquial; braquiorradial"),
    ex("Rosca martelo", "Bíceps", "strength", "Braquial / Braquiorradial", "Ênfase em espessura do braço e antebraço", "Bíceps (secundário)"),
    ex("Rosca concentrada", "Bíceps", "strength", "Bíceps braquial", "Ênfase em pico/contração (isolamento)", "Braquial (leve)"),
    ex("Barra fixa supinada", "Bíceps", "strength", "Dorsais + Bíceps", "Ênfase maior no bíceps (pegada supinada)", "Antebraço; dorsal"),

    // TRÍCEPS
    ex("Tríceps pulley", "Tríceps", "strength", "Tríceps braquial", "Ênfase geral (cabeça lateral/medial)", "Antebraço (estabilização)"),
    ex("Tríceps testa", "Tríceps", "strength", "Tríceps braquial", "Ênfase na cabeça longa (maior alongamento)", "Deltoide (estabilização)"),
    ex("Tríceps banco", "Tríceps", "strength", "Tríceps braquial", "Ênfase geral (varia com postura)", "Peitoral; deltoide anterior (leve)"),
    ex("Tríceps corda", "Tríceps", "strength", "Tríceps braquial", "Ênfase em contração final", "Antebraço"),
    ex("Mergulho em paralelas", "Tríceps", "strength", "Tríceps braquial", "Ênfase tríceps + peitoral (inclinação muda)", "Peitoral; ombro"),

    // OMBRO
    ex("Desenvolvimento (halteres)", "Ombro", "strength", "Deltoide", "Ênfase deltoide anterior/medial (press)", "Tríceps; trapézio sup."),
    ex("Elevação lateral", "Ombro", "strength", "Deltoide medial", "Ênfase na largura do ombro", "Trapézio (se roubar)"),
    ex("Elevação frontal", "Ombro", "strength", "Deltoide anterior", "Ênfase porção anterior", "Peitoral sup. (leve)"),
    ex("Remada alta", "Ombro", "strength", "Deltoide medial", "Ênfase deltoide medial + trapézio", "Trapézio; bíceps (leve)"),
    ex("Arnold press", "Ombro", "strength", "Deltoide", "Ênfase anterior com rotação", "Tríceps; peitoral (leve)"),

    // COSTAS
    ex("Puxada frontal", "Costas", "strength", "Dorsal (latíssimo)", "Ênfase dorsais (pegada/ângulo muda)", "Bíceps; romboides"),
    ex("Remada curvada", "Costas", "strength", "Dorsais / Romboides", "Ênfase espessura (meio das costas)", "Lombar; bíceps"),
    ex("Remada baixa", "Costas", "strength", "Romboides / Dorsais", "Ênfase retração escapular", "Bíceps; deltoide post."),
    ex("Barra fixa (pronada)", "Costas", "strength", "Dorsais", "Ênfase dorsais e parte sup.", "Bíceps; antebraço"),
    ex("Pullover (cabo/halter)", "Costas", "strength", "Dorsais", "Ênfase extensão do ombro + alongamento", "Peitoral (leve); tríceps"),

    // PERNAS
    ex("Agachamento", "Perna completa", "strength", "Quadríceps / Glúteos", "Ênfase geral (profundidade muda foco)", "Posterior; core"),
    ex("Leg press", "Perna completa", "strength", "Quadríceps / Glúteos", "Ênfase quadríceps (pés baixos) ou glúteos (pés altos)", "Posterior (leve)"),
    ex("Cadeira extensora", "Perna completa", "strength", "Quadríceps", "Ênfase isolamento quadríceps", "—"),
    ex("Mesa flexora", "Perna completa", "strength", "Posterior de coxa", "Ênfase isquiotibiais (flexão joelho)", "Glúteos (leve)"),
    ex("Panturrilha em pé", "Perna completa", "strength", "Gastrocnêmio", "Ênfase panturrilha com joelho estendido", "Sóleo (sec.)"),

    // ABS
    ex("Crunch", "Abdominal", "strength", "Reto abdominal", "Ênfase flexão do tronco (porção superior)", "—"),
    ex("Elevação de pernas", "Abdominal", "strength", "Reto abdominal (infra)", "Ênfase controle pélvico e região inferior", "Flexores do quadril (sec.)"),
    ex("Prancha", "Abdominal", "strength", "Core", "Ênfase estabilização isométrica", "Glúteos; lombar; ombros"),
    ex("Abdominal infra", "Abdominal", "strength", "Reto abdominal (infra)", "Ênfase região inferior (boa retroversão)", "Flexores do quadril"),
    ex("Oblíquo", "Abdominal", "strength", "Oblíquos", "Ênfase rotação/anti-rotação", "Reto abdominal"),

    // CARDIO
    ex("Esteira", "Cardio", "cardio", "Cardiorrespiratório", "Ênfase corrida/caminhada (cadência/impacto)", "Pernas (geral)"),
    ex("Bicicleta", "Cardio", "cardio", "Cardiorrespiratório", "Ênfase baixo impacto (cadência/força)", "Quadríceps; glúteos"),
    ex("Elíptico", "Cardio", "cardio", "Cardiorrespiratório", "Ênfase baixo impacto + corpo inteiro", "Pernas; braços (leve)"),
    ex("Corrida externa", "Cardio", "cardio", "Cardiorrespiratório", "Ênfase variação de terreno", "Pernas; core"),
    ex("Escada", "Cardio", "cardio", "Cardiorrespiratório", "Ênfase condicionamento + pernas", "Quadríceps; glúteos; panturrilha"),
  ];

  // Insert
  for (const e of exercises) {
    await DB.add("exercises", e);
  }

  await DB.metaSet("seed_v1", "1");
}

