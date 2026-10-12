# Bit Arcade — Document de disseny

*Data: 2026-10-12 · Estat: esborrany per revisar · Nom provisional*

## 1. Objectiu

Una web on joves de **13–14 anys o més**, sense experiència prèvia, aprenen a programar **sols, a casa**, reparant màquines d'una sala recreativa. Cada màquina és un joc mig fet escrit en un **subconjunt de C amb l'API de raylib**. L'alumne completa el que falta i, quan la màquina està arreglada, **hi pot jugar**.

**Criteri d'èxit:** un alumne sense coneixements acaba el Pong entenent variables, condicionals, comparacions i comptadors, i el codi que ha escrit compila tal qual amb gcc i raylib reals.

**Context d'ús:** autoaprenentatge, sense professor. Tota l'explicació és dins la web, i la motivació la donen el marc de joc i la recompensa (jugar a la màquina).

## 2. Abast de la primera versió

**Inclou:**
- La sala recreativa amb la **màquina 1 (Pong)** completa i 2–3 màquines més visibles però apagades ("Properament").
- Les 8 lliçons del Pong i un repte final (secció 7).
- Un intèrpret de mini-C amb visualitzacions (variables, línia activa, branques).
- Un botó per **descarregar `main.c`** de la màquina arreglada, per compilar-la amb raylib real.
- Contingut en **català**, amb la infraestructura multi-idioma preparada.
- El progrés es guarda a `localStorage`.
- Es publica a **GitHub Pages** des d'un repositori públic.

**No inclou (de moment):** comptes d'usuari, tauler per a professors, altres màquines jugables, so, disseny per a mòbil (es mostra un missatge: "fes-ho servir en un ordinador"), i contingut en castellà o anglès.

## 3. Experiència i estil visual

- **Estil: neó vectorial.** Tota la sala i la interfície es dibuixen amb formes simples i brillants: les mateixes primitives que l'alumne aprèn. No cal il·lustrador.
- **Guia: Bit**, un petit robot vectorial que parla amb bafarades curtes.
- **La sala:** mapa de màquines amb estats (*apagada*, *en reparació*, *arreglada*). Una màquina arreglada es pot jugar a pantalla gran i mostra les estrelles aconseguides.
- **Pantalla de lliçó, tres columnes** (amplada mínima 1280px):
  1. **Guia:** bafarada del Bit i progrés de la lliçó (p. ex. "Missió 2/6"). Es pot plegar.
  2. **Codi:** editor amb el programa sencer. Només les **zones editables** (marcades en groc) es poden tocar. Botons ▶ Executa, ⏯ Pas a pas, ⏹ Atura i ↺ Restaura.
  3. **Joc i variables:** el canvas del joc, i a sota el panell de variables.
- **Visualitzacions:**
  - Les variables són **caixes amb nom** que s'il·luminen quan canvien de valor.
  - **Línia activa** ressaltada en mode pas a pas.
  - **`if`:** la branca executada en verd i la no executada en gris.
  - **Bucles:** comptador de voltes al costat del `for`/`while`.

## 4. Pedagogia

Cada lliçó ensenya **un sol concepte**, amb aquesta seqüència de passos:

| Pas | Propòsit |
|---|---|
| `warmup` (opcional) | Un exercici ràpid d'un concepte anterior (repetició espaiada) |
| `observe` | **Toca i observa:** canvia un valor i mira l'efecte |
| `explain` | **Posa-li nom:** targeta del Bit amb una animació del concepte |
| `practice` | 2–3 exercicis curts amb pistes progressives (de vaga a quasi solució) |
| `apply` | **Fes-ho sol:** el concepte aplicat a la màquina, sense ajuda inicial |

**Recompenses per exercici:**
- ⭐ funciona.
- ⭐⭐ sense pistes.
- ⭐⭐⭐ supera el repte extra opcional.

**Retroalimentació:** quan una comprovació falla, el Bit diu quina, en positiu ("La pala baixa amb S ✔, però també es mou sense tocar res ✘").

