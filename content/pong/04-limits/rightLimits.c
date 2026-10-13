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

    while (!WindowShouldClose())
    {
        if (IsKeyDown(KEY_W)) { palaY = palaY - 6; }
        if (IsKeyDown(KEY_S)) { palaY = palaY + 6; }
        if (IsKeyDown(KEY_UP)) { palaDretaY = palaDretaY - 6; }
        if (IsKeyDown(KEY_DOWN)) { palaDretaY = palaDretaY + 6; }
        if (palaY < 20) { palaY = 20; }
        if (palaY > 370) { palaY = 370; }
//@edit
//@placeholder els mateixos límits per a palaDretaY
//@end

//@fold dibuixar
        BeginDrawing();
        ClearBackground(BLACK);
//@endfold
        DrawRectangle(20, palaY, 10, alcada, WHITE);
        DrawRectangle(770, palaDretaY, 10, alcada, WHITE);
        DrawCircle(pilotaX, pilotaY, 8, YELLOW);
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
