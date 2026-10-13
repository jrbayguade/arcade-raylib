# Lliçó 3 del Pong «La pilota es mou» i càmera lenta — Document de disseny

*Data: 2026-10-13 · Aprovat en xat per l'usuari (disseny de 5 passos + botó 🐢).*

## 1. Objectiu

El nen entén dues idees:
- el bucle del joc es repeteix 60 vegades per segon (cada volta és un **fotograma**);
- `pilotaX = pilotaX + 3;` vol dir «agafa el que hi ha a la caixa, suma-hi 3 i torna-ho a guardar». El `=` no és l'«igual» de mates, sinó «guarda-hi».

Resultat a la màquina: la pilota es mou sola.

## 2. Abast

**Inclou:**
- la lliçó 3, amb contingut a `content/pong/02-moviment/`;
- el botó 🐢 de càmera lenta a la màquina, per a totes les lliçons;
- la targeta d'explicació nova `frames`;
- dos diagnòstics nous de l'intèrpret.

**No inclou:**
- el rebot (lliçó 6);
- diverses zones editables per exercici;
- controls tàctils per jugar;
- guardar el progrés.

## 3. Passos de la lliçó

Codi de partida comú, que continua el final de la lliçó 2:
- declaracions `palaY = 185`, `alcada = 80`, `pilotaX = 400`, `pilotaY = 225`;
- dins el bucle, les dues pales i `DrawCircle(pilotaX, pilotaY, 8, YELLOW)`.

Les comprovacions executen **30 fotogrames** sense pantalla (`run: { frames: 30 }`). Els valors inicials són fixos al codi, així que es poden calcular exactament.

| # | id | tipus | Zona groga | Què ha de fer el nen | Comprovacions (clau → condició) |
|---|---|---|---|---|---|
| 1 | `crawl` | observe | Dins el bucle: `pilotaX = pilotaX + 1;` | Canviar l'1 per un número més gran (2–20), executar i mirar-ho amb 🐢 | `faster` → pilotaX ≥ 400 + 30·2; `notTooFast` → pilotaX ≤ 400 + 30·20; `ballFollows` → cercle dibuixat a (pilotaX, pilotaY) |
| 2 | `frames` | explain | — | Targeta «fotograma a fotograma» | — |
| 3 | `diagonal` | practice | Dins el bucle: `pilotaX = pilotaX + 3;` i una línia buida amb el fantasma «fes baixar la pilota: pilotaY» | Afegir `pilotaY = pilotaY + 2;` (qualsevol increment positiu) | `yMoves` → pilotaY > 225; `xStillMoves` → pilotaX = 400 + 90 |
| 4 | `left` | practice | Dins el bucle: `pilotaX = pilotaX + 3;` | Fer que vagi cap a l'esquerra | `goesLeft` → pilotaX ≤ 400 − 30 (almenys 1 píxel per fotograma cap a l'esquerra) |
| 5 | `speed` | apply | Les declaracions (palaY…pilotaY) i un fantasma «crea aquí la caixa velX». Al bucle, fora de la zona i a la vista: `pilotaX = pilotaX + velX;` | Crear `int velX = 4;` (qualsevol valor ≠ 0) | `declaresSpeed` → declara `velX` int; `speedNotZero` → velX ≠ 0; `usesSpeed` → pilotaX = 400 + 30·velX |

El codi de partida del pas 5 no compila fins que existeix `velX`, i la màquina mostra la neu de TV (el mateix patró que `height` a la lliçó 2). Bit diu que amb `velX` negatiu la pilota va cap a l'esquerra. Això prepara el rebot de la lliçó 6, on n'hi haurà prou de canviar el signe de `velX`.

**Textos clau d'en Bit** (a `ca.json`, amb el to de les lliçons 1–2):
- **Pas 1:** el bucle es repeteix 60 vegades per segon; prova 🐢 per veure-ho a poc a poc.
- **Èxit del pas 1:** «Se n'ha anat! Tranquil: a la lliçó 6 la farem rebotar. Torna a ▶ Executa i tornarà a sortir del mig.»
- **Targeta:** «llegeix 400 → suma 3 → guarda 403», i el `=` vol dir «guarda-hi».

