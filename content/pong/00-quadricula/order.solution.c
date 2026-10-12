#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);

    while (!WindowShouldClose())
    {
//@endfold
        BeginDrawing();
//@edit
        ClearBackground(BLACK);
        DrawRectangle(20, 185, 10, 80, WHITE);
//@end
        DrawRectangle(770, 185, 10, 80, WHITE);
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