## 5. Arquitectura

**Tecnologia:** TypeScript, Vite, Svelte, CodeMirror 6 i Canvas 2D. Web estàtica, sense servidor.

**Decisió clau:** el joc sencer, incloent-hi la part que ja ve feta, està escrit en mini-C. L'alumne veu tot el programa i n'edita només les zones marcades. Hi ha un sol motor d'execució, i el resultat final és un programa C complet i exportable.

| Mòdul | Responsabilitat | Depèn de |
|---|---|---|
| `src/lang/` | Lexer, parser, arbre sintàctic, comprovació de tipus, intèrpret pas a pas, codis d'error | res |
| `src/runtime/` | API tipus raylib, entrada de teclat, llista de dibuix per frame | `lang` (interfície de funcions natives) |
| `src/render/` | Pinta la llista de dibuix al canvas | `runtime` (tipus de la llista de dibuix) |
| `src/lessons/` | Model de dades de les lliçons, motor de passos, comprovacions, estrelles | `lang`, `runtime` (mode sense pantalla) |
| `src/ui/` | Components Svelte: sala, pantalla de lliçó, editor, panell de variables, Bit, animacions | tot l'anterior |
| `src/i18n/` | Textos de la interfície i dels errors, per idioma | res |
| `src/progress/` | Desar i carregar el progrés i el codi de l'alumne (`localStorage`) | res |
| `content/` | Lliçons: `lesson.ts`, `ca.json` i `solution.c` per lliçó | `lessons` (tipus) |

## 6. Llenguatge (mini-C)

**Invariant:** tot programa mini-C vàlid és C vàlid i compila amb gcc i raylib.

**Estructura del programa:** la de raylib real.
- `#include "raylib.h"` s'accepta i s'ignora.
- Només hi ha `int main(void)`, i acaba amb `return 0;`.
- El bucle és `while (!WindowShouldClose()) { ... }`.

**Inclou:**
- **Tipus:** `int`, `float`, `bool` i `Color` (només les constants predefinides).
- **Declaracions:** sempre amb un valor inicial, amb àmbit de bloc.
- **Operadors:**
  - Aritmètics: `+ - * / %`.
  - Comparacions: `< > <= >= == !=`.
  - Lògics: `&& || !`.
  - Signe menys unari i parèntesis.
- **Assignació:** `= += -= *= /=`. `++` i `--` només com a instrucció.
- **Control:** `if` / `else if` / `else`, `while` i `for`, amb **claus obligatòries**.
- **Comentaris:** `//` i `/* */`.
- **Semàntica de C:** la divisió entera trunca (amb un avís del Bit la primera vegada) i les conversions `int`/`float` són les de C.
- **`true`/`false`:** raylib.h ja inclou `stdbool.h`, així que funcionen.

**No inclou:** funcions pròpies, punters, *arrays*, *structs*, variables *string*, `switch`, `do-while`, `goto`, `#define` ni `break`/`continue`. L'intèrpret es dissenya perquè sigui fàcil afegir-ne (els *arrays* arribaran amb el Breakout).

**API disponible:**
- **Finestra i frames:**
  - `InitWindow(w, h, títol)` fixa la mida del canvas.
  - `SetTargetFPS`.
  - `WindowShouldClose()` retorna `false` fins que l'alumne prem ⏹.
  - `BeginDrawing` i `EndDrawing` (fi de frame).
  - `CloseWindow` (no fa res).
  - `GetScreenWidth` i `GetScreenHeight`.
- **Dibuix:** `ClearBackground`, `DrawRectangle`, `DrawCircle`, `DrawLine` i `DrawText`.
- **Teclat:** `IsKeyDown` i `IsKeyPressed`, amb `KEY_W`, `KEY_S`, `KEY_UP`, `KEY_DOWN`, `KEY_SPACE` i `KEY_ENTER`.
- **Altres:**
  - `GetRandomValue(min, max)`, amb llavor fixa en mode de comprovació.
  - `TextFormat`, només amb `%d` i `%.Nf`, i només com a argument de `DrawText`.
