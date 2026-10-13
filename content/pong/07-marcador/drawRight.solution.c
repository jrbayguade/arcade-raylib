#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);
//@endfold

    int palaY = 185;
    int palaDretaY = 185;
    int alcada = 80;
    int pilotaX = 400;
    int pilotaY = 225;
    int velX = -5;
    int velY = 0;
    int puntsEsquerra = 0;
    int puntsDreta = 0;

    while (!WindowShouldClose())
    {
//@fold pales
        if (IsKeyDown(KEY_W)) { palaY = palaY - 6; }
        if (IsKeyDown(KEY_S)) { palaY = palaY + 6; }
        if (IsKeyDown(KEY_UP)) { palaDretaY = palaDretaY - 6; }
        if (IsKeyDown(KEY_DOWN)) { palaDretaY = palaDretaY + 6; }
        if (palaY < 20) { palaY = 20; }
        if (palaY > 350) { palaY = 350; }
        if (palaDretaY < 20) { palaDretaY = 20; }
        if (palaDretaY > 350) { palaDretaY = 350; }
//@endfold
//@fold moviment
        pilotaX = pilotaX + velX;
        pilotaY = pilotaY + velY;
        if (pilotaY < 8) { velY = -velY; }
        if (pilotaY > 442) { velY = -velY; }
        if (pilotaX < 38 && pilotaY > palaY && pilotaY < palaY + alcada) { velX = -velX; }
        if (pilotaX > 762 && pilotaY > palaDretaY && pilotaY < palaDretaY + alcada) { velX = -velX; }
//@endfold
        if (pilotaX > 800) { puntsEsquerra++; pilotaX = 400; }
        if (pilotaX < 0) { puntsDreta++; pilotaX = 400; }

//@fold dibuixar
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(20, palaY, 10, alcada, WHITE);
        DrawRectangle(770, palaDretaY, 10, alcada, WHITE);
        DrawCircle(pilotaX, pilotaY, 8, YELLOW);
//@endfold
        DrawText(TextFormat("%d", puntsEsquerra), 340, 20, 40, WHITE);
//@edit
        DrawText(TextFormat("%d", puntsDreta), 440, 20, 40, WHITE);
//@end
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
