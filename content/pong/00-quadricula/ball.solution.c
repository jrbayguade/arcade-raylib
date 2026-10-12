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
        ClearBackground(BLACK);
        DrawRectangle(770, 185, 10, 80, WHITE);
//@edit
        DrawRectangle(20, 185, 10, 80, WHITE);
        DrawCircle(400, 225, 8, YELLOW);
//@end
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
