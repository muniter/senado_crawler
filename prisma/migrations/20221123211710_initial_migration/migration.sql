-- CreateTable
CREATE TABLE "Cuatrenio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inicio" INTEGER NOT NULL,
    "fin" INTEGER NOT NULL,
    "title" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Legislatura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inicio" INTEGER NOT NULL,
    "fin" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "cuatrenioId" INTEGER NOT NULL,
    CONSTRAINT "Legislatura_cuatrenioId_fkey" FOREIGN KEY ("cuatrenioId") REFERENCES "Cuatrenio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProyectoSenado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "comisionId" INTEGER NOT NULL,
    "estado" TEXT,
    "estadoAnotacion" TEXT,
    "fechaRadicado" DATETIME NOT NULL,
    "legislaturaId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "lastCrawled" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProyectoSenado_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "Comision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProyectoSenado_legislaturaId_fkey" FOREIGN KEY ("legislaturaId") REFERENCES "Legislatura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProyectoSenadoDetalles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "origen" TEXT,
    "tipoLey" TEXT,
    "fechaEnvioComision" TEXT,
    "aprobacionPrimerDebate" DATETIME,
    "aprobacionSegundoDebate" DATETIME,
    "conciliacion" DATETIME,
    CONSTRAINT "ProyectoSenadoDetalles_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoSenado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProyectosRelacionados" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "relacionadoNumero" TEXT NOT NULL,
    CONSTRAINT "ProyectosRelacionados_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoSenado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Autor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AutorProyectos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "autorId" INTEGER NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    CONSTRAINT "AutorProyectos_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Autor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AutorProyectos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoSenado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PonenteDebate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "autorId" INTEGER NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "debate" INTEGER NOT NULL,
    "proyectoSenadoDetallesId" INTEGER,
    CONSTRAINT "PonenteDebate_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Autor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PonenteDebate_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoSenado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PonenteDebate_proyectoSenadoDetallesId_fkey" FOREIGN KEY ("proyectoSenadoDetallesId") REFERENCES "ProyectoSenadoDetalles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Cuatrenio_title_idx" ON "Cuatrenio"("title");

-- CreateIndex
CREATE INDEX "Cuatrenio_inicio_fin_idx" ON "Cuatrenio"("inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "Cuatrenio_inicio_fin_key" ON "Cuatrenio"("inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "Cuatrenio_title_key" ON "Cuatrenio"("title");

-- CreateIndex
CREATE INDEX "Legislatura_inicio_fin_idx" ON "Legislatura"("inicio", "fin");

-- CreateIndex
CREATE INDEX "Legislatura_title_idx" ON "Legislatura"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Legislatura_inicio_fin_key" ON "Legislatura"("inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "Legislatura_title_key" ON "Legislatura"("title");

-- CreateIndex
CREATE INDEX "ProyectoSenado_numero_idx" ON "ProyectoSenado"("numero");

-- CreateIndex
CREATE INDEX "ProyectoSenado_comisionId_idx" ON "ProyectoSenado"("comisionId");

-- CreateIndex
CREATE INDEX "ProyectoSenado_estado_idx" ON "ProyectoSenado"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "ProyectoSenado_numero_key" ON "ProyectoSenado"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ProyectoSenadoDetalles_proyectoId_key" ON "ProyectoSenadoDetalles"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProyectosRelacionados_proyectoId_relacionadoNumero_key" ON "ProyectosRelacionados"("proyectoId", "relacionadoNumero");

-- CreateIndex
CREATE INDEX "Comision_nombre_idx" ON "Comision"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Comision_nombre_key" ON "Comision"("nombre");

-- CreateIndex
CREATE INDEX "Autor_nombre_idx" ON "Autor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Autor_nombre_key" ON "Autor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "AutorProyectos_autorId_proyectoId_key" ON "AutorProyectos"("autorId", "proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "PonenteDebate_autorId_proyectoId_debate_key" ON "PonenteDebate"("autorId", "proyectoId", "debate");
