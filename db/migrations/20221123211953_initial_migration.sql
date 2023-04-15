-- migrate:up

CREATE TABLE "Cuatrenio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inicio" INTEGER NOT NULL,
    "fin" INTEGER NOT NULL,
    "nombre" TEXT GENERATED ALWAYS AS (FORMAT('%s-%s', inicio, fin)) STORED
);

CREATE INDEX "Cuatrenio_title_idx" ON "Cuatrenio"("title");
CREATE INDEX "Cuatrenio_inicio_fin_idx" ON "Cuatrenio"("inicio", "fin");
CREATE UNIQUE INDEX "Cuatrenio_inicio_fin_key" ON "Cuatrenio"("inicio", "fin");
CREATE UNIQUE INDEX "Cuatrenio_title_key" ON "Cuatrenio"("title");

CREATE TABLE "Legislatura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inicio" INTEGER NOT NULL,
    "fin" INTEGER NOT NULL,
    "nombre" TEXT GENERATED ALWAYS AS (FORMAT('%s-%s', inicio, fin)) STORED,
    "cuatrenioId" INTEGER NOT NULL,
    CONSTRAINT "Legislatura_cuatrenioId_fkey" FOREIGN KEY ("cuatrenioId") REFERENCES "Cuatrenio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Legislatura_inicio_fin_idx" ON "Legislatura"("inicio", "fin");
CREATE INDEX "Legislatura_title_idx" ON "Legislatura"("title");
CREATE UNIQUE INDEX "Legislatura_inicio_fin_key" ON "Legislatura"("inicio", "fin");
CREATE UNIQUE INDEX "Legislatura_title_key" ON "Legislatura"("title");

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

CREATE INDEX "ProyectoSenado_numero_idx" ON "ProyectoSenado"("numero");
CREATE INDEX "ProyectoSenado_comisionId_idx" ON "ProyectoSenado"("comisionId");
CREATE INDEX "ProyectoSenado_estado_idx" ON "ProyectoSenado"("estado");
CREATE UNIQUE INDEX "ProyectoSenado_numero_key" ON "ProyectoSenado"("numero");


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
CREATE UNIQUE INDEX "ProyectoSenadoDetalles_proyectoId_key" ON "ProyectoSenadoDetalles"("proyectoId");


CREATE TABLE "ProyectosRelacionados" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "relacionadoNumero" TEXT NOT NULL,
    CONSTRAINT "ProyectosRelacionados_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoSenado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);


CREATE TABLE "Comision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

CREATE INDEX "Comision_nombre_idx" ON "Comision"("nombre");
CREATE UNIQUE INDEX "Comision_nombre_key" ON "Comision"("nombre");

CREATE TABLE "Autor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

CREATE INDEX "Autor_nombre_idx" ON "Autor"("nombre");
CREATE UNIQUE INDEX "Autor_nombre_key" ON "Autor"("nombre");

CREATE TABLE "AutorProyectos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "autorId" INTEGER NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    CONSTRAINT "AutorProyectos_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Autor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AutorProyectos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoSenado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AutorProyectos_autorId_proyectoId_key" ON "AutorProyectos"("autorId", "proyectoId");


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

CREATE UNIQUE INDEX "PonenteDebate_autorId_proyectoId_debate_key" ON "PonenteDebate"("autorId", "proyectoId", "debate");
CREATE UNIQUE INDEX "ProyectosRelacionados_proyectoId_relacionadoNumero_key" ON "ProyectosRelacionados"("proyectoId", "relacionadoNumero");

-- migrate:down
