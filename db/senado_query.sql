SELECT 'N ' || proyecto.numero               AS numero,
       proyecto.numero_camara AS numeroCamara,
       proyecto.titulo,
       proyecto.estado,
       proyecto.estado_anotacion AS estadoAnotacion,
       proyecto.comision                     AS comision,
       proyecto.fecha_radicado                AS fechaRadicado,
       proyecto.legislatura                  AS legislatura,
       proyecto.url,
       proyecto.origen,
       proyecto.tipo_ley AS tipoLey,
       proyecto.fecha_envio_comision           AS fechaEnvioComision,
       proyecto.fecha_de_presentacion          AS fechaPresentacion,
       proyecto.fecha_aprobacion_primer_debate AS fechaAprobacionPrimerDebate,
       proyecto.fecha_aprobacion_segundo_debate AS fechaAprobacionSegundoDebate,
       proyecto.fecha_conciliacion            AS fechaConciliacion,
       proyecto.autores                      AS autores,
       proyecto.exposicion_motivos AS exposicionMotivos,
       proyecto.primera_ponencia AS primeraPonencia,
       proyecto.segunda_ponencia AS segundaPonencia,
       proyecto.texto_plenaria AS textoPlenaria,
       proyecto.conciliacion,
       proyecto.objeciones,
       proyecto.concepto,
       proyecto.texto_rehecho AS textoRehecho,
       proyecto.sentencia_corte AS sentenciaCorte
from senado as proyecto
         left join legislatura on legislatura.title = proyecto.legislatura
         left join cuatrenio on cuatrenio.id = legislatura.cuatrenioid
where cuatrenio.title = :cuatrenio_title
order by cast(substr(proyecto.numero, instr(proyecto.numero, '/') + 1) as int) desc,
         cast(substr(proyecto.numero, 1, instr(proyecto.numero, '/') - 1) as int) desc;