- **Colors:** `RAYWHITE`, `WHITE`, `BLACK`, `LIGHTGRAY`, `GRAY`, `DARKGRAY`, `RED`, `GREEN`, `BLUE`, `YELLOW`, `ORANGE`, `PINK`, `PURPLE`, `SKYBLUE`, `LIME` i `GOLD`, amb els valors RGBA de raylib.

**Errors:**
- Cada error té un codi, paràmetres i una posició (línia i columna). El text surt d'`i18n`.
- **Errors de compilació** (abans d'executar):
  - Falta `;`, `)` o `}`.
  - Variable no declarada, amb suggeriment del nom més semblant (distància d'edició).
  - Variable declarada dues vegades.
  - Tipus incompatibles, p. ex. `Color` en una operació aritmètica.
  - Funció desconeguda o nombre d'arguments incorrecte.
  - `if` sense claus.
  - Construcció no suportada, amb un missatge específic ("Les funcions pròpies encara no les hem après").
  - `if (x = 5)`: com que al mini-C l'assignació no és una expressió, és un error ("Has posat `=` (guardar) en lloc de `==` (comparar)").
  - Accents o `ç` en un nom de variable (`puntuació`), amb un missatge específic.
- **Avisos (no aturen l'execució):** divisió entera que trunca de debò (`7 / 2`), una sola vegada per operació.
- **Errors en execució:**
  - Divisió entera per zero.
  - Massa operacions en un sol frame (més de 100.000), amb la línia del bucle sospitós.
  - Dibuixar abans d'haver cridat `InitWindow`.

## 7. Currículum de la màquina 1 (Pong)

| # | Concepte | Resultat a la màquina |
|---|---|---|
| 0 | La pantalla és una quadrícula (x, y); les instruccions s'executen en ordre | Dibuixar la pala i la pilota |
| 1 | Variables | La posició de la pala passa a ser `palaY` |
| 2 | Assignació i aritmètica; el bucle del joc es repeteix 60 vegades per segon | La pilota es mou sola |
| 3 | `if` | La pala es mou amb W i S |
| 4 | Comparacions | La pala no surt de la pantalla |
| 5 | Canviar de signe | La pilota rebota a les parets |
| 6 | Condicions compostes (`&&`) | La pilota rebota a la pala |
| 7 | Comptadors | Marcador; la pilota torna al centre |
| 🏆 | Repte final | Programar el rival (la pala segueix la pilota) → la màquina s'encén |

## 8. Format d'una lliçó

```
content/pong/03-if/
  lesson.ts     estructura: passos, codi, zones editables, comprovacions, nombre de pistes
  ca.json       textos: Bit, explicacions, pistes, missatges de comprovació
  solution.c    solució de referència completa
```

- **Zones editables:** es marquen al codi font de la lliçó amb comentaris especials que l'editor amaga, p. ex. `/*@edit moviment-pala*/ ... /*@end*/`. El text fora de les zones és de només lectura.
- **Comprovacions:**
  - `code.*` (sobre l'arbre sintàctic): `uses("if")`, `declares("palaY", "int")`...
  - `run({frames, hold, press}).expect(...)` (execució sense pantalla amb entrada simulada): `v(nom).increased()`, `.equals(x)`, `.between(a, b)`, `.unchanged()`...
  - `drawn.*` (sobre la llista de dibuix): `rectangleNear(x, y)`, `circleCount(n)`...
- Cada comprovació té una clau de text a `ca.json` per explicar-la a l'alumne.

## 9. Flux d'execució

1. **▶ Executa:**
   1. Es munta el programa: el codi bloquejat i les zones editables de l'alumne.
   2. Lexer, parser i comprovació de tipus. Si hi ha errors, es marquen a l'editor (subratllat i icona al marge), el Bit explica el primer i no s'executa res.
2. **Execució:** l'intèrpret recorre l'arbre com un **generador**.
   - **Mode normal:** corre fins a `EndDrawing()` (fi de frame) i cedeix el control. Un planificador amb `requestAnimationFrame` avança a pas fix (60 fps).
   - **Pressupost per frame:** 100.000 operacions. Si se supera, salta l'error de bucle infinit.
   - **Mode pas a pas:** cedeix a cada instrucció. ⏯ avança una instrucció. Hi ha un control de velocitat (càmera lenta) per veure bucles.
3. **Entrada:** el canvas captura el teclat quan té el focus. Cada frame llegeix una còpia fixa de l'estat de les tecles.
4. **Dibuix:** entre `BeginDrawing` i `EndDrawing`, el runtime acumula una **llista de dibuix**. En acabar el frame, `render` la pinta tal qual, amb els colors de raylib i sense efectes neó. El neó només és el marc de la màquina.
5. **Esdeveniments cap a la interfície:** `varChanged`, `lineActive`, `branchTaken` i `loopIteration`. En mode normal, el panell de variables s'actualitza un cop per frame. En mode pas a pas, a cada esdeveniment.
6. **Mode sense pantalla:**
   - És el mateix intèrpret i el mateix runtime, sense canvas, amb entrada programada, N frames i llavor aleatòria fixa.
   - El fan servir les comprovacions de les lliçons i els tests.

## 10. Progrés i persistència

- Es guarda a `localStorage` amb una clau versionada (`bitarcade:v1`).
- **Per a cada exercici:** el codi de l'alumne, si està completat, les estrelles i les pistes vistes.
- Hi ha l'opció **"Reinicia el progrés"**.
- Si la versió de les dades canvia, una migració senzilla. Si falla, s'avisa i es comença de nou.

## 11. Idiomes

- Textos de la interfície i dels errors a `src/i18n/<idioma>.json`. Textos de les lliçons a `content/**/<idioma>.json`.
- Un selector d'idioma, amagat mentre només hi hagi català.
- Una clau que falta en un idioma fa servir el català com a alternativa, i un test llista les claus que falten.

## 12. Proves

- **Vitest per a `lang`:**
  - Lexer i parser: casos vàlids i, sobretot, cada error amb el seu codi i posició.
  - Intèrpret: semàntica de C (divisió entera, conversions, àmbits).
  - Pressupost d'operacions.
- **Lliçons:** per a cada exercici, la `solution.c` passa totes les comprovacions, i el codi inicial **no** les passa (si no, l'exercici no ensenya res).
- **Compatibilitat amb C real (CI):** una GitHub Action compila cada `solution.c` amb gcc i les capçaleres de raylib (`-fsyntax-only`), per garantir l'invariant de la secció 6.
- **Interfície:** proves manuals a la primera versió.

## 13. Publicació

- Repositori públic a GitHub.
- Una GitHub Action, a cada *push* a `main`: tests → `vite build` (amb `base` configurat per al nom del repo) → GitHub Pages.
- **Llicències:** MIT per al codi i CC BY-SA 4.0 per al contingut (`content/`).

## 14. Ordre de construcció (orientatiu, per al pla)

1. `lang`: intèrpret i errors, amb tests, en mode sense pantalla.
2. `runtime` i `render`: una pàgina mínima que executa un Pong complet en mini-C. **Primera cosa que es pot "veure funcionar".**
3. Editor amb zones editables, i comprovacions de lliçó.
4. Pantalla de lliçó completa i visualitzacions.
5. Sala recreativa, progrés i exportació de `main.c`.
6. Contingut de les 8 lliçons i el repte final.
7. Publicació a GitHub Pages i CI.

## 15. Riscos

- **El contingut és la feina més gran.** Escriure bons exercicis costa més que l'intèrpret. Cal provar-los amb nois i noies reals al més aviat possible (a partir del pas 4).
- **Errors amigables:** cobrir els errors típics de principiant requereix iterar amb codi real d'alumnes.
- **Abast:** la temptació d'afegir màquines abans de validar el Pong.
