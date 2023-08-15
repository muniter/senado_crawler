WITH autores AS (SELECT AP.proyectoId, JSON_GROUP_ARRAY(autor.nombre) AS autores
                 FROM AutorProyectos AP
                          INNER JOIN Autor autor ON AP.autorId = autor.id
                 GROUP BY AP.proyectoId),
     ponentes AS (SELECT PP.proyectoId, JSON_GROUP_ARRAY(ponente.nombre) AS ponentes
                  FROM PonenteProyecto PP
                           INNER JOIN Ponente ponente ON PP.ponenteId = ponente.id
                  GROUP BY PP.proyectoId)
SELECT 'N ' || proyecto.numero                     AS numero,
       proyecto.numeroCamara,
       proyecto.titulo,
       proyecto.estado,
       proyecto.estadoAnotacion,
       comision.nombre                             AS comision,
       DATE(proyecto.fechaRadicado)                AS fechaRadicado,
       legislatura.title                           AS legislatura,
       proyecto.url,
       detalles.origen,
       detalles.tipoLey,
       DATE(detalles.fechaEnvioComision)           AS fechaEnvioComision,
       DATE(detalles.fechaPresentacion)            AS fechaPresentacion,
       DATE(detalles.fechaAprobacionPrimerDebate)  AS fechaAprobacionPrimerDebate,
       DATE(detalles.fechaAprobacionSegundoDebate) AS fechaAprobacionSegundoDebate,
       DATE(detalles.fechaConciliacion)            AS fechaConciliacion,
       COALESCE(autores.autores, '[]')             AS autores,
       publicaciones.exposicionMotivos,
       publicaciones.primeraPonencia,
       publicaciones.segundaPonencia,
       publicaciones.textoPlenaria,
       publicaciones.conciliacion,
       publicaciones.objeciones,
       publicaciones.concepto,
       publicaciones.textoRehecho,
       publicaciones.sentenciaCorte


FROM ProyectoSenado AS proyecto
         LEFT JOIN Comision comision ON proyecto.comisionId = comision.id
         LEFT JOIN Legislatura legislatura ON proyecto.legislaturaId = legislatura.id
         LEFT JOIN ProyectoSenadoDetalles detalles ON proyecto.id = detalles.proyectoId
         LEFT JOIN ProyectoSenadoPublicaciones publicaciones ON proyecto.id = publicaciones.proyectoId
         LEFT JOIN autores ON proyecto.id = autores.proyectoId
         LEFT JOIN ponentes ON proyecto.id = ponentes.proyectoId
ORDER BY CAST(SUBSTR(proyecto.numero, INSTR(proyecto.numero, '/') + 1) AS INT) DESC,
         CAST(SUBSTR(proyecto.numero, 1, INSTR(proyecto.numero, '/') - 1) AS INT) DESC;
