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
from senado as proyecto
         left join legislatura on legislatura.title = proyecto.legislatura
         left join cuatrenio on cuatrenio.id = legislatura.cuatrenioid
where cuatrenio.title = :cuatrenio_title
order by cast(substr(proyecto.numero, instr(proyecto.numero, '/') + 1) as int) desc,
         cast(substr(proyecto.numero, 1, instr(proyecto.numero, '/') - 1) as int) desc;
