SELECT numero,
       numeroCamara,
       titulo,
       estado,
       estadoAnotacion,
      'PRIMERA' AS comision,
       fechaDePresentacion,
       legislatura,
       url,
       origen,
       acumulados,
       autores,
       ponentesPrimerDebate
FROM senado_pal
         LEFT JOIN legislatura ON legislatura.title = senado_pal.legislatura
         LEFT JOIN cuatrenio ON cuatrenio.id = legislatura.cuatrenioId
WHERE cuatrenio.title = :cuatrenio_title
ORDER BY legislatura DESC, numero DESC;
