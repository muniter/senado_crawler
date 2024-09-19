SELECT numero,
       numero_camara AS "numeroCamara",
       titulo,
       estado,
       estado_anotacion AS "estadoAnotacion",
      'PRIMERA' AS "comision",
       fecha_de_presentacion AS "fechaPresentacion",
       legislatura,
       url,
       origen,
       acumulados,
       autores,
       ponentes_primer_debate AS "ponentesPrimerDebate"
FROM senado_pal
         LEFT JOIN legislatura ON legislatura.title = senado_pal.legislatura
         LEFT JOIN cuatrenio ON cuatrenio.id = legislatura.cuatrenio_id
WHERE cuatrenio.title = :cuatrenio_title
ORDER BY legislatura DESC, numero DESC;
