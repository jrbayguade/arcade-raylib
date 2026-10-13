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
//@edit
        if (IsKeyDown(KEY_W)) { palaY = palaY - 6; }
//@placeholder fes baixar la pala quan prems la S
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
