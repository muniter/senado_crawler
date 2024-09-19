SELECT numero,
       numero_camara as numeroCamara,
       titulo,
       estado,
       estado_anotacion as estadoAnotacion,,
      'PRIMERA' AS comision,
       fecha_de_presentacion as fechaPresentacion,
       legislatura,
       url,
       origen,
       acumulados,
       autores,
       ponentes_primer_debate as ponentesPrimerDebate
FROM senado_pal
         LEFT JOIN legislatura ON legislatura.title = senado_pal.legislatura
         LEFT JOIN cuatrenio ON cuatrenio.id = legislatura.cuatrenio_id
WHERE cuatrenio.title = :cuatrenio_title
ORDER BY legislatura DESC, numero DESC;
