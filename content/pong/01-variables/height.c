#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);
//@endfold

//@edit
    int palaY = 185;
//@end

//@fold bucle
    while (!WindowShouldClose())
    {
        BeginDrawing();
        ClearBackground(BLACK);
//@endfold
        DrawRectangle(20, palaY, 10, alcada, WHITE);
        DrawRectangle(770, palaY, 10, alcada, WHITE);
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
