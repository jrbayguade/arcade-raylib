#include "raylib.h"

int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);

    // Les pales
    int palaAmplada = 10;
    int palaAlcada = 80;
    int palaVelocitat = 6;
    int palaEsquerraY = 185;
    int palaDretaY = 185;

    // La pilota
    int pilotaX = 400;
    int pilotaY = 225;
    int pilotaRadi = 8;
    int velX = 5;
    int velY = 3;

    // El marcador
    int puntsEsquerra = 0;
    int puntsDreta = 0;

    while (!WindowShouldClose())
    {
        // Moure les pales amb el teclat
        if (IsKeyDown(KEY_W)) { palaEsquerraY = palaEsquerraY - palaVelocitat; }
        if (IsKeyDown(KEY_S)) { palaEsquerraY = palaEsquerraY + palaVelocitat; }
        if (IsKeyDown(KEY_UP)) { palaDretaY = palaDretaY - palaVelocitat; }
        if (IsKeyDown(KEY_DOWN)) { palaDretaY = palaDretaY + palaVelocitat; }

        // Que les pales no surtin de la pantalla
        if (palaEsquerraY < 0) { palaEsquerraY = 0; }
        if (palaEsquerraY > 450 - palaAlcada) { palaEsquerraY = 450 - palaAlcada; }
        if (palaDretaY < 0) { palaDretaY = 0; }
        if (palaDretaY > 450 - palaAlcada) { palaDretaY = 450 - palaAlcada; }

        // Moure la pilota
        pilotaX = pilotaX + velX;
        pilotaY = pilotaY + velY;

        // Rebotar a dalt i a baix
        if (pilotaY < pilotaRadi)
        {
            pilotaY = pilotaRadi;
            velY = -velY;
        }
        if (pilotaY > 450 - pilotaRadi)
        {
            pilotaY = 450 - pilotaRadi;
            velY = -velY;
        }

        // Rebotar a les pales
        if (velX < 0 && pilotaX - pilotaRadi < 30 && pilotaX > 20 && pilotaY > palaEsquerraY && pilotaY < palaEsquerraY + palaAlcada)
        {
            velX = -velX;
        }
        if (velX > 0 && pilotaX + pilotaRadi > 770 && pilotaX < 780 && pilotaY > palaDretaY && pilotaY < palaDretaY + palaAlcada)
        {
            velX = -velX;
        }

        // Punts: la pilota ha sortit per un costat
        if (pilotaX < 0)
        {
            puntsDreta += 1;
            pilotaX = 400;
            pilotaY = 225;
            velX = 5;
        }
        if (pilotaX > 800)
        {
            puntsEsquerra += 1;
            pilotaX = 400;
            pilotaY = 225;
            velX = -5;
        }

        // Dibuixar
        BeginDrawing();
        ClearBackground(BLACK);
        DrawLine(400, 0, 400, 450, DARKGRAY);
        DrawRectangle(20, palaEsquerraY, palaAmplada, palaAlcada, WHITE);
        DrawRectangle(770, palaDretaY, palaAmplada, palaAlcada, WHITE);
        DrawCircle(pilotaX, pilotaY, pilotaRadi, YELLOW);
        DrawText(TextFormat("%d", puntsEsquerra), 340, 20, 40, WHITE);
        DrawText(TextFormat("%d", puntsDreta), 440, 20, 40, WHITE);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
