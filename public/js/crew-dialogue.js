/**
 * Diálogo recreado de la tripulación por evento de misión.
 * No es una transcripción real: es una dramatización para el simulador.
 * Las llaves son los `id` de los eventos de /api/events.
 */

export const SPEAKERS = {
  wiseman: 'Wiseman',
  glover: 'Glover',
  koch: 'Koch',
  hansen: 'Hansen',
};

export const CREW_DIALOGUE = {
  'launch': [
    ['wiseman', 'Encendido confirmado. Nos vamos, equipo.'],
    ['glover', 'Torre despejada. Qué empujón tiene este cohete.'],
    ['hansen', 'Canadá también va en este asiento, que conste.'],
  ],
  'srb-sep': [
    ['glover', 'Separación de los aceleradores sólidos. Se sintió el golpe.'],
    ['koch', 'Lecturas nominales en mi pantalla.'],
  ],
  'core-sep': [
    ['wiseman', 'Etapa central fuera. Ya somos solo Orion y la etapa superior.'],
    ['hansen', 'Y de pronto todo flota. Mi lista de verificación incluida.'],
  ],
  'perigee-raise': [
    ['glover', 'Encendido de elevación de perigeo completado.'],
    ['koch', 'Órbita estable. Buen momento para revisar los sistemas de soporte vital.'],
  ],
  'tli': [
    ['wiseman', 'Inserción translunar. Esta es la que nos saca de casa.'],
    ['koch', 'Nadie ha salido de la órbita terrestre así desde 1972.'],
    ['hansen', 'Y yo soy el primer canadiense en hacerlo. Todavía no me lo creo.'],
  ],
  'sm-panel': [
    ['glover', 'Paneles del módulo de servicio expulsados. Alas solares desplegándose.'],
    ['koch', 'Generación eléctrica en aumento. Orion ya vive de su propio sol.'],
  ],
  'outbound-coast': [
    ['wiseman', 'Inicia el crucero de ida. Turnos de descanso como se planeó.'],
    ['hansen', '¿Alguien más no puede dejar de mirar por la ventana?'],
    ['glover', 'La Tierra ya cabe completa en el marco. Es increíble.'],
  ],
  'mcc1': [
    ['glover', 'Corrección de trayectoria en curso… y apagado. Bien hecho, Orion.'],
    ['koch', 'Rumbo afinado hacia la Luna.'],
  ],
  'lunar-soi': [
    ['koch', 'Acabamos de entrar en la esfera de influencia lunar.'],
    ['wiseman', 'A partir de aquí manda la gravedad de la Luna.'],
  ],
  'distance-record': [
    ['hansen', 'Récord de distancia: ya pasamos al Apollo 13.'],
    ['wiseman', 'Ningún ser humano había estado tan lejos de casa.'],
    ['koch', 'Un saludo para la tripulación del Apollo 13. Esto es por ellos también.'],
  ],
  'lunar-obs': [
    ['koch', 'Cámaras listas. Empiezo el registro de la superficie.'],
    ['hansen', 'Los cráteres se ven tan nítidos que parecen dibujados.'],
  ],
  'los': [
    ['wiseman', 'Perdemos señal con la Tierra. Estamos detrás de la Luna.'],
    ['glover', 'Los cuatro solos al otro lado. Silencio total.'],
    ['hansen', 'Nunca había oído un silencio así.'],
  ],
  'closest-approach': [
    ['glover', 'Máxima aproximación: unos 6.500 km sobre la superficie.'],
    ['koch', 'La Luna llena toda la ventana. No hay otra cosa allá afuera.'],
  ],
  'max-distance': [
    ['wiseman', 'Distancia máxima a la Tierra: más de 406.000 km.'],
    ['hansen', 'Es lo más lejos que va a estar una persona en mucho tiempo.'],
  ],
  'aos': [
    ['koch', 'Señal recuperada. Houston nos vuelve a escuchar.'],
    ['glover', 'Y miren eso: la Tierra saliendo sobre el horizonte lunar.'],
    ['wiseman', 'Que alguien tome esa foto. Ahora.'],
  ],
  'solar-eclipse': [
    ['koch', 'La Luna está tapando al Sol. Se ve la corona.'],
    ['hansen', 'Un eclipse total visto desde aquí. Qué privilegio.'],
  ],
  'meteor-impact': [
    ['hansen', '¡Destello en la superficie! ¿Lo vieron?'],
    ['koch', 'Lo tengo grabado. Fue un impacto de meteorito.'],
    ['wiseman', 'Marquen la hora y la posición para el equipo de ciencia.'],
    ['glover', 'Quedó un cráter nuevo. La Luna sigue cambiando.'],
  ],
  'return-begins': [
    ['wiseman', 'Termina la observación lunar. Ahora sí, de regreso a casa.'],
    ['glover', 'La Tierra nos va a jalar el resto del camino.'],
  ],
  'exit-soi': [
    ['koch', 'Salimos de la esfera de influencia lunar.'],
    ['hansen', 'Adiós, Luna. Fue un honor.'],
  ],
  'mcc2': [
    ['glover', 'Segunda corrección de trayectoria. Apuntando al corredor de reentrada.'],
    ['wiseman', 'Ventana de reentrada confirmada.'],
  ],
  'sm-sep': [
    ['wiseman', 'Separación del módulo de servicio. Gracias por el viaje.'],
    ['koch', 'Ahora todo depende del escudo térmico.'],
  ],
  'reentry': [
    ['glover', 'Interfaz de reentrada. Empieza el plasma afuera.'],
    ['hansen', 'Las ventanas se están poniendo naranjas.'],
  ],
  'peak-heat': [
    ['koch', 'Calor máximo. El escudo está haciendo su trabajo.'],
    ['wiseman', 'Sujétense. Esta es la parte más intensa.'],
  ],
  'drogue': [
    ['glover', 'Paracaídas estabilizadores desplegados.'],
    ['hansen', 'Uf, ese tirón sí se sintió.'],
  ],
  'main-chutes': [
    ['wiseman', 'Tres paracaídas principales abiertos y estables.'],
    ['koch', 'Velocidad de descenso nominal.'],
  ],
  'splashdown': [
    ['wiseman', 'Amerizaje. Bienvenidos a casa, equipo.'],
    ['glover', 'Nueve días, una Luna y cuatro amigos.'],
    ['hansen', 'Gracias, Houston. Gracias, Canadá.'],
    ['koch', 'Volvamos pronto.'],
  ],
};

