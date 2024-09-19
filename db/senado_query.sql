SELECT 'N ' || proyecto.numero                  AS "numero",
       proyecto.numero_camara                   AS "numeroCamara",
       proyecto.titulo,
       proyecto.estado,
       proyecto.estado_anotacion                AS "estadoAnotacion",
       proyecto.comision                        AS "comision",
       proyecto.fecha_radicado                  AS "fechaRadicado",
       proyecto.legislatura                     AS "legislatura",
       proyecto.url,
       proyecto.origen,
       proyecto.tipo_ley                        AS "tipoLey",
       proyecto.fecha_envio_comision            AS "fechaEnvioComision",
       proyecto.fecha_de_presentacion           AS "fechaPresentacion",
       proyecto.fecha_aprobacion_primer_debate  AS "fechaAprobacionPrimerDebate",
       proyecto.fecha_aprobacion_segundo_debate AS "fechaAprobacionSegundoDebate",
       proyecto.fecha_conciliacion              AS "fechaConciliacion",
       proyecto.autores                         AS "autores",
       proyecto.exposicion_motivos              AS "exposicionMotivos",
       proyecto.primera_ponencia                AS "primeraPonencia",
       proyecto.segunda_ponencia                AS "segundaPonencia",
       proyecto.texto_plenaria                  AS "textoPlenaria",
       proyecto.conciliacion,
       proyecto.objeciones,
       proyecto.concepto,
       proyecto.texto_rehecho                   AS "textoRehecho",
       proyecto.sentencia_corte                 AS "sentenciaCorte"
FROM senado AS proyecto
         LEFT JOIN legislatura ON legislatura.title = proyecto.legislatura
         LEFT JOIN cuatrenio ON cuatrenio.id = legislatura.cuatrenio_id
WHERE cuatrenio.title = :cuatrenio_title
ORDER BY CAST(SPLIT_PART(proyecto.numero, '/', 2) AS INTEGER) DESC,
         CAST(SPLIT_PART(proyecto.numero, '/', 1) AS INTEGER) DESC;
