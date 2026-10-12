# Pantalla de lliçó i lliçons 0–1 — Document de disseny

*Data: 2026-10-12 · Estat: esborrany per revisar · Depèn de: `2026-10-12-bit-arcade-design.md` (especificació general)*

## 1. Objectiu

Construir **la primera experiència real d'alumne**: la pantalla de lliçó i les lliçons 0 i 1 del Pong, una darrere l'altra. Serveix per **validar la pedagogia**: que l'usuari (i, si pot ser, un noi o noia real de 13–14 anys) jutgi si s'entén sense ajuda externa.

**Criteri d'èxit:** una persona sense experiència fa les dues lliçons sola, sense mirar res fora de la web, i acaba havent escrit una crida a `DrawCircle` i havent creat variables pròpies.

**Context:** la demo actual (editor amb tot el Pong) es va trobar massa complicada per a un nen. Aquesta pantalla la substitueix com a pàgina principal. La demo es manté a `demo.html` com a banc de proves del motor.

## 2. Abast

**Inclou:**
- Pantalla de lliçó en tres columnes (secció 3 de l'especificació general).
- Motor de passos (`warmup`, `observe`, `explain`, `practice`, `apply`), amb comprovacions automàtiques, pistes progressives i estrelles (⭐ funciona, ⭐⭐ sense pistes).
- Editor CodeMirror amb:
  - zones editables (la resta és de només lectura);
  - codi C **plegat** amb títols;
  - etiquetes de paràmetre dins dels parèntesis (`x:`, `y:`, `amplada:`...);
  - autocompletat de funcions i constants de raylib;
  - ressaltat de sintaxi C.
- Panell de variables (caixes amb nom que s'il·luminen quan canvien).
- Coordenades del ratolí sobre el joc.
- Dues targetes animades: "la pantalla és una quadrícula" i "una variable és una caixa".
- Contingut de les lliçons 0 i 1 (secció 7), amb el botó "Següent lliçó →" entre totes dues.

**No inclou:**
- Sala recreativa.
- Progrés desat: en recarregar, es torna a començar la lliçó. Durant les proves es pot saltar a qualsevol pas amb `#/pong/1/3`.
- Estrelles ⭐⭐⭐.
- Mode pas a pas (el motor ja el permet; la interfície, més endavant).
- Altres idiomes (la infraestructura ja hi és).
- Mòbil.

## 3. Decisió de presentació del codi

L'alumne veu **C de veritat, plegat** (opció A de la sessió de disseny):
- Les parts que encara no toca es pleguen en una línia gris amb un títol en català ("▸ 9 línies: preparar el joc"). Si fa clic, es despleguen i les pot llegir, però no editar.
- La zona editable té fons groc. Fora d'aquesta zona, l'editor no accepta canvis.
- Les etiquetes de paràmetre són decoracions de l'editor, **no** text del codi: no es poden esborrar i no arriben mai al compilador.
- El que es compila és **exactament** el que es veu, plecs inclosos. Els números de línia dels errors coincideixen amb els de l'editor.

## 4. Arquitectura

**Dependències noves:** `svelte` 5, `@sveltejs/vite-plugin-svelte`, `codemirror` 6 i `@codemirror/lang-cpp`. `playwright-core` s'afegeix com a dependència de desenvolupament per a una prova al navegador (Edge, local).

**Pàgines:**
- `index.html`: l'app de lliçons.
- `demo.html`: la demo actual, sense canvis.

Vite queda configurat amb dues entrades.

**Navegació:** amb el *hash* de l'URL.
- `#/pong/0` és la lliçó 0, i `#/pong/1/3` és la lliçó 1, pas 3.
- Sense *hash* → lliçó 0, pas 0.

| Mòdul nou | Responsabilitat | Depèn de |
|---|---|---|
| `src/lessons/source.ts` | Llegeix el codi d'un exercici amb marques (`//@edit`, `//@fold`) i en treu: el codi net, els rangs editables i els plecs | res |
| `src/lessons/checks.ts` | Comprovacions: de codi (sobre l'AST), d'execució (sense pantalla, amb tecles simulades) i de dibuix (sobre la llista de dibuix). Cada una retorna `{ ok, key }` | `lang`, `runtime` |
| `src/lessons/model.ts` | Tipus d'una lliçó i dels seus passos | `checks` |
| `src/lessons/engine.ts` | Estat d'una lliçó: pas actual, pistes vistes, estrelles, avançar. És lògica pura, sense interfície | `model`, `checks` |
| `src/editor/` | Extensions de CodeMirror: només lectura fora de zones, plecs, etiquetes de paràmetre, autocompletat, ressaltat de la línia d'error | `lang/lexer`, `i18n` |
| `src/ui/` | Components Svelte: `LessonScreen`, `BitBubble`, `CodePane`, `GamePane`, `VariablesPanel`, `ExplainCard` i les animacions `GridCard` i `VariableBoxCard` | tot l'anterior |
| `content/pong/00-quadricula/`, `content/pong/01-variables/` | `lesson.ts`, `ca.json`, i un `.c` d'inici i un `.solution.c` per exercici | `lessons/model` |

El `Runner` de la demo (`src/demo/runner.ts`) es mou a `src/runtime/runner.ts`, perquè l'app de lliçons el reutilitza tal qual.

## 5. Format del codi d'un exercici

Cada exercici és un fitxer `.c` vàlid. Les marques són comentaris en una línia pròpia, així que el fitxer continua compilant amb gcc i la CI el comprova:

```c
#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    ...
//@endfold
        BeginDrawing();
        ClearBackground(BLACK);
//@edit
        DrawRectangle(20, 185, 10, 80, WHITE);
//@end
        EndDrawing();
```

**Què fa `parseLessonSource`:**
- Esborra les línies de marca.
- Retorna el codi net, els rangs editables (en caràcters del codi net) i els plecs amb la seva clau de títol.
- El text del títol surt de `ca.json` de la lliçó, amb el nombre de línies afegit automàticament.

**Regles:**
- Cada exercici té **una sola** zona editable. Diverses zones complicarien la interfície i cap exercici de les lliçons 0–1 no les necessita.
- Una zona editable pot quedar buida. L'alumne hi pot escriure tantes línies com vulgui, i la zona creix.

## 6. Flux d'un exercici

1. El Bit mostra la consigna i l'editor carrega el codi d'inici.
2. L'alumne edita i prem **▶ Executa**:
   1. **Error de compilació:** subratllat a l'editor, i el Bit explica l'error en el seu to. No s'executa res.
   2. **El codi compila:** el joc s'executa al canvas, igual que a la demo. Alhora, les comprovacions s'executen **sense pantalla** sobre el mateix codi.
3. **Si alguna comprovació falla:** el Bit mostra la llista ("La pala és a la y que toca ✔ · El cercle és al centre ✘"). El joc continua visible, perquè l'alumne pugui veure què passa.
4. **Si totes passen:** celebració curta del Bit, les estrelles de l'exercici, i el botó **Continua →**.
5. **💡 Pista:** mostra la pista següent, fins a 3. Haver-ne vist alguna treu la ⭐⭐.
6. **↺ Torna a començar:** restaura el codi d'inici de l'exercici.
7. **Passos `explain`:** només una targeta animada i **Continua →**. No hi ha editor actiu.

**Les comprovacions són determinístiques:** llavor aleatòria fixa, un nombre fix de frames i tecles simulades. Així no depenen de què faci l'alumne amb el teclat mentre juga.

## 7. Contingut

**Lliçó 0 — "La pantalla és una quadrícula"**

| Pas | Consigna | Comprovació |
|---|---|---|
| observe | Canvia el 185 per un 50 i prem ▶ | El rectangle de la pala no és a y=185 |
| explain | Targeta: la quadrícula. La x creix cap a la dreta i la y creix **cap avall**. Les coordenades del ratolí es veuen sobre el joc | — |
| practice 1 | Posa la pala tocant a terra | La pala té y entre 365 i 370, i alçada 80 |
| practice 2 | Fes la pala el doble d'alta | Alçada 160 |
| practice 3 | `ClearBackground` és després de `DrawRectangle`: la pala no es veu. Arregla-ho | Hi ha un rectangle dibuixat després de l'últim `clear` |
| apply | Dibuixa la pilota al centre | Hi ha un cercle amb el centre a menys de 10 px de (400, 225) |

**Lliçó 1 — "Variables"**

| Pas | Consigna | Comprovació |
|---|---|---|
| warmup | Posa la pala a y=100 | Rectangle a y=100 |
| observe | Canvia el valor de `palaY` i mira'n la caixa | El rectangle no és a y=185 |
| explain | Targeta: una variable és una caixa amb nom | — |
| practice 1 | Totes dues pales fan servir `palaY`. Mou-les juntes canviant un sol número | Les dues pales tenen la mateixa y, diferent de 185 |
| practice 2 | Crea `int alcada` i fes-la servir a totes dues pales | Declara `alcada` de tipus `int`, i els dos rectangles tenen l'alçada igual al valor de `alcada` |
| apply | Fes que la pilota faci servir `pilotaX` i `pilotaY` | Declara totes dues (`int`), i el cercle és a (`pilotaX`, `pilotaY`) |

**Textos:** a `content/pong/0X-*/ca.json`: títol, consignes, 3 pistes per exercici, missatges de cada comprovació i títols dels plecs. El to és proper i breu, amb frases curtes i de tu.

## 8. Ajudes de l'editor

- **Etiquetes de paràmetre:**
  - Es calculen amb el lexer del mini-C, comptant parèntesis i comes. Si el codi és a mig escriure i el lexer falla, no es mostren etiquetes (sense error).
  - Els noms en català surten d'una taula a `src/i18n/ca.json` (`params.DrawRectangle = ["x", "y", "amplada", "alçada", "color"]`).
- **Autocompletat:**
  - Funcions i constants de raylib que existeixen al `RaylibHost`, i variables declarades al codi.
  - En triar una funció, s'insereix una plantilla amb els paràmetres per omplir (`DrawCircle(x, y, radi, color)`), on Tab salta al següent.
- **Error:** la línia de l'error queda subratllada, amb el missatge en passar-hi el ratolí.

## 9. Proves

- **Unitàries (Vitest):**
  - `parseLessonSource`: marques, rangs i plecs.
  - Cada tipus de comprovació.
  - El motor de passos: avançar, pistes, estrelles.
  - El càlcul de les etiquetes de paràmetre.
- **Contingut:** per a cada exercici, el codi d'inici **no** passa les comprovacions i el `.solution.c` **sí**. També es comprova que tots els textos referenciats existeixen a `ca.json`.
- **C real:** la CI ja compila tots els `.c` de `content/` amb gcc i raylib.h. Hi entren automàticament els codis d'inici i les solucions.
- **Navegador (local):** `npm run e2e` fa amb Edge (`playwright-core`) les dues lliçons sencers, escrivint les solucions a l'editor i comprovant que s'arriba al final.
- **Manual:** l'usuari fa les dues lliçons. Si és possible, també ho prova un noi o noia de l'edat.

## 10. Riscos

- **CodeMirror i les zones de només lectura** poden xocar en casos límit (enganxar text, desfer, seleccionar a cavall de la zona). Es resol filtrant cada transacció: es rebutgen els canvis fora de la zona. Ho cobreixen els tests de l'extensió.
- **El to dels textos del Bit** és el que més pesa en "és prou senzill?". Els escric jo, però l'usuari els ha de llegir amb ulls de nen i corregir-los.