const START_DELAY = 350;     // ms: evita disparar diálogos mientras se arrastra el slider
const TYPE_MS_PER_CHAR = 22;
const MAX_LINES = 12;

/**
 * Reproduce el diálogo del último evento alcanzado. Avanzar sobre varios eventos de golpe
 * solo reproduce el más reciente, y un evento nuevo corta lo que quede del anterior.
 */
export function createCrewComms(logEl, events, dialogue = CREW_DIALOGUE) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastIdx = -2;
  let lastMet = null;
  let playingId = null;
  let queue = [];
  let timer = null;
  let typing = null;

  function lastReachedIndex(met) {
    let idx = -1;
    for (let i = 0; i < events.length; i++) {
      if (events[i].met <= met) idx = i; else break;
    }
    return idx;
  }

  function trim() {
    while (logEl.children.length > MAX_LINES) logEl.firstElementChild.remove();
  }

  function finishTyping() {
    if (!typing) return;
    typing.el.textContent = typing.text;
    clearInterval(typing.interval);
    typing = null;
  }

  function stop() {
    clearTimeout(timer);
    timer = null;
    finishTyping();
    queue = [];
    playingId = null;
  }

  function appendEventHeader(ev) {
    const li = document.createElement('li');
    li.className = 'comms-event';
    li.textContent = `${ev.icon} ${ev.title}`;
    logEl.appendChild(li);
    trim();
  }

  function playNext() {
    const next = queue.shift();
    if (!next) { playingId = null; return; }
    const [who, text] = next;

    const li = document.createElement('li');
    li.className = 'comms-line';
    li.dataset.who = who;
    const name = document.createElement('span');
    name.className = 'comms-who';
    name.textContent = SPEAKERS[who] || who;
    const body = document.createElement('span');
    body.className = 'comms-text';
    li.append(name, body);
    logEl.appendChild(li);
    trim();

    const hold = 900 + text.length * 30;
    if (reduceMotion.matches) {
      body.textContent = text;
      timer = setTimeout(playNext, hold);
      return;
    }

    let i = 0;
    typing = {
      el: body,
      text,
      interval: setInterval(() => {
        i += 1;
        body.textContent = text.slice(0, i);
        if (i >= text.length) {
          finishTyping();
          timer = setTimeout(playNext, hold);
        }
      }, TYPE_MS_PER_CHAR),
    };
  }

  function play(ev) {
    const lines = dialogue[ev.id];
    if (!lines || ev.id === playingId) return;
    stop();
    playingId = ev.id;
    timer = setTimeout(() => {
      appendEventHeader(ev);
      queue = lines.slice();
      playNext();
    }, START_DELAY);
  }

  function update(met) {
    const idx = lastReachedIndex(met);
    if (idx !== lastIdx) {
      const jumpedToEvent = idx >= 0 && met === events[idx].met && met !== lastMet;
      if (idx >= 0 && (idx > lastIdx || jumpedToEvent)) {
        play(events[idx]);
      } else {
        stop();
      }
      lastIdx = idx;
    }
    lastMet = met;
  }

  return { update };
}
