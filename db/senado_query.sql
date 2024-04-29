SELECT 'N ' || proyecto.numero               AS numero,
       proyecto.numeroCamara,
       proyecto.titulo,
       proyecto.estado,
       proyecto.estadoAnotacion,
       proyecto.comision                     AS comision,
       proyecto.fechaRadicado                AS fechaRadicado,
       proyecto.legislatura                  AS legislatura,
       proyecto.url,
       proyecto.origen,
       proyecto.tipoLey,
       proyecto.fechaEnvioComision           AS fechaEnvioComision,
       proyecto.fechaDePresentacion          AS fechaPresentacion,
       proyecto.fechaAprobacionPrimerDebate  AS fechaAprobacionPrimerDebate,
       proyecto.fechaAprobacionSegundoDebate AS fechaAprobacionSegundoDebate,
       proyecto.fechaConciliacion            AS fechaConciliacion,
       proyecto.autores                      AS autores,
       proyecto.exposicionMotivos,
       proyecto.primeraPonencia,
       proyecto.segundaPonencia,
       proyecto.textoPlenaria,
       proyecto.conciliacion,
       proyecto.objeciones,
       proyecto.concepto,
       proyecto.textoRehecho,
       proyecto.sentenciaCorte
FROM ProyectosSenadoNew AS proyecto
         LEFT JOIN Legislatura ON Legislatura.title = proyecto.legislatura
         LEFT JOIN Cuatrenio ON Cuatrenio.id = Legislatura.cuatrenioId
WHERE Cuatrenio.title = :cuatrenio_title
ORDER BY CAST(SUBSTR(proyecto.numero, INSTR(proyecto.numero, '/') + 1) AS INT) DESC,
         CAST(SUBSTR(proyecto.numero, 1, INSTR(proyecto.numero, '/') - 1) AS INT) DESC;
