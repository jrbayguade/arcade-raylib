#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);
//@endfold

    int palaY = 185;
    int alcada = 80;
    int pilotaX = 400;
    int pilotaY = 225;

    while (!WindowShouldClose())
    {
//@edit
        pilotaX = pilotaX + 1;
//@end

//@fold dibuixar
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(20, palaY, 10, alcada, WHITE);
        DrawRectangle(770, palaY, 10, alcada, WHITE);
//@endfold
        DrawCircle(pilotaX, pilotaY, 8, YELLOW);
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
