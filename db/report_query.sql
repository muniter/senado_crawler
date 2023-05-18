WITH autores AS (SELECT AP.proyectoId, JSON_GROUP_ARRAY(autor.nombre) AS autores
                 FROM AutorProyectos AP
                          INNER JOIN Autor autor ON AP.autorId = autor.id
                 GROUP BY AP.proyectoId),
     ponentes AS (SELECT PP.proyectoId, JSON_GROUP_ARRAY(ponente.nombre) AS ponentes
                  FROM PonenteProyecto PP
                           INNER JOIN Ponente ponente ON PP.ponenteId = ponente.id
                  GROUP BY PP.proyectoId)
SELECT 'N' || proyecto.numero,
       proyecto.numeroCamara,
       proyecto.titulo,
       proyecto.estado,
       proyecto.estadoAnotacion,
       comision.nombre AS comision,
       proyecto.fechaRadicado,
       legislatura.title AS legislatura,
       proyecto.url,
       detalles.origen,
       detalles.tipoLey,
       detalles.fechaEnvioComision,
       detalles.fechaPresentacion,
       detalles.fechaAprobacionPrimerDebate,
       detalles.fechaAprobacionSegundoDebate,
       detalles.fechaConciliacion,
       autores.autores,
--        ponentes.ponentes,
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