**Errors típics** (missatge «Ja gairebé!» de la primera comprovació que falla, o diagnòstic):
- `pilotaX = 3;` (o `=+ 3`): la pilota queda quieta a x = 3. Falla `faster`/`goesLeft`, i el text de la comprovació diu «la pilota s'ha quedat quieta: has guardat un 3 a la caixa en lloc de sumar-l'hi».
- `pilotaX + 3;`: diagnòstic nou `VALUE_NOT_STORED` (§5).
- `int pilotaX = pilotaX + 3;` dins el bucle: diagnòstic nou `SHADOWED_VAR` (§5).

## 4. Botó 🐢 càmera lenta

- **On és:** un botó 🐢 a la fila de les variables, sota la pantalla, dins el moble. Es mostra a tots els passos d'exercici i també al mòbil (mínim 44 px).
- **Actiu:**
  - el joc va a 3 fotogrames per segon;
  - el botó queda il·luminat;
  - a la cantonada de la pantalla apareix «fotograma N», amb el comptador de fotogrames del programa que s'està executant, que comença a 1;
  - el panell de variables s'actualitza a cada fotograma, com sempre.
- **Inactiu:** 60 fotogrames per segon, com ara.
- L'estat es manté en canviar de pas dins la sessió, però no es guarda.
- Fa so en clicar-lo (`data-sound`).
- Les comprovacions sense pantalla no en depenen.
- **Implementació:**
  - `FrameClock`/`Runner` accepten una velocitat, amb `setSlow(on)` o l'equivalent;
  - `Runner` exposa el número de fotograma;
  - `GamePane` mostra el comptador;
  - `LessonScreen` guarda l'estat.

## 5. Diagnòstics nous de l'intèrpret

- **`VALUE_NOT_STORED`:** una sentència que comença amb una expressió que no és una crida, per exemple `pilotaX + 3;`. Missatge: «Has calculat «pilotaX + 3», però no l'has guardat a cap caixa. Per guardar-ho: «pilotaX = pilotaX + 3;»». Substitueix `EXPECTED_ASSIGNMENT` quan es pot reconstruir l'expressió; si no, es manté el missatge actual.
- **`SHADOWED_VAR`:** una declaració `int x` dins un bloc on ja hi ha una `x` d'un bloc exterior. Missatge: «Ja tens una caixa «pilotaX». Per canviar-ne el valor, treu el «int»: «pilotaX = …;»».
  - **Abast:** a C és legal, però per a un principiant gairebé sempre és un error. A més, `int x = x + 3;` llegeix una variable sense inicialitzar, perquè l'àmbit de la nova comença al declarador.
  - Cal comprovar que cap solució existent no declara variables ombrejades.
- Tots dos tenen text a `src/i18n/ca.json` i tests a `tests/` (lexer/parser/checker).

## 6. Targeta `frames`

`FramesCard.svelte`, un SVG amb el mateix estil que `GridCard` i `VariableBoxCard`. Té tres fotogrames en una tira de pel·lícula, i a cada un la pilota una mica més a la dreta. A sota hi ha la caixa `pilotaX`, que mostra 400 → 403 → 406 en bucle (uns 1,2 s per fotograma). Al costat, la línia `pilotaX = pilotaX + 3;` amb tres etiquetes que s'il·luminen per torns: «llegeix 400», «suma 3», «guarda 403». A les pàgines d'en Bit s'explica que de debò en passen 60 cada segon. Amb `prefers-reduced-motion`, la targeta és estàtica (el fotograma del mig).

`ExplainStep.card` s'amplia a `'grid' | 'variable-box' | 'frames'`.

## 7. Proves

- **Unitàries:**
  - les 4 solucions passen les seves comprovacions i els codis de partida no;
  - cada error típic de §3 falla a la comprovació esperada, o dona el diagnòstic esperat;
  - diagnòstics nous;
  - càmera lenta al `FrameClock`;
  - i18n: claus noves presents.
- **e2e:**
  - recorregut de la lliçó 3 (`solve` a cada pas) i e2e de la lliçó 2 → lliçó 3;
  - 🐢 activa el comptador i la velocitat: el número de fotograma puja poc en 1 s;
  - la targeta `frames` es veu;
  - el pas 5 comença amb neu de TV.
- **CI:** gcc `-Werror` sobre les solucions noves (ja es fa automàticament amb `content/**/*.solution.c`).
- **Revisió d'UI amb subagent** en acabar, iterant fins a «ship as is».

## 8. Riscos

- **Una pilota que s'escapa de la pantalla pot semblar un error.** Ho mitiguen el text d'en Bit i ▶ per reiniciar.
- **`SHADOWED_VAR` podria trencar codi existent.** Els tests de contingut de totes les lliçons ho detecten.
